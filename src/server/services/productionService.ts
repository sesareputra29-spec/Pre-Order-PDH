// Production & Bulk Progress Service Layer (Multi-tenant - Google Sheets Persistent)
import { ProductionStatus, ProductionProgressEntry, PickupStatus } from '../../types/index.ts';
import { AuditService } from './auditService.ts';
import { UserService } from './userService.ts';
import { OrderService, OrderRecord } from './orderService.ts';
import { DriveFolderService } from './driveFolderService.ts';
import { NotificationService } from './notificationService.ts';
import { GoogleSheetsService } from './googleSheetsService.ts';
import { GoogleAuthService } from './googleAuthService.ts';
import { getTenantById } from '../config/tenants.ts';

export interface ProductionProgressRecord extends ProductionProgressEntry {
  tenant_id: string;
}

export interface ProductionFilterOptions {
  production_status?: string;
  status_order?: string;
  periode_id?: string;
  class_name?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ProductionService {
  private static historyStore: Map<string, ProductionProgressRecord> = new Map();
  private static initializedTenants: Set<string> = new Set();
  private static lastLoadedAt: Map<string, number> = new Map();
  private static CACHE_TTL_MS = Number(process.env.CACHE_TTL_PRODUCTION_MS) || 10000;

  static invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.initializedTenants.delete(tenantId);
      this.lastLoadedAt.delete(tenantId);
      for (const [key, p] of this.historyStore.entries()) {
        if (p.tenant_id === tenantId) this.historyStore.delete(key);
      }
    } else {
      this.initializedTenants.clear();
      this.lastLoadedAt.clear();
      this.historyStore.clear();
    }
  }

  /**
   * Loads production progress from Google Sheets for the specified tenant.
   */
  private static async loadFromSheets(tenantId: string): Promise<boolean> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return false;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'ProductionProgress');
      const rows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, 'ProductionProgress!A2:J');
      if (!rows || rows.length === 0) {
        return false;
      }
      for (const [key, prog] of this.historyStore.entries()) {
        if (prog.tenant_id === tenantId) {
          this.historyStore.delete(key);
        }
      }
      if (rows && rows.length > 0) {
        for (const row of rows) {
          if (!row[0]) continue;
          const prog: ProductionProgressRecord = {
            progress_id: String(row[0]),
            order_id: String(row[1]),
            tenant_id: String(row[2] || tenantId),
            percentage: Number(row[3] || 0),
            production_status: (row[4] || 'Belum Diproduksi') as ProductionStatus,
            notes: String(row[5] || ''),
            photo_url: row[6] ? String(row[6]) : undefined,
            drive_photo_id: row[7] ? String(row[7]) : undefined,
            updated_at: String(row[8] || new Date().toISOString()),
            updated_by: String(row[9] || 'SYSTEM')
          };
          this.historyStore.set(`${tenantId}:${prog.order_id}:${prog.progress_id}`, prog);
        }
      }
      return true;
    } catch (err: any) {
      console.warn(`[ProductionService] Gagal memuat progres produksi dari Google Sheets untuk tenant ${tenantId}:`, err.message || err);
      return false;
    }
  }

  /**
   * Saves production progress of the specified tenant back to Google Sheets.
   */
  private static async saveToSheets(tenantId: string): Promise<void> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'ProductionProgress');
      const tenantHistory = Array.from(this.historyStore.values()).filter(h => h.tenant_id === tenantId);

      const headers = [
        'progress_id', 'order_id', 'tenant_id', 'percentage', 'production_status', 'notes', 'photo_url', 'drive_photo_id', 'updated_at', 'updated_by'
      ];
      const rows = tenantHistory.map(h => [
        h.progress_id, h.order_id, h.tenant_id, h.percentage, h.production_status, h.notes, h.photo_url || '', h.drive_photo_id || '', h.updated_at, h.updated_by
      ]);
      const values = [headers, ...rows];
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `ProductionProgress!A1:J${values.length}`, values);
    } catch (err: any) {
      console.error(`[ProductionService] Gagal menyimpan progres produksi ke Google Sheets untuk tenant ${tenantId}:`, err.message || err);
    }
  }

  /**
   * Initializes the ProductionService cache for the specified tenant.
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
        console.log(`[ProductionService] Sheet 'ProductionProgress' kosong atau gagal dibaca untuk tenant ${tenantId}. Mengunggah seed baseline ke Google Sheets...`);
        await this.saveToSheets(tenantId);
      }
    }

    this.lastLoadedAt.set(tenantId, Date.now());
    this.initializedTenants.add(tenantId);
  }

  private static seedBaseline(tenantId: string) {
    const now = new Date().toISOString();

    // Baseline History 1: ORD-2026-001 (45%)
    const prog1: ProductionProgressRecord = {
      progress_id: 'PROG-ORD-001-01',
      order_id: 'ORD-2026-001',
      tenant_id: tenantId,
      percentage: 45,
      production_status: 'Sedang Diproduksi',
      notes: 'Pemotongan pola kain dan bordir logo selesai. Menunggu proses penjahitan.',
      photo_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
      drive_photo_id: 'DRV-PROG-ORD-001-01',
      updated_at: now,
      updated_by: 'USR-ADMIN-01'
    };

    // Baseline History 2: ORD-2026-002 (60%)
    const prog2: ProductionProgressRecord = {
      progress_id: 'PROG-ORD-002-01',
      order_id: 'ORD-2026-002',
      tenant_id: tenantId,
      percentage: 60,
      production_status: 'Sedang Diproduksi',
      notes: 'Penjahitan badan kemeja dan pemasangan kerah selesai.',
      photo_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
      drive_photo_id: 'DRV-PROG-ORD-002-01',
      updated_at: now,
      updated_by: 'USR-ADMIN-01'
    };

    if (!this.historyStore.has(`${tenantId}:${prog1.order_id}:${prog1.progress_id}`)) {
      this.historyStore.set(`${tenantId}:${prog1.order_id}:${prog1.progress_id}`, prog1);
    }
    if (!this.historyStore.has(`${tenantId}:${prog2.order_id}:${prog2.progress_id}`)) {
      this.historyStore.set(`${tenantId}:${prog2.order_id}:${prog2.progress_id}`, prog2);
    }
  }

  // ==========================================
  // 1. LIST & QUERY PRODUCTION ORDERS
  // ==========================================

  static async listProductionOrders(
    tenantId: string,
    options: ProductionFilterOptions = {}
  ): Promise<{
    orders: (OrderRecord & { latest_progress?: ProductionProgressRecord })[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    await this.initForTenant(tenantId);

    const orderResult = await OrderService.listOrders(tenantId, {
      periode_id: options.periode_id,
      class_name: options.class_name,
      search: options.search
    });

    let filtered = orderResult.orders;

    if (options.production_status) {
      filtered = filtered.filter(
        (o) => o.production_status.toLowerCase() === options.production_status?.toLowerCase()
      );
    }

    if (options.status_order) {
      filtered = filtered.filter(
        (o) => o.status_order.toLowerCase() === options.status_order?.toLowerCase()
      );
    }

    const total = filtered.length;
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 50);
    const totalPages = Math.ceil(total / limit) || 1;

    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    const enriched = await Promise.all(
      paginated.map(async (order) => {
        const history = await this.getProductionHistory(tenantId, order.order_id);
        return {
          ...order,
          latest_progress: history.length > 0 ? history[0] : undefined
        };
      })
    );

    return {
      orders: enriched,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  static async getProductionDetail(
    tenantId: string,
    orderId: string
  ): Promise<(OrderRecord & { history: ProductionProgressRecord[]; members: any[] }) | null> {
    await this.initForTenant(tenantId);

    const order = await OrderService.getOrderById(tenantId, orderId);
    if (!order) return null;

    const history = await this.getProductionHistory(tenantId, orderId);

    return {
      ...order,
      history,
      members: order.members || []
    };
  }

  static async getProductionHistory(tenantId: string, orderId: string): Promise<ProductionProgressRecord[]> {
    await this.initForTenant(tenantId);

    const list: ProductionProgressRecord[] = [];
    for (const h of this.historyStore.values()) {
      if (h.tenant_id === tenantId && h.order_id === orderId) {
        list.push({ ...h });
      }
    }

    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  // ==========================================
  // 2. UPDATE SINGLE ORDER PROGRESS
  // ==========================================

  static async updateOrderProgress(
    tenantId: string,
    orderId: string,
    payload: {
      percentage?: number;
      production_status?: ProductionStatus;
      notes?: string;
      photo?: {
        file_name: string;
        mime_type: string;
        file_size: number;
        file_url?: string;
        base64_data?: string;
      };
    },
    performedByUserId: string
  ): Promise<ProductionProgressRecord> {
    await this.initForTenant(tenantId);

    if (performedByUserId && performedByUserId !== 'SYSTEM') {
      const user = await UserService.findById(tenantId, performedByUserId);
      if (!user || user.role !== 'PANITIA') {
        throw new Error('Hanya PANITIA yang berhak memperbarui progres produksi.');
      }
    }

    const order = await OrderService.getOrderById(tenantId, orderId);
    if (!order) {
      throw new Error(`Pesanan '${orderId}' tidak ditemukan.`);
    }

    const percentage = Math.min(100, Math.max(0, payload.percentage !== undefined ? payload.percentage : order.production_percentage || 0));

    let prodStatus: ProductionStatus = payload.production_status || (
      percentage === 100 ? 'Selesai' :
      percentage > 0 ? 'Sedang Diproduksi' :
      'Belum Diproduksi'
    );

    const notes = String(payload.notes || '').trim();
    const now = new Date().toISOString();

    let photoUrl = '';
    let drivePhotoId = '';

    // Handle photo upload if present
    if (payload.photo) {
      const folderInfo = await DriveFolderService.getOrCreateProductionProgressFolder(tenantId, orderId);
      const progIdShort = Date.now().toString(36).toUpperCase().substring(2, 6);
      drivePhotoId = `DRV-PROG-${tenantId}-${orderId}-${progIdShort}`;
      photoUrl = payload.photo.file_url || `https://drive.google.com/uc?id=${drivePhotoId}`;
    }

    const progressId = `PROG-${orderId}-${Date.now().toString(36).toUpperCase().substring(2, 7)}`;

    const newRecord: ProductionProgressRecord = {
      progress_id: progressId,
      order_id: orderId,
      tenant_id: tenantId,
      percentage: percentage,
      production_status: prodStatus,
      notes: notes,
      photo_url: photoUrl || undefined,
      drive_photo_id: drivePhotoId || undefined,
      updated_at: now,
      updated_by: performedByUserId
    };

    this.historyStore.set(`${tenantId}:${orderId}:${progressId}`, newRecord);
    await this.saveToSheets(tenantId);

    // Update parent order fields
    order.production_percentage = percentage;
    order.production_status = prodStatus;
    order.updated_at = now;

    if (percentage === 100 || prodStatus === 'Selesai' || prodStatus === 'Siap Diambil') {
      order.status_order = 'SELESAI';
      order.pickup_status = 'Siap Diambil';
    } else if (percentage > 0 || prodStatus === 'Sedang Diproduksi') {
      order.status_order = 'PRODUKSI';
    }

    await OrderService.updateOrder(tenantId, orderId, {
      production_percentage: percentage,
      production_status: prodStatus,
      status_order: order.status_order,
      pickup_status: order.pickup_status
    }, performedByUserId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId,
      'UPDATE_PRODUCTION_PROGRESS',
      `Pesanan ${orderId}`,
      `Update progres produksi pesanan ${orderId}: ${percentage}% (${prodStatus}). Keterangan: ${notes || '-'}`
    );

    const isFinished = percentage === 100 || prodStatus === 'Selesai';
    const notifType = isFinished ? 'production.completed' : 'production.updated';
    const notifTitle = isFinished ? 'Produksi Selesai' : 'Progres Produksi Diperbarui';
    const notifMsg = isFinished
      ? `Produksi untuk pesanan ${orderId} telah selesai 100%. Seragam siap diambil!`
      : `Progres produksi pesanan ${orderId} kini mencapai ${percentage}% (${prodStatus}).`;

    // Notify Student
    await NotificationService.create({
      tenant_id: tenantId,
      user_id: order.coordinator_nim,
      type: notifType,
      title: notifTitle,
      message: notifMsg,
      reference_type: 'PRODUCTION',
      reference_id: orderId,
      idempotency_key: `PROG-${tenantId}-${orderId}-${percentage}-${prodStatus}`
    });

    // Notify Panitia
    await NotificationService.create({
      tenant_id: tenantId,
      user_id: 'ALL_PANITIA',
      type: notifType,
      title: notifTitle,
      message: `${notifTitle}: Pesanan ${orderId} oleh ${order.coordinator_name} berada di posisi ${percentage}% (${prodStatus}).`,
      reference_type: 'PRODUCTION',
      reference_id: orderId,
      idempotency_key: `PROG-PANITIA-${tenantId}-${orderId}-${percentage}-${prodStatus}`
    });

    return { ...newRecord };
  }

  // ==========================================
  // 3. BULK UPDATE PROGRESS
  // ==========================================

  static async bulkUpdateProgress(
    tenantId: string,
    payload: {
      order_ids: string[];
      percentage?: number;
      production_status?: ProductionStatus;
      notes?: string;
      photo?: {
        file_name: string;
        mime_type: string;
        file_size: number;
        file_url?: string;
        base64_data?: string;
      };
    },
    performedByUserId: string
  ): Promise<{
    success: boolean;
    updated: string[];
    failed: { order_id: string; reason: string }[];
  }> {
    await this.initForTenant(tenantId);

    const updated: string[] = [];
    const failed: { order_id: string; reason: string }[] = [];

    if (!Array.isArray(payload.order_ids) || payload.order_ids.length === 0) {
      throw new Error('Daftar order_ids (array) tidak boleh kosong.');
    }

    for (const orderId of payload.order_ids) {
      try {
        const order = await OrderService.getOrderById(tenantId, orderId);
        if (!order) {
          failed.push({ order_id: orderId, reason: 'Pesanan tidak ditemukan pada tenant ini.' });
          continue;
        }

        await this.updateOrderProgress(
          tenantId,
          orderId,
          {
            percentage: payload.percentage,
            production_status: payload.production_status,
            notes: payload.notes,
            photo: payload.photo
          },
          performedByUserId
        );

        updated.push(orderId);
      } catch (err: any) {
        failed.push({ order_id: orderId, reason: err.message || 'Gagal update progres.' });
      }
    }

    await AuditService.logEvent(
      tenantId,
      performedByUserId,
      'BULK_UPDATE_PRODUCTION_PROGRESS',
      'Bulk Production Update',
      `Bulk update progres produksi: ${updated.length} pesanan berhasil diperbarui, ${failed.length} gagal.`
    );

    return {
      success: updated.length > 0,
      updated,
      failed
    };
  }

  // ==========================================
  // 4. PICKUP STATUS MANAGEMENT
  // ==========================================

  static async updatePickupStatus(
    tenantId: string,
    orderId: string,
    pickupStatus: PickupStatus,
    notes?: string,
    performedByUserId?: string
  ): Promise<OrderRecord> {
    await this.initForTenant(tenantId);

    const order = await OrderService.getOrderById(tenantId, orderId);
    if (!order) {
      throw new Error(`Pesanan '${orderId}' tidak ditemukan.`);
    }

    if (pickupStatus === 'Siap Diambil' || pickupStatus === 'Sudah Diambil') {
      const isFinished = order.production_percentage === 100 || order.production_status === 'Selesai' || order.production_status === 'Siap Diambil';
      if (!isFinished && pickupStatus === 'Siap Diambil') {
        throw new Error('Pesanan hanya dapat berstatus "Siap Diambil" jika produksi telah mencapai 100% atau Selesai.');
      }
    }

    order.pickup_status = pickupStatus;
    if (pickupStatus === 'Siap Diambil') {
      order.production_status = 'Siap Diambil';
    }

    const updated = await OrderService.updateOrder(tenantId, orderId, {
      pickup_status: pickupStatus,
      production_status: order.production_status
    }, performedByUserId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      pickupStatus === 'Sudah Diambil' ? 'CONFIRM_PICKUP' : 'UPDATE_PICKUP_STATUS',
      `Pesanan ${orderId}`,
      `Mengubah status pengambilan pesanan ${orderId} menjadi '${pickupStatus}' (Catatan: ${notes || '-'})`
    );

    return updated;
  }
}
