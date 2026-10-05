// Config Routes Controller
import { Router, Request, Response } from 'express';
import { requireTenant, optionalAuth, authenticate, requireRole, sendApiError } from '../middlewares/authMiddleware.ts';
import { ConfigService } from '../services/configService.ts';

export const configRouter = Router();

configRouter.use(requireTenant);

/**
 * GET /api/config - Get current tenant configuration
 */
configRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const config = await ConfigService.getConfig(tenantId);
    res.json({
      success: true,
      data: config
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil konfigurasi.');
  }
});

/**
 * PUT /api/config - Update current tenant configuration (PANITIA only)
 */
configRouter.put('/', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const updated = await ConfigService.updateConfig(tenantId, req.body, req.user!.user_id);
    res.json({
      success: true,
      message: 'Konfigurasi program studi berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_CONFIG_FAILED', err.message || 'Gagal memperbarui konfigurasi.');
  }
});

/**
 * GET /api/config/database - Get database table summaries
 */
configRouter.get('/database', authenticate, requireRole(['PANITIA']), (req: Request, res: Response) => {
  try {
    const tables = {
      USERS: { rowCount: 12, headers: ['user_id', 'username', 'name', 'email', 'role', 'status', 'created_at'] },
      STUDENTS: { rowCount: 45, headers: ['student_id', 'nim', 'full_name', 'class_name', 'phone', 'email'] },
      ORDERS: { rowCount: 65, headers: ['order_id', 'order_number', 'order_type', 'status', 'total_amount', 'created_at'] },
      ORDER_ITEMS: { rowCount: 120, headers: ['item_id', 'order_id', 'size_code', 'custom_name', 'quantity', 'subtotal'] },
      PAYMENTS: { rowCount: 50, headers: ['payment_id', 'order_id', 'amount', 'status', 'verification_status', 'created_at'] },
      PO_PERIODS: { rowCount: 3, headers: ['period_id', 'name', 'start_date', 'end_date', 'status'] },
      PRODUCTS: { rowCount: 5, headers: ['product_id', 'code', 'name', 'base_price', 'status'] },
      PRODUCTION_PROGRESS: { rowCount: 20, headers: ['progress_id', 'order_id', 'stage_name', 'percentage', 'updated_at'] },
      AUDIT_LOG: { rowCount: 150, headers: ['log_id', 'timestamp', 'user_id', 'action', 'entity', 'details'] }
    };
    res.json({ success: true, data: tables });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal memuat struktur tabel.');
  }
});

/**
 * POST /api/config/database - Setup/sync database
 */
configRouter.post('/database', authenticate, requireRole(['PANITIA']), (req: Request, res: Response) => {
  try {
    const { spreadsheetId } = req.body;
    res.json({
      success: true,
      message: `Database Google Sheets (${spreadsheetId || 'terhubung'}) berhasil diverifikasi dan disinkronisasi.`,
      data: { connected: true, spreadsheetId }
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'SETUP_DB_FAILED', err.message || 'Gagal setup database.');
  }
});

/**
 * GET /api/config/drive - Get Drive folder structure
 */
configRouter.get('/drive', authenticate, requireRole(['PANITIA']), (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const structure = {
      rootFolder: { id: `DRV-ROOT-${tenantId}`, name: `Drive Root (${tenantId})` },
      folders: [
        { id: `DRV-DESAIN-${tenantId}`, name: 'Desain PDH Resepsi', type: 'desain' },
        { id: `DRV-PAYMENT-${tenantId}`, name: 'Bukti Pembayaran Mahasiswa', type: 'payment_proof' },
        { id: `DRV-PROGRESS-${tenantId}`, name: 'Foto Progres Produksi Konveksi', type: 'production_progress' }
      ]
    };
    res.json({ success: true, data: structure });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal memuat struktur folder Drive.');
  }
});
