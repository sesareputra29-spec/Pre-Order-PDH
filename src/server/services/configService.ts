// Config Service Layer (Dynamic Tenant Configuration - Google Sheets Persistent)
import { google } from 'googleapis';
import { getTenantById } from '../config/tenants.ts';
import { AuditService } from './auditService.ts';
import { GoogleSheetsService } from './googleSheetsService.ts';
import { GoogleAuthService } from './googleAuthService.ts';

export interface TenantProdiConfig {
  tenant_id: string;
  nama_universitas: string;
  nama_fakultas: string;
  nama_prodi: string;
  kode_prodi: string;
  logo: string;
  format_nim: string;
  format_kelas: string;
  nomor_wa: string;
  informasi_pembayaran: {
    bank_name: string;
    account_number: string;
    account_holder: string;
    qris_url?: string;
    instructions: string;
  };
  informasi_pengambilan: {
    lokasi: string;
    alamat_lengkap: string;
    jam_operasional: string;
    kontak_pj: string;
    instruksi: string;
  };
  updated_at: string;
}

export class ConfigService {
  private static configStore: Map<string, TenantProdiConfig> = new Map();
  private static initializedTenants: Set<string> = new Set();
  private static lastLoadedAt: Map<string, number> = new Map();
  private static CACHE_TTL_MS = Number(process.env.CACHE_TTL_CONFIG_MS) || 30000;

