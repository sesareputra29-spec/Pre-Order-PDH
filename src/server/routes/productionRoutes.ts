// Production & Bulk Progress Routes Controller
import { Router, Request, Response } from 'express';
import { requireTenant, authenticate, requireRole, sendApiError } from '../middlewares/authMiddleware.ts';
import { ProductionService } from '../services/productionService.ts';
import { OrderService } from '../services/orderService.ts';
import { ConfigService } from '../services/configService.ts';

export const productionRouter = Router();

// Apply Tenant Resolution and Authentication to all Production routes
productionRouter.use(requireTenant);
productionRouter.use(authenticate);

// ==========================================
// 1. BULK PROGRESS UPDATE & PICKUP SETTINGS (Place before /:orderId)
// ==========================================

const handleBulkUpdate = async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const { order_ids, status, production_status, progress_percentage, percentage, note, notes, photo } = req.body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field order_ids (array) tidak boleh kosong.');
    }

    const effectiveStatus = production_status || status;
    const effectivePercentage = percentage !== undefined ? percentage : progress_percentage;
    const effectiveNotes = notes !== undefined ? notes : note;

    const result = await ProductionService.bulkUpdateProgress(
      tenantId,
      {
        order_ids,
        production_status: effectiveStatus,
        percentage: effectivePercentage,
        notes: effectiveNotes,
        photo
      },
      req.user!.user_id
    );

    res.json({
      success: result.success,
      message: `Bulk update produksi: ${result.updated.length} pesanan berhasil diperbarui, ${result.failed.length} gagal.`,
      updated: result.updated,
      failed: result.failed
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'BULK_UPDATE_FAILED', err.message || 'Gagal melakukan update progres masal.');
  }
};

/**
 * POST /api/production/bulk-update and /api/production/bulk-progress
 */
productionRouter.post('/bulk-update', requireRole(['PANITIA']), handleBulkUpdate);
productionRouter.post('/bulk-progress', requireRole(['PANITIA']), handleBulkUpdate);

/**
 * GET /api/production/pickup-settings - Get pickup info settings
 */
productionRouter.get('/pickup-settings', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const config = await ConfigService.getConfig(tenantId);
    res.json({
      success: true,
      data: config?.informasi_pengambilan || {
        lokasi: 'Gedung Kemahasiswaan Lantai 1',
        alamat_lengkap: 'Kampus Utama Ruang 102',
        jam_operasional: 'Senin - Jumat 09:00 - 16:00',
        kontak_pj: '081234567890',
        instruksi: 'Tunjukkan bukti pemesanan atau NIM'
      }
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil pengaturan pengambilan.');
  }
});

/**
 * POST /api/production/pickup-settings - Save pickup info settings
 */
productionRouter.post('/pickup-settings', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const updated = await ConfigService.updateConfig(
      tenantId,
      {
        informasi_pengambilan: req.body
      },
      req.user!.user_id
    );
    res.json({
      success: true,
      message: 'Pengaturan informasi pengambilan berhasil disimpan.',
      data: updated.informasi_pengambilan
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'SAVE_PICKUP_SETTINGS_FAILED', err.message || 'Gagal menyimpan pengaturan pengambilan.');
  }
});

// ==========================================
// 2. LIST & DETAIL PRODUCTION
// ==========================================

/**
 * GET /api/production - List production orders
 */
productionRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;
    const { production_status, status_order, periode_id, class_name, search, page, limit } = req.query;

    if (user.role === 'PANITIA') {
      const result = await ProductionService.listProductionOrders(tenantId, {
        production_status: production_status as string,
        status_order: status_order as string,
        periode_id: periode_id as string,
        class_name: class_name as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 50
      });

      return res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination
      });
    }

    // Role is MAHASISWA: only return own orders
    const studentIdentifier = user.nim || user.user_id || user.username;
    const myOrders = await OrderService.listOrdersByStudent(tenantId, studentIdentifier);
    const enriched = await Promise.all(
      myOrders.map(async (order) => {
        const history = await ProductionService.getProductionHistory(tenantId, order.order_id);
        return {
          ...order,
          latest_progress: history.length > 0 ? history[0] : undefined
        };
      })
    );

    return res.json({
      success: true,
      data: enriched
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil data progres produksi.');
  }
});

/**
 * GET /api/production/:orderId - Detail production for an order
 */
productionRouter.get('/:orderId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.orderId;
    const user = req.user!;

    const detail = await ProductionService.getProductionDetail(tenantId, orderId);
    if (!detail) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Data produksi pesanan tidak ditemukan.');
    }

    if (user.role !== 'PANITIA') {
      const isCoordinator = user.nim && detail.coordinator_nim.toLowerCase() === user.nim.toLowerCase();
      const isMember = user.nim && detail.members?.some((m) => m.nim.toLowerCase() === user.nim?.toLowerCase());
      if (!isCoordinator && !isMember) {
        return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak.');
      }
    }

    res.json({
      success: true,
      data: detail
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil detail produksi.');
  }
});

