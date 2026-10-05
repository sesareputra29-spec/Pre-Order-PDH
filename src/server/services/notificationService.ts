// Notification Service Layer (Multi-tenant, Anti-duplicate, Role-aware - Google Sheets Persistent)
import { AuditService } from './auditService.ts';
import { GoogleSheetsService } from './googleSheetsService.ts';
import { GoogleAuthService } from './googleAuthService.ts';
import { getTenantById } from '../config/tenants.ts';

export type NotificationType =
  | 'order.created'
  | 'order.updated'
  | 'order.status_changed'
  | 'payment.created'
  | 'payment.approved'
  | 'payment.rejected'
  | 'production.updated'
  | 'production.completed'
  | 'system.announcement';

export type ReferenceType = 'ORDER' | 'PAYMENT' | 'PRODUCTION' | 'PDH' | 'ANNOUNCEMENT';

export interface NotificationRecord {
  notification_id: string;
  tenant_id: string;
  user_id: string; // Target recipient: specific NIM / User ID / 'ALL_PANITIA'
  type: NotificationType;
  title: string;
  message: string;
  reference_type: ReferenceType;
  reference_id: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  idempotency_key?: string;
}

export interface NotificationFilterOptions {
  is_read?: boolean;
  page?: number;
  limit?: number;
}

export class NotificationService {
  private static notificationsStore: Map<string, NotificationRecord> = new Map();
  private static idempotencyCache: Map<string, { notification_id: string; timestamp: number }> = new Map();
  private static initializedTenants: Set<string> = new Set();
  private static lastLoadedAt: Map<string, number> = new Map();
  private static CACHE_TTL_MS = Number(process.env.CACHE_TTL_NOTIFICATION_MS) || 5000;

