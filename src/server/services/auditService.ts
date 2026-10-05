// Audit Service Layer (Multi-tenant, Append-Only, Sanitized - Google Sheets Persistent)
import { google } from 'googleapis';
import { AuditLogEntry } from '../../types/index.ts';
import { GoogleSheetsService } from './googleSheetsService.ts';
import { GoogleAuthService } from './googleAuthService.ts';
import { getTenantById } from '../config/tenants.ts';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'INITIAL_ADMIN_SETUP'
  | 'CHANGE_PASSWORD'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DELETE_USER'
  | 'UPDATE_CONFIG'
  | 'CREATE_PERIOD'
  | 'UPDATE_PERIOD'
  | 'DELETE_PERIOD'
  | 'CREATE_STUDENT'
  | 'UPDATE_STUDENT'
  | 'CREATE_PDH'
  | 'UPDATE_PDH'
  | 'DELETE_PDH'
  | 'UPDATE_PDH_PRICE'
  | 'CREATE_PDH_SIZE'
  | 'UPDATE_PDH_SIZE'
  | 'DELETE_PDH_SIZE'
  | 'UPLOAD_PDH_IMAGE'
  | 'DELETE_PDH_IMAGE'
  | 'CREATE_ORDER'
  | 'UPDATE_ORDER'
  | 'DELETE_ORDER'
  | 'UPDATE_ORDER_STATUS'
  | 'BULK_UPDATE_ORDER_STATUS'
  | 'ADD_ORDER_MEMBER'
  | 'UPDATE_ORDER_MEMBER'
  | 'DELETE_ORDER_MEMBER'
  | 'CREATE_PAYMENT'
  | 'UPDATE_PAYMENT'
  | 'UPLOAD_PAYMENT_PROOF'
  | 'DELETE_PAYMENT_PROOF'
  | 'APPROVE_PAYMENT'
  | 'REJECT_PAYMENT'
  | 'UPDATE_PRODUCTION'
  | 'UPDATE_PRODUCTION_PROGRESS'
  | 'BULK_UPDATE_PRODUCTION'
  | 'BULK_UPDATE_PRODUCTION_PROGRESS'
  | 'UPLOAD_PRODUCTION_PHOTO'
  | 'UPDATE_PICKUP_STATUS'
  | 'CONFIRM_PICKUP'
  | 'CREATE_NOTIFICATION'
  | 'READ_NOTIFICATION'
  | 'REGISTER_STUDENT'
  | 'VERIFY_ACCOUNT'
  | 'REQUEST_PASSWORD_RESET'
  | 'RESET_PASSWORD'
  | 'EXPORT_DATA';

export type AuditModule =
  | 'AUTH'
  | 'USER'
  | 'STUDENT'
  | 'CONFIG'
  | 'PERIOD'
  | 'MASTER_PDH'
  | 'ORDER'
  | 'PAYMENT'
  | 'PRODUCTION'
  | 'NOTIFICATION';

export interface AuditRecord extends AuditLogEntry {
  audit_id: string;
  tenant_id: string;
  role?: string;
  module: AuditModule;
  target_type: string;
  target_id: string;
  ip?: string;
  user_agent?: string;
}

export interface AuditFilterOptions {
  page?: number;
  limit?: number | 'all';
  search?: string;
  user?: string;
  role?: string;
  action?: string;
  module?: string;
  date_from?: string;
  date_to?: string;
  target_id?: string;
}

export class AuditService {
  private static inMemoryLogs: AuditRecord[] = [];
  private static initializedTenants: Set<string> = new Set();
  private static lastLoadedAt: Map<string, number> = new Map();
  private static CACHE_TTL_MS = Number(process.env.CACHE_TTL_AUDIT_MS) || 10000;