  static invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.initializedTenants.delete(tenantId);
      this.lastLoadedAt.delete(tenantId);
      this.configStore.delete(tenantId);
    } else {
      this.initializedTenants.clear();
      this.lastLoadedAt.clear();
      this.configStore.clear();
    }
  }

  private static async loadFromSheets(tenantId: string): Promise<boolean> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return false;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Configs');
      const range = 'Configs!A2:T';
      const rows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, range);
      if (!rows || rows.length === 0) {
        return false;
      }

      const row = rows[0]; // Config is typically a single-row sheet per instance
      if (!row || !row[0]) return false;

      const config: TenantProdiConfig = {
        tenant_id: String(row[0] || tenantId),
        nama_universitas: String(row[1] || ''),
        nama_fakultas: String(row[2] || ''),
        nama_prodi: String(row[3] || ''),
        kode_prodi: String(row[4] || ''),
        logo: String(row[5] || ''),
        format_nim: String(row[6] || ''),
        format_kelas: String(row[7] || ''),
        nomor_wa: String(row[8] || ''),
        informasi_pembayaran: {
          bank_name: String(row[9] || ''),
          account_number: String(row[10] || ''),
          account_holder: String(row[11] || ''),
          qris_url: row[12] ? String(row[12]) : undefined,
          instructions: String(row[13] || '')
        },
        informasi_pengambilan: {
          lokasi: String(row[14] || ''),
          alamat_lengkap: String(row[15] || ''),
          jam_operasional: String(row[16] || ''),
          kontak_pj: String(row[17] || ''),
          instruksi: String(row[18] || '')
        },
        updated_at: String(row[19] || new Date().toISOString())
      };

      this.configStore.set(tenantId, config);
      return true;
    } catch (err: any) {
      console.warn(`[ConfigService] Gagal memuat konfigurasi dari Google Sheets untuk tenant ${tenantId}:`, err.message || err);
      return false;
    }
  }

  private static async saveToSheets(tenantId: string): Promise<void> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Configs');
      const config = this.configStore.get(tenantId);
      if (!config) return;

      const headers = [
        'tenant_id', 'nama_universitas', 'nama_fakultas', 'nama_prodi', 'kode_prodi', 'logo', 'format_nim', 'format_kelas', 'nomor_wa',
        'pay_bank_name', 'pay_account_number', 'pay_account_holder', 'pay_qris_url', 'pay_instructions',
        'pick_lokasi', 'pick_alamat_lengkap', 'pick_jam_operasional', 'pick_kontak_pj', 'pick_instruksi', 'updated_at'
      ];

      const row = [
        config.tenant_id,
        config.nama_universitas,
        config.nama_fakultas,
        config.nama_prodi,
        config.kode_prodi,
        config.logo,
        config.format_nim,
        config.format_kelas,
        config.nomor_wa,
        config.informasi_pembayaran.bank_name,
        config.informasi_pembayaran.account_number,
        config.informasi_pembayaran.account_holder,
        config.informasi_pembayaran.qris_url || '',
        config.informasi_pembayaran.instructions,
        config.informasi_pengambilan.lokasi,
        config.informasi_pengambilan.alamat_lengkap,
        config.informasi_pengambilan.jam_operasional,
        config.informasi_pengambilan.kontak_pj,
        config.informasi_pengambilan.instruksi,
        config.updated_at
      ];

      const values = [headers, row];
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `Configs!A1:T2`, values);
    } catch (err: any) {
      console.error(`[ConfigService] Gagal menyimpan konfigurasi ke Google Sheets untuk tenant ${tenantId}:`, err.message || err);
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
        console.log(`[ConfigService] Sheet 'Configs' kosong atau gagal dibaca untuk tenant ${tenantId}. Mengunggah seed baseline ke Google Sheets...`);
        await this.saveToSheets(tenantId);
      }
    }

    this.lastLoadedAt.set(tenantId, Date.now());
    this.initializedTenants.add(tenantId);
  }

  private static seedBaseline(tenantId: string) {
    const tenant = getTenantById(tenantId);
    const now = new Date().toISOString();

    const baselineConfig: TenantProdiConfig = {
      tenant_id: tenantId,
      nama_universitas: tenant?.nama_universitas || 'Universitas Terbuka / Kampus Nasional',
      nama_fakultas: tenant?.nama_fakultas || 'Fakultas Ekonomi dan Bisnis',
      nama_prodi: tenant?.nama_prodi || 'Manajemen',
      kode_prodi: tenant?.kode_prodi || 'MJSP',
      logo: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&q=80',
      format_nim: `^\\d{2}${tenant?.kode_prodi || 'MJSP'}\\d{3}$`,
      format_kelas: `^\\d{2}${tenant?.kode_prodi || 'MJSP'}\\d{3}$`,
      nomor_wa: '081234567890',
      informasi_pembayaran: {
        bank_name: 'Bank Central Asia (BCA)',
        account_number: '1234567890',
        account_holder: 'Panitia Seragam PDH Kampus',
        instructions: 'Transfer sesuai total nominal ke rekening resmi panitia dan simpan bukti transfer untuk diunggah.'
      },
      informasi_pengambilan: {
        lokasi: 'Gedung Kemahasiswaan Lantai 1 (Sekre Ormawa)',
        alamat_lengkap: 'Jl. Kampus Utama No. 1, Ruang 102 (Samping Perpustakaan)',
        jam_operasional: '09:00 - 16:00 WIB',
        kontak_pj: '0812-3456-7890 (Panitia Logistik PDH)',
        instruksi: 'Wajib membawa Kartu Tanda Mahasiswa (KTM) dan menunjukkan invoice / nomor pesanan lunas.'
      },
      updated_at: now
    };

    if (!this.configStore.has(tenantId)) {
      this.configStore.set(tenantId, baselineConfig);
    }
  }

  static async getConfig(tenantId: string): Promise<TenantProdiConfig> {
    await this.initForTenant(tenantId);
    const config = this.configStore.get(tenantId);
    if (!config) {
      throw new Error(`Gagal meresolusi konfigurasi untuk tenant '${tenantId}'`);
    }
    return { ...config };
  }

  static async updateConfig(
    tenantId: string,
    data: Partial<TenantProdiConfig>,
    performedByUserId?: string
  ): Promise<TenantProdiConfig> {
    await this.initForTenant(tenantId);
    const current = await this.getConfig(tenantId);

    const updated: TenantProdiConfig = {
      ...current,
      ...data,
      tenant_id: tenantId,
      updated_at: new Date().toISOString()
    };

    this.configStore.set(tenantId, updated);
    this.lastLoadedAt.set(tenantId, Date.now());
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'UPDATE_CONFIG',
      `Config ${tenantId}`,
      `Pembaruan konfigurasi prodi oleh user ${performedByUserId || 'SYSTEM'}`
    );

    return { ...updated };
  }
}
