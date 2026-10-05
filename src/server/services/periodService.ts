// Period Service Layer (Multi-tenant PDH PO Periods - Google Sheets Persistent)
import { google } from 'googleapis';
import { POStatus, POMode } from '../../types/index.ts';
import { AuditService } from './auditService.ts';
import { GoogleSheetsService } from './googleSheetsService.ts';
import { GoogleAuthService } from './googleAuthService.ts';
import { getTenantById } from '../config/tenants.ts';

export interface PeriodRecord {
  periode_id: string;
  tenant_id: string;
  nama_periode: string;
  tahun: string;
  angkatan: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: POStatus;
  mode?: POMode;
  target_quota?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export class PeriodService {
  private static periodStore: Map<string, PeriodRecord> = new Map();
  private static initializedTenants: Set<string> = new Set();
  private static lastLoadedAt: Map<string, number> = new Map();
  private static CACHE_TTL_MS = Number(process.env.CACHE_TTL_PERIOD_MS) || 30000;

  static invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.initializedTenants.delete(tenantId);
      this.lastLoadedAt.delete(tenantId);
      for (const [key, p] of this.periodStore.entries()) {
        if (p.tenant_id === tenantId) this.periodStore.delete(key);
      }
    } else {
      this.initializedTenants.clear();
      this.lastLoadedAt.clear();
      this.periodStore.clear();
    }
  }

  private static async loadFromSheets(tenantId: string): Promise<boolean> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return false;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Periods');
      const range = 'Periods!A2:M';
      const rows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, range);
      if (!rows || rows.length === 0) {
        return false;
      }

      // Clear existing cached periods for this tenant before reloading
      for (const [key, period] of this.periodStore.entries()) {
        if (period.tenant_id === tenantId) {
          this.periodStore.delete(key);
        }
      }

      for (const row of rows) {
        if (!row[0]) continue; // Skip empty rows
        const period: PeriodRecord = {
          periode_id: String(row[0] || ''),
          tenant_id: String(row[1] || tenantId),
          nama_periode: String(row[2] || ''),
          tahun: String(row[3] || ''),
          angkatan: String(row[4] || ''),
          tanggal_mulai: String(row[5] || ''),
          tanggal_selesai: String(row[6] || ''),
          status: (row[7] || 'OPEN') as POStatus,
          mode: (row[8] || 'MANUAL') as POMode,
          target_quota: row[9] ? Number(row[9]) : 500,
          notes: row[10] ? String(row[10]) : '',
          created_at: String(row[11] || new Date().toISOString()),
          updated_at: String(row[12] || new Date().toISOString())
        };
        this.periodStore.set(`${tenantId}:${period.periode_id}`, period);
      }
      return true;
    } catch (err: any) {
      console.warn(`[PeriodService] Gagal memuat periode dari Google Sheets untuk tenant ${tenantId}:`, err.message || err);
      return false;
    }
  }

  private static async saveToSheets(tenantId: string): Promise<void> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Periods');
      const tenantPeriods = Array.from(this.periodStore.values()).filter(p => p.tenant_id === tenantId);

      const headers = [
        'periode_id', 'tenant_id', 'nama_periode', 'tahun', 'angkatan', 'tanggal_mulai', 'tanggal_selesai', 'status', 'mode', 'target_quota', 'notes', 'created_at', 'updated_at'
      ];
      const rows = tenantPeriods.map(period => [
        period.periode_id,
        period.tenant_id,
        period.nama_periode,
        period.tahun,
        period.angkatan,
        period.tanggal_mulai,
        period.tanggal_selesai,
        period.status,
        period.mode || 'MANUAL',
        period.target_quota || 500,
        period.notes || '',
        period.created_at,
        period.updated_at
      ]);

      const values = [headers, ...rows];
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `Periods!A1:M${values.length}`, values);
    } catch (err: any) {
      console.error(`[PeriodService] Gagal menyimpan periode ke Google Sheets untuk tenant ${tenantId}:`, err.message || err);
    }
  }

  private static async initForTenant(tenantId: string, forceReload = false): Promise<void> {
    const lastLoaded = this.lastLoadedAt.get(tenantId) || 0;
    const isExpired = Date.now() - lastLoaded > this.CACHE_TTL_MS;

    if (!forceReload && this.initializedTenants.has(tenantId) && !isExpired) {
      return;
    }

    this.seedBaseline(tenantId);

    const loaded = await this.loadFromSheets(tenantId);
    if (!loaded) {
      if (!this.initializedTenants.has(tenantId)) {
        console.log(`[PeriodService] Sheet 'Periods' kosong atau gagal dibaca untuk tenant ${tenantId}. Mengunggah seed baseline ke Google Sheets...`);
        await this.saveToSheets(tenantId);
      }
    }

    this.lastLoadedAt.set(tenantId, Date.now());
    this.initializedTenants.add(tenantId);
  }

  private static seedBaseline(tenantId: string) {
    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const baselinePeriod: PeriodRecord = {
      periode_id: 'PO-2026-GEL1',
      tenant_id: tenantId,
      nama_periode: 'PO PDH Angkatan 2026/2027 Gelombang 1',
      tahun: '2026',
      angkatan: '2026/2027',
      tanggal_mulai: startDate,
      tanggal_selesai: endDate,
      status: 'OPEN',
      mode: 'MANUAL',
      target_quota: 500,
      notes: 'Pre-Order resmi PDH Kampus Gelombang 1',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    if (!this.periodStore.has(`${tenantId}:${baselinePeriod.periode_id}`)) {
      this.periodStore.set(`${tenantId}:${baselinePeriod.periode_id}`, baselinePeriod);
    }
  }

  static async listPeriods(tenantId: string): Promise<PeriodRecord[]> {
    await this.initForTenant(tenantId);
    const list: PeriodRecord[] = [];
    for (const p of this.periodStore.values()) {
      if (p.tenant_id === tenantId) {
        list.push({ ...p });
      }
    }
    return list;
  }

  static async getActivePeriod(tenantId: string): Promise<(PeriodRecord & { isOpen: boolean }) | null> {
    await this.initForTenant(tenantId);
    const list = await this.listPeriods(tenantId);
    const active = list.find(p => p.status === 'OPEN') || list[0] || null;
    if (!active) return null;
    return {
      ...active,
      isOpen: active.status === 'OPEN'
    };
  }

  static async getPeriodById(tenantId: string, periodId: string): Promise<PeriodRecord | null> {
    await this.initForTenant(tenantId);
    const period = this.periodStore.get(`${tenantId}:${periodId}`);
    return period ? { ...period } : null;
  }

  static async createPeriod(
    tenantId: string,
    data: {
      nama_periode: string;
      tahun: string;
      angkatan: string;
      tanggal_mulai: string;
      tanggal_selesai: string;
      status?: POStatus;
      mode?: POMode;
      target_quota?: number;
      notes?: string;
    },
    performedByUserId?: string
  ): Promise<PeriodRecord> {
    await this.initForTenant(tenantId);

    const periodId = `PO-${data.tahun.replace(/\D/g, '') || new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().substring(2, 6)}`;
    const now = new Date().toISOString();

    const newPeriod: PeriodRecord = {
      periode_id: periodId,
      tenant_id: tenantId,
      nama_periode: data.nama_periode.trim(),
      tahun: data.tahun.trim(),
      angkatan: data.angkatan.trim(),
      tanggal_mulai: data.tanggal_mulai,
      tanggal_selesai: data.tanggal_selesai,
      status: data.status || 'OPEN',
      mode: data.mode || 'MANUAL',
      target_quota: data.target_quota || 500,
      notes: data.notes?.trim() || '',
      created_at: now,
      updated_at: now
    };

    this.periodStore.set(`${tenantId}:${periodId}`, newPeriod);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'CREATE_PERIOD',
      `Periode ${newPeriod.nama_periode}`,
      `Membuat periode PO baru: ${newPeriod.nama_periode}`
    );

    return { ...newPeriod };
  }

  static async updatePeriod(
    tenantId: string,
    periodId: string,
    data: Partial<{
      nama_periode: string;
      tahun: string;
      angkatan: string;
      tanggal_mulai: string;
      tanggal_selesai: string;
      status: POStatus;
      mode: POMode;
      target_quota: number;
      notes: string;
    }>,
    performedByUserId?: string
  ): Promise<PeriodRecord> {
    await this.initForTenant(tenantId);

    const period = this.periodStore.get(`${tenantId}:${periodId}`);
    if (!period) {
      throw new Error(`Periode dengan ID '${periodId}' tidak ditemukan.`);
    }

    if (data.nama_periode !== undefined) period.nama_periode = data.nama_periode.trim();
    if (data.tahun !== undefined) period.tahun = data.tahun.trim();
    if (data.angkatan !== undefined) period.angkatan = data.angkatan.trim();
    if (data.tanggal_mulai !== undefined) period.tanggal_mulai = data.tanggal_mulai;
    if (data.tanggal_selesai !== undefined) period.tanggal_selesai = data.tanggal_selesai;
    if (data.status !== undefined) period.status = data.status;
    if (data.mode !== undefined) period.mode = data.mode;
    if (data.target_quota !== undefined) period.target_quota = data.target_quota;
    if (data.notes !== undefined) period.notes = data.notes.trim();
    period.updated_at = new Date().toISOString();

    this.periodStore.set(`${tenantId}:${periodId}`, period);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'UPDATE_PERIOD',
      `Periode ${period.nama_periode}`,
      `Memperbarui periode PO: ${period.nama_periode}`
    );

    return { ...period };
  }

  static async deletePeriod(tenantId: string, periodId: string, performedByUserId?: string): Promise<boolean> {
    await this.initForTenant(tenantId);

    const period = this.periodStore.get(`${tenantId}:${periodId}`);
    if (!period) {
      throw new Error(`Periode dengan ID '${periodId}' tidak ditemukan.`);
    }

    this.periodStore.delete(`${tenantId}:${periodId}`);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'DELETE_PERIOD',
      `Periode ${period.nama_periode}`,
      `Menghapus periode PO: ${period.nama_periode}`
    );

    return true;
  }
}