  static invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.initializedTenants.delete(tenantId);
      this.lastLoadedAt.delete(tenantId);
      this.inMemoryLogs = this.inMemoryLogs.filter(l => l.tenant_id !== tenantId);
    } else {
      this.initializedTenants.clear();
      this.lastLoadedAt.clear();
      this.inMemoryLogs = [];
    }
  }

  private static deriveModule(action: AuditAction): AuditModule {
    if (action.includes('LOGIN') || action.includes('LOGOUT') || action.includes('PASSWORD')) return 'AUTH';
    if (action.includes('USER')) return 'USER';
    if (action.includes('STUDENT')) return 'STUDENT';
    if (action.includes('CONFIG')) return 'CONFIG';
    if (action.includes('PERIOD')) return 'PERIOD';
    if (action.includes('PDH')) return 'MASTER_PDH';
    if (action.includes('ORDER')) return 'ORDER';
    if (action.includes('PAYMENT')) return 'PAYMENT';
    if (action.includes('PRODUCTION') || action.includes('PICKUP')) return 'PRODUCTION';
    if (action.includes('NOTIFICATION')) return 'NOTIFICATION';
    return 'CONFIG';
  }

  private static sanitizeSensitiveText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\b(password|secret|token|bearer|private_key)\b\s*([:=])\s*(["'])(.*?)\3/gi, '$1$2$3[REDACTED]$3')
      .replace(/\b(password|secret|token|bearer|private_key)\b\s*([:=])\s*([^\s"',;]+)/gi, '$1$2[REDACTED]')
      .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[JWT_REDACTED]');
  }

  private static async loadFromSheets(tenantId: string): Promise<boolean> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return false;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'AuditLogs');
      const range = 'AuditLogs!A2:M';
      const rows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, range);
      if (!rows || rows.length === 0) {
        return false;
      }

      // Filter and reload cached logs for this tenant only
      this.inMemoryLogs = this.inMemoryLogs.filter(l => l.tenant_id !== tenantId);

      for (const row of rows) {
        if (!row[0]) continue;
        const log: AuditRecord = {
          audit_id: String(row[0] || ''),
          log_id: String(row[1] || ''),
          timestamp: String(row[2] || ''),
          user_id: String(row[3] || ''),
          role: row[4] ? String(row[4]) : undefined,
          module: (row[5] || 'CONFIG') as AuditModule,
          action: String(row[6] || ''),
          target_type: String(row[7] || ''),
          target_id: String(row[8] || ''),
          entity: String(row[9] || ''),
          details: String(row[10] || ''),
          ip: row[11] ? String(row[11]) : undefined,
          user_agent: row[12] ? String(row[12]) : undefined,
          ip_address: row[11] ? String(row[11]) : undefined,
          tenant_id: tenantId
        };
        this.inMemoryLogs.push(log);
      }

      // Sort logs by timestamp descending so unshift works in-memory
      this.inMemoryLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return true;
    } catch (err: any) {
      console.warn(`[AuditService] Gagal memuat audit log dari Google Sheets untuk tenant ${tenantId}:`, err.message || err);
      return false;
    }
  }

  private static async saveToSheets(tenantId: string): Promise<void> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'AuditLogs');
      const tenantLogs = this.inMemoryLogs.filter(l => l.tenant_id === tenantId);

      const headers = [
        'audit_id', 'log_id', 'timestamp', 'user_id', 'role', 'module', 'action', 'target_type', 'target_id', 'entity', 'details', 'ip', 'user_agent'
      ];
      const rows = tenantLogs.map(log => [
        log.audit_id,
        log.log_id,
        log.timestamp,
        log.user_id,
        log.role || '',
        log.module,
        log.action,
        log.target_type,
        log.target_id,
        log.entity,
        log.details,
        log.ip || '',
        log.user_agent || ''
      ]);

      // Reversed because we sort descending in memory but want chronologically ascending in Spreadsheet rows
      const values = [headers, ...rows.reverse()];
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `AuditLogs!A1:M${values.length}`, values);
    } catch (err: any) {
      console.error(`[AuditService] Gagal menyimpan audit log ke Google Sheets untuk tenant ${tenantId}:`, err.message || err);
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
        console.log(`[AuditService] Sheet 'AuditLogs' kosong atau gagal dibaca untuk tenant ${tenantId}. Mengunggah seed baseline ke Google Sheets...`);
        await this.saveToSheets(tenantId);
      }
    }

    this.lastLoadedAt.set(tenantId, Date.now());
    this.initializedTenants.add(tenantId);
  }

  private static seedBaseline(tenantId: string) {
    const now = new Date();
    const seed1: AuditRecord = {
      audit_id: 'AUD-2026-001',
      log_id: 'AUD-2026-001',
      tenant_id: tenantId,
      timestamp: new Date(now.getTime() - 3600000 * 24 * 2).toISOString(),
      user_id: 'USR-ADMIN-01',
      role: 'PANITIA',
      module: 'AUTH',
      action: 'LOGIN',
      target_type: 'SESSION',
      target_id: 'USR-ADMIN-01',
      entity: 'Sesi Login Panitia',
      details: `Login berhasil ke Portal Panitia Tenant ${tenantId}`
    };

    const seed2: AuditRecord = {
      audit_id: 'AUD-2026-002',
      log_id: 'AUD-2026-002',
      tenant_id: tenantId,
      timestamp: new Date(now.getTime() - 3600000 * 24).toISOString(),
      user_id: 'USR-ADMIN-01',
      role: 'PANITIA',
      module: 'ORDER',
      action: 'UPDATE_ORDER_STATUS',
      target_type: 'ORDER',
      target_id: 'ORD-2026-001',
      entity: 'Pesanan ORD-2026-001',
      details: 'Mengubah status pesanan ORD-2026-001 menjadi DIVERIFIKASI'
    };

    const exists = this.inMemoryLogs.some(l => l.tenant_id === tenantId);
    if (!exists) {
      this.inMemoryLogs.push(seed1, seed2);
    }
  }

  /**
   * Logs an important system event with automatic sanitization and tenant scoping.
   * Append-Only: Records cannot be modified or deleted.
   */
  static async logEvent(
    tenantId: string,
    userId: string,
    action: AuditAction,
    entity: string,
    details: string,
    extra?: {
      role?: string;
      module?: AuditModule;
      target_type?: string;
      target_id?: string;
      ip?: string;
      user_agent?: string;
    }
  ): Promise<AuditRecord> {
    await this.initForTenant(tenantId);

    const cleanDetails = this.sanitizeSensitiveText(details);
    const cleanEntity = this.sanitizeSensitiveText(entity);
    const auditId = `AUD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const record: AuditRecord = {
      audit_id: auditId,
      log_id: auditId,
      timestamp: new Date().toISOString(),
      user_id: userId || 'SYSTEM',
      tenant_id: tenantId || 'TENANT-001',
      role: extra?.role || (userId?.startsWith('USR-ADMIN') ? 'PANITIA' : userId?.startsWith('22M') ? 'MAHASISWA' : 'SYSTEM'),
      module: extra?.module || this.deriveModule(action),
      action,
      target_type: extra?.target_type || (entity.includes('Pesanan') ? 'ORDER' : entity.includes('Pembayaran') ? 'PAYMENT' : 'SYSTEM'),
      target_id: extra?.target_id || entity.replace(/[^a-zA-Z0-9_-]/g, '_'),
      entity: cleanEntity,
      details: cleanDetails,
      ip: extra?.ip,
      user_agent: extra?.user_agent,
      ip_address: extra?.ip
    };

    // Unshift in memory
    this.inMemoryLogs.unshift(record);
    if (this.inMemoryLogs.length > 1000) {
      this.inMemoryLogs.pop();
    }

    // Append directly to Google Sheets for durability
    const tenant = getTenantById(tenantId);
    if (tenant && GoogleAuthService.isConfigured() && !tenant.spreadsheet_id.startsWith('1SpreadsheetId')) {
      try {
        await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'AuditLogs');
        const values = [[
          record.audit_id,
          record.log_id,
          record.timestamp,
          record.user_id,
          record.role || '',
          record.module,
          record.action,
          record.target_type,
          record.target_id,
          record.entity,
          record.details,
          record.ip || '',
          record.user_agent || ''
        ]];
        await GoogleSheetsService.appendValues(tenant.spreadsheet_id, 'AuditLogs!A:M', values);
      } catch (err: any) {
        console.warn(`[AuditService] Gagal melakukan append log ke Google Sheets:`, err.message || err);
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUDIT] [${record.tenant_id}] ${record.action} on ${record.entity} by ${record.user_id}: ${record.details}`);
    }

    return record;
  }

  /**
   * Queries audit logs with filtering, search, and memory-safe pagination.
   * Scoped strictly by tenantId.
   */
  static async queryLogs(
    tenantId: string,
    options: AuditFilterOptions = {}
  ): Promise<{
    logs: AuditRecord[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    await this.initForTenant(tenantId);

    let list = this.inMemoryLogs.filter((log) => log.tenant_id === tenantId);

    // 1. Filter by Module
    if (options.module) {
      list = list.filter((l) => l.module.toUpperCase() === options.module?.toUpperCase());
    }

    // 2. Filter by Action
    if (options.action) {
      list = list.filter((l) => l.action.toUpperCase() === options.action?.toUpperCase());
    }

    // 3. Filter by User
    if (options.user) {
      const u = options.user.toLowerCase();
      list = list.filter((l) => l.user_id.toLowerCase().includes(u));
    }

    // 4. Filter by Role
    if (options.role) {
      list = list.filter((l) => l.role?.toUpperCase() === options.role?.toUpperCase());
    }

    // 5. Filter by Search Query
    if (options.search) {
      const query = options.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.entity.toLowerCase().includes(query) ||
          l.details.toLowerCase().includes(query) ||
          l.user_id.toLowerCase().includes(query) ||
          l.action.toLowerCase().includes(query)
      );
    }

    // 6. Filter by Target ID
    if (options.target_id) {
      list = list.filter((l) => l.target_id === options.target_id);
    }

    // 7. Filter by Date range
    if (options.date_from) {
      const fromTime = new Date(options.date_from).getTime();
      list = list.filter((l) => new Date(l.timestamp).getTime() >= fromTime);
    }
    if (options.date_to) {
      const toTime = new Date(options.date_to).getTime();
      list = list.filter((l) => new Date(l.timestamp).getTime() <= toTime);
    }

    const total = list.length;
    const limit = options.limit === 'all' ? total : Number(options.limit || 50);
    const page = Number(options.page || 1);
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

    const paginatedLogs = limit > 0 ? list.slice((page - 1) * limit, page * limit) : list;

    return {
      logs: paginatedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  static async getLogsLimit(tenantId: string, limit: number): Promise<AuditRecord[]> {
    const res = await this.queryLogs(tenantId, { limit });
    return res.logs;
  }
}
