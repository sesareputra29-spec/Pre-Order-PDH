// Audit Routes Controller (Append-Only, PANITIA Portal)
import { Router, Request, Response } from 'express';
import { requireTenant, authenticate, requireRole, sendApiError } from '../middlewares/authMiddleware.ts';
import { AuditService } from '../services/auditService.ts';

export const auditRouter = Router();

// Apply Tenant Resolution, Authentication, and PANITIA Role Check
auditRouter.use(requireTenant);
auditRouter.use(authenticate);
auditRouter.use(requireRole(['PANITIA']));

/**
 * GET /api/audit - Query audit activity logs with filtering and pagination
 */
auditRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const {
      page,
      limit,
      search,
      user,
      role,
      action,
      module,
      date_from,
      date_to,
      target_id
    } = req.query;

    let parsedLimit: number | 'all' = 50;
    if (limit === 'all') {
      parsedLimit = 'all';
    } else if (limit) {
      parsedLimit = parseInt(limit as string, 10);
    }

    const result = await AuditService.queryLogs(tenantId, {
      page: page ? parseInt(page as string, 10) : 1,
      limit: parsedLimit,
      search: search as string,
      user: user as string,
      role: role as string,
      action: action as string,
      module: module as string,
      date_from: date_from as string,
      date_to: date_to as string,
      target_id: target_id as string
    });

    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil riwayat audit aktivitas.');
  }
});

/**
 * POST /api/audit/log-export - Log data export activity
 */
auditRouter.post('/log-export', (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;
    const { category, count } = req.body;
    AuditService.logEvent(
      tenantId,
      user.user_id,
      'EXPORT_DATA',
      'EXPORT',
      `Mengekspor ${count || 0} baris data kategori ${category}`,
      {
        role: 'PANITIA',
        ip: req.ip || '127.0.0.1'
      }
    );
    res.json({ success: true, message: 'Aktivitas ekspor tercatat.' });
  } catch (err: any) {
    return sendApiError(res, 400, 'AUDIT_ERROR', err.message);
  }
});