  static invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.initializedTenants.delete(tenantId);
      this.lastLoadedAt.delete(tenantId);
      for (const [key, n] of this.notificationsStore.entries()) {
        if (n.tenant_id === tenantId) this.notificationsStore.delete(key);
      }
    } else {
      this.initializedTenants.clear();
      this.lastLoadedAt.clear();
      this.notificationsStore.clear();
      this.idempotencyCache.clear();
    }
  }

  /**
   * Loads notifications from Google Sheets for the specified tenant.
   */
  private static async loadFromSheets(tenantId: string): Promise<boolean> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return false;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Notifications');
      const rows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, 'Notifications!A2:L');
      if (!rows || rows.length === 0) {
        return false;
      }
      for (const [key, notif] of this.notificationsStore.entries()) {
        if (notif.tenant_id === tenantId) {
          this.notificationsStore.delete(key);
        }
      }
      if (rows && rows.length > 0) {
        for (const row of rows) {
          if (!row[0]) continue;
          const notif: NotificationRecord = {
            notification_id: String(row[0]),
            tenant_id: String(row[1] || tenantId),
            user_id: String(row[2] || ''),
            type: (row[3] || 'system.announcement') as NotificationType,
            title: String(row[4] || ''),
            message: String(row[5] || ''),
            reference_type: (row[6] || 'ANNOUNCEMENT') as ReferenceType,
            reference_id: String(row[7] || ''),
            is_read: String(row[8]) === 'true',
            created_at: String(row[9] || new Date().toISOString()),
            read_at: row[10] ? String(row[10]) : undefined,
            idempotency_key: row[11] ? String(row[11]) : undefined
          };
          this.notificationsStore.set(`${tenantId}:${notif.notification_id}`, notif);

          if (notif.idempotency_key) {
            const dedupKey = `${tenantId}:${notif.user_id}:${notif.type}:${notif.reference_id}`;
            this.idempotencyCache.set(dedupKey, {
              notification_id: notif.notification_id,
              timestamp: new Date(notif.created_at).getTime()
            });
          }
        }
      }
      return true;
    } catch (err: any) {
      console.warn(`[NotificationService] Gagal memuat notifikasi dari Google Sheets untuk tenant ${tenantId}:`, err.message || err);
      return false;
    }
  }

  /**
   * Saves notifications of the specified tenant back to Google Sheets.
   */
  private static async saveToSheets(tenantId: string): Promise<void> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Notifications');
      const tenantNotifs = Array.from(this.notificationsStore.values()).filter(n => n.tenant_id === tenantId);

      const headers = [
        'notification_id', 'tenant_id', 'user_id', 'type', 'title', 'message', 'reference_type', 'reference_id', 'is_read', 'created_at', 'read_at', 'idempotency_key'
      ];
      const rows = tenantNotifs.map(n => [
        n.notification_id, n.tenant_id, n.user_id, n.type, n.title, n.message, n.reference_type, n.reference_id, n.is_read ? 'true' : 'false', n.created_at, n.read_at || '', n.idempotency_key || ''
      ]);
      const values = [headers, ...rows];
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `Notifications!A1:L${values.length}`, values);
    } catch (err: any) {
      console.error(`[NotificationService] Gagal menyimpan notifikasi ke Google Sheets untuk tenant ${tenantId}:`, err.message || err);
    }
  }

  /**
   * Initializes the NotificationService cache for the specified tenant.
   */
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
        console.log(`[NotificationService] Sheet 'Notifications' kosong atau gagal dibaca untuk tenant ${tenantId}. Mengunggah seed baseline ke Google Sheets...`);
        await this.saveToSheets(tenantId);
      }
    }

    this.lastLoadedAt.set(tenantId, Date.now());
    this.initializedTenants.add(tenantId);
  }

  private static seedBaseline(tenantId: string) {
    const now = new Date();

    // Baseline Notification 1: Order created for Ahmad
    const notif1: NotificationRecord = {
      notification_id: 'NTF-2026-001',
      tenant_id: tenantId,
      user_id: '22MJSP001',
      type: 'order.created',
      title: 'Pesanan Berhasil Dibuat',
      message: 'Pesanan PDH ORD-2026-001 Anda berhasil diajukan. Silakan lakukan pembayaran.',
      reference_type: 'ORDER',
      reference_id: 'ORD-2026-001',
      is_read: true,
      created_at: new Date(now.getTime() - 3600000 * 24 * 3).toISOString(),
      read_at: new Date(now.getTime() - 3600000 * 24 * 2).toISOString()
    };

    // Baseline Notification 2: Payment approved for Ahmad
    const notif2: NotificationRecord = {
      notification_id: 'NTF-2026-002',
      tenant_id: tenantId,
      user_id: '22MJSP001',
      type: 'payment.approved',
      title: 'Pembayaran Disetujui',
      message: 'Pembayaran PAY-2026-001 untuk pesanan ORD-2026-001 telah diverifikasi (LUNAS).',
      reference_type: 'PAYMENT',
      reference_id: 'PAY-2026-001',
      is_read: false,
      created_at: new Date(now.getTime() - 3600000 * 24).toISOString()
    };

    // Baseline Notification 3: Production updated for Panitia
    const notif3: NotificationRecord = {
      notification_id: 'NTF-2026-003',
      tenant_id: tenantId,
      user_id: 'ALL_PANITIA',
      type: 'production.updated',
      title: 'Progres Produksi Diperbarui',
      message: 'Pesanan ORD-2026-001 mencapai progres 45% (Sedang Diproduksi).',
      reference_type: 'PRODUCTION',
      reference_id: 'ORD-2026-001',
      is_read: false,
      created_at: new Date(now.getTime() - 3600000 * 12).toISOString()
    };

    if (!this.notificationsStore.has(`${tenantId}:${notif1.notification_id}`)) {
      this.notificationsStore.set(`${tenantId}:${notif1.notification_id}`, notif1);
    }
    if (!this.notificationsStore.has(`${tenantId}:${notif2.notification_id}`)) {
      this.notificationsStore.set(`${tenantId}:${notif2.notification_id}`, notif2);
    }
    if (!this.notificationsStore.has(`${tenantId}:${notif3.notification_id}`)) {
      this.notificationsStore.set(`${tenantId}:${notif3.notification_id}`, notif3);
    }
  }

  // ==========================================
  // 1. CREATE NOTIFICATION (WITH IDEMPOTENCY)
  // ==========================================

  static async create(payload: {
    tenant_id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    reference_type: ReferenceType;
    reference_id: string;
    idempotency_key?: string;
  }): Promise<NotificationRecord> {
    await this.initForTenant(payload.tenant_id);

    const dedupKey = payload.idempotency_key || `${payload.tenant_id}:${payload.user_id}:${payload.type}:${payload.reference_id}`;
    const cached = this.idempotencyCache.get(dedupKey);

    // If duplicate event occurs within 10 minutes window, return existing without creating duplicates
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
      const existing = this.notificationsStore.get(`${payload.tenant_id}:${cached.notification_id}`);
      if (existing) return existing;
    }

    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const notifId = `NTF-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${randSuffix}`;
    const now = new Date().toISOString();

    const newNotif: NotificationRecord = {
      notification_id: notifId,
      tenant_id: payload.tenant_id,
      user_id: payload.user_id,
      type: payload.type,
      title: payload.title.trim(),
      message: payload.message.trim(),
      reference_type: payload.reference_type,
      reference_id: payload.reference_id,
      is_read: false,
      created_at: now,
      idempotency_key: payload.idempotency_key
    };

    this.notificationsStore.set(`${payload.tenant_id}:${notifId}`, newNotif);
    this.idempotencyCache.set(dedupKey, {
      notification_id: notifId,
      timestamp: Date.now()
    });

    await this.saveToSheets(payload.tenant_id);

    await AuditService.logEvent(
      payload.tenant_id,
      'SYSTEM',
      'CREATE_NOTIFICATION',
      `Notifikasi ${notifId}`,
      `Membuat notifikasi [${payload.type}] untuk ${payload.user_id}: ${payload.title}`
    );

    return { ...newNotif };
  }

  // ==========================================
  // 2. LIST & QUERY NOTIFICATIONS
  // ==========================================

  static async listNotifications(
    tenantId: string,
    userId: string,
    userRole: string,
    options: NotificationFilterOptions = {}
  ): Promise<{
    notifications: NotificationRecord[];
    unread_count: number;
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    await this.initForTenant(tenantId);

    const normalizedUser = userId.toLowerCase();
    const isPanitia = userRole === 'PANITIA';

    let list: NotificationRecord[] = [];
    let totalUnread = 0;

    for (const notif of this.notificationsStore.values()) {
      if (notif.tenant_id !== tenantId) continue;

      const notifTarget = notif.user_id.toLowerCase();
      let match = false;

      if (isPanitia) {
        // Panitia sees notifications targeted to ALL_PANITIA, their own user ID, or general announcements
        match = notifTarget === 'all_panitia' || notifTarget === normalizedUser || notif.reference_type === 'ANNOUNCEMENT';
      } else {
        // Mahasiswa only sees notifications explicitly addressed to their NIM / ID
        match = notifTarget === normalizedUser;
      }

      if (!match) continue;

      if (!notif.is_read) {
        totalUnread++;
      }

      if (options.is_read !== undefined && notif.is_read !== options.is_read) {
        continue;
      }

      list.push({ ...notif });
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = list.length;
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 50);
    const totalPages = Math.ceil(total / limit) || 1;

    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      notifications: paginated,
      unread_count: totalUnread,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  static async getUnreadCount(tenantId: string, userId: string, userRole: string): Promise<number> {
    const res = await this.listNotifications(tenantId, userId, userRole);
    return res.unread_count;
  }

  // ==========================================
  // 3. MARK AS READ ACTIONS
  // ==========================================

  static async markAsRead(
    tenantId: string,
    notificationId: string,
    userId: string,
    userRole: string
  ): Promise<NotificationRecord> {
    await this.initForTenant(tenantId);

    const notif = this.notificationsStore.get(`${tenantId}:${notificationId}`);
    if (!notif) {
      throw new Error(`Notifikasi '${notificationId}' tidak ditemukan.`);
    }

    const isPanitia = userRole === 'PANITIA';
    const notifTarget = notif.user_id.toLowerCase();
    const normalizedUser = userId.toLowerCase();

    if (!isPanitia && notifTarget !== normalizedUser) {
      throw new Error('Akses ditolak: Notifikasi ini bukan milik Anda.');
    }

    notif.is_read = true;
    notif.read_at = new Date().toISOString();
    this.notificationsStore.set(`${tenantId}:${notificationId}`, notif);

    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      userId,
      'READ_NOTIFICATION',
      `Notifikasi ${notificationId}`,
      `Membaca notifikasi ${notificationId}`
    );

    return { ...notif };
  }

  static async markAllAsRead(
    tenantId: string,
    userId: string,
    userRole: string
  ): Promise<{ count: number }> {
    await this.initForTenant(tenantId);

    const isPanitia = userRole === 'PANITIA';
    const normalizedUser = userId.toLowerCase();
    let updatedCount = 0;
    const now = new Date().toISOString();

    for (const notif of this.notificationsStore.values()) {
      if (notif.tenant_id !== tenantId || notif.is_read) continue;

      const notifTarget = notif.user_id.toLowerCase();
      let match = isPanitia ? (notifTarget === 'all_panitia' || notifTarget === normalizedUser) : (notifTarget === normalizedUser);

      if (match) {
        notif.is_read = true;
        notif.read_at = now;
        this.notificationsStore.set(`${tenantId}:${notif.notification_id}`, notif);
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await this.saveToSheets(tenantId);
    }

    await AuditService.logEvent(
      tenantId,
      userId,
      'READ_NOTIFICATION',
      'All Notifications',
      `Menandai ${updatedCount} notifikasi sebagai telah dibaca`
    );

    return { count: updatedCount };
  }
}
