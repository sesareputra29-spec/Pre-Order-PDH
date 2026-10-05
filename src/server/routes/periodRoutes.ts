// Period Routes Controller
import { Router, Request, Response } from 'express';
import { requireTenant, optionalAuth, authenticate, requireRole, sendApiError } from '../middlewares/authMiddleware.ts';
import { PeriodService } from '../services/periodService.ts';

export const periodRouter = Router();

configRouter: periodRouter.use(requireTenant);

/**
 * GET /api/periods - List periods for current tenant
 */
periodRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const periods = await PeriodService.listPeriods(tenantId);
    res.json({
      success: true,
      data: periods
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil daftar periode.');
  }
});

/**
 * GET /api/periods/active
 */
periodRouter.get('/active', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const activePeriod = await PeriodService.getActivePeriod(tenantId);
    res.json({
      success: true,
      data: activePeriod
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil periode aktif.');
  }
});

/**
 * GET /api/periods/:id
 */
periodRouter.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const periodId = req.params.id;

    const period = await PeriodService.getPeriodById(tenantId, periodId);
    if (!period) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Periode Pre-Order tidak ditemukan.');
    }

    res.json({
      success: true,
      data: period
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil detail periode.');
  }
});

/**
 * POST /api/periods - PANITIA only
 */
periodRouter.post('/', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const { nama_periode, tahun, angkatan, tanggal_mulai, tanggal_selesai, status, mode, target_quota, notes } = req.body;

    if (!nama_periode || !tahun || !angkatan || !tanggal_mulai || !tanggal_selesai) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field nama_periode, tahun, angkatan, tanggal_mulai, dan tanggal_selesai wajib diisi.');
    }

    const newPeriod = await PeriodService.createPeriod(
      tenantId,
      { nama_periode, tahun, angkatan, tanggal_mulai, tanggal_selesai, status, mode, target_quota, notes },
      req.user!.user_id
    );

    res.status(201).json({
      success: true,
      message: 'Periode Pre-Order berhasil dibuat.',
      data: newPeriod
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'CREATE_PERIOD_FAILED', err.message || 'Gagal membuat periode.');
  }
});

/**
 * PUT /api/periods/:id - PANITIA only
 */
periodRouter.put('/:id', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const periodId = req.params.id;

    const updated = await PeriodService.updatePeriod(tenantId, periodId, req.body, req.user!.user_id);

    res.json({
      success: true,
      message: 'Periode Pre-Order berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_PERIOD_FAILED', err.message || 'Gagal memperbarui periode.');
  }
});

/**
 * PATCH /api/periods/:id/status - PANITIA only
 */
periodRouter.patch('/:id/status', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const periodId = req.params.id;
    const { status } = req.body;

    const updated = await PeriodService.updatePeriod(tenantId, periodId, { status }, req.user!.user_id);

    res.json({
      success: true,
      message: `Status periode berhasil diubah menjadi ${status}.`,
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_STATUS_FAILED', err.message || 'Gagal mengubah status periode.');
  }
});

/**
 * DELETE /api/periods/:id - PANITIA only
 */
periodRouter.delete('/:id', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const periodId = req.params.id;

    await PeriodService.deletePeriod(tenantId, periodId, req.user!.user_id);

    res.json({
      success: true,
      message: 'Periode Pre-Order berhasil dihapus.'
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'DELETE_PERIOD_FAILED', err.message || 'Gagal menghapus periode.');
  }
});