/**
 * GET /api/production/:orderId/history - Get production progress history
 */
productionRouter.get('/:orderId/history', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.orderId;
    const user = req.user!;

    const order = await OrderService.getOrderById(tenantId, orderId);
    if (!order) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pesanan tidak ditemukan.');
    }

    if (user.role !== 'PANITIA') {
      const isCoordinator = user.nim && order.coordinator_nim.toLowerCase() === user.nim.toLowerCase();
      const isMember = user.nim && order.members.some((m) => m.nim.toLowerCase() === user.nim?.toLowerCase());
      if (!isCoordinator && !isMember) {
        return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak.');
      }
    }

    const history = await ProductionService.getProductionHistory(tenantId, orderId);

    res.json({
      success: true,
      data: history
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil histori produksi.');
  }
});

/**
 * POST /api/production/:orderId/progress - Update single order progress (PANITIA only)
 */
productionRouter.post('/:orderId/progress', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.orderId;
    const { percentage, progress_percentage, production_status, status, notes, note, photo } = req.body;

    const effectivePercentage = percentage !== undefined ? percentage : progress_percentage;
    const effectiveStatus = production_status || status;
    const effectiveNotes = notes !== undefined ? notes : note;

    const progressRecord = await ProductionService.updateOrderProgress(
      tenantId,
      orderId,
      {
        percentage: effectivePercentage,
        production_status: effectiveStatus,
        notes: effectiveNotes,
        photo
      },
      req.user!.user_id
    );

    res.status(201).json({
      success: true,
      message: 'Progres produksi berhasil diperbarui.',
      data: progressRecord
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_PROGRESS_FAILED', err.message || 'Gagal memperbarui progres produksi.');
  }
});

/**
 * PUT /api/production/:orderId - Update production or pickup info (PANITIA only)
 */
productionRouter.put('/:orderId', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.orderId;
    const { pickup_status, notes } = req.body;

    if (pickup_status) {
      const updated = await ProductionService.updatePickupStatus(tenantId, orderId, pickup_status, notes, req.user!.user_id);
      return res.json({
        success: true,
        message: 'Status pengambilan pesanan berhasil diperbarui.',
        data: updated
      });
    }

    const updated = await OrderService.updateOrder(tenantId, orderId, req.body, req.user!.user_id);
    return res.json({
      success: true,
      message: 'Informasi produksi berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_PRODUCTION_FAILED', err.message || 'Gagal memperbarui data produksi.');
  }
});

/**
 * POST /api/production/:orderId/photos and /photo - Upload photo for production
 */
const handleUploadProductionPhoto = async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.orderId;
    const { file_name, fileName, mime_type, mimeType, file_size_bytes, base64_data, fileBase64, notes } = req.body;

    const actualFileName = file_name || fileName || `PROD_PHOTO_${orderId}.jpg`;
    const actualMime = mime_type || mimeType || 'image/jpeg';
    const actualBase64 = base64_data || fileBase64;

    if (!actualBase64) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'File foto base64 wajib disertakan.');
    }

    const updated = await ProductionService.updateOrderProgress(
      tenantId,
      orderId,
      {
        notes,
        photo: {
          file_name: actualFileName,
          mime_type: actualMime,
          file_size: file_size_bytes || 1000,
          base64_data: actualBase64
        }
      },
      req.user!.user_id
    );

    res.json({
      success: true,
      message: 'Foto progres produksi berhasil diunggah.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPLOAD_PHOTO_FAILED', err.message || 'Gagal mengunggah foto produksi.');
  }
};

productionRouter.post('/:orderId/photos', requireRole(['PANITIA']), handleUploadProductionPhoto);
productionRouter.post('/:orderId/photo', requireRole(['PANITIA']), handleUploadProductionPhoto);

/**
 * POST /api/production/:orderId/siap-diambil - Mark order ready for pickup
 */
productionRouter.post('/:orderId/siap-diambil', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.orderId;
    const updated = await ProductionService.updatePickupStatus(tenantId, orderId, 'Siap Diambil', 'Status diubah menjadi Siap Diambil', req.user!.user_id);
    res.json({
      success: true,
      message: 'Status pengambilan berhasil diubah menjadi Siap Diambil.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'MARK_SIAP_DIAMBIL_FAILED', err.message || 'Gagal mengubah status pengambilan.');
  }
});

/**
 * POST /api/production/:orderId/confirm-pickup - Confirm order has been picked up
 */
productionRouter.post('/:orderId/confirm-pickup', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.orderId;
    const { notes } = req.body;
    const updated = await ProductionService.updatePickupStatus(tenantId, orderId, 'Sudah Diambil', notes || 'Pesanan telah diambil oleh mahasiswa', req.user!.user_id);
    res.json({
      success: true,
      message: 'Pesanan berhasil dikonfirmasi sebagai SUDAH DIAMBIL.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'CONFIRM_PICKUP_FAILED', err.message || 'Gagal mengonfirmasi pengambilan pesanan.');
  }
});
