// Notification Routes Controller
import { Router, Request, Response } from 'express';
import { requireTenant, authenticate, sendApiError } from '../middlewares/authMiddleware.ts';
import { NotificationService } from '../services/notificationService.ts';

export const notificationRouter = Router();

// Apply Tenant Resolution and Authentication to all Notification routes
notificationRouter.use(requireTenant);
notificationRouter.use(authenticate);

/**
 * GET /api/notifications/unread - Get unread count and latest unread notifications
 */
notificationRouter.get('/unread', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;
    const userId = user.nim || user.user_id || user.username;

    const result = await NotificationService.listNotifications(tenantId, userId, user.role, {
      is_read: false,
      limit: 20
    });

    res.json({
      success: true,
      unread_count: result.unread_count,
      data: result.notifications
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil jumlah notifikasi belum dibaca.');
  }
});

/**
 * GET /api/notifications - List notifications (with pagination & read filter)
 */
notificationRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;
    const userId = user.nim || user.user_id || user.username;
    const { is_read, page, limit } = req.query;

    const filterOptions: any = {
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50
    };

    if (is_read !== undefined) {
      filterOptions.is_read = is_read === 'true';
    }

    const result = await NotificationService.listNotifications(tenantId, userId, user.role, filterOptions);

    res.json({
      success: true,
      unread_count: result.unread_count,
      data: result.notifications,
      pagination: result.pagination
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil daftar notifikasi.');
  }
});

/**
 * POST /api/notifications/read-all - Mark all notifications as read
 */
notificationRouter.post('/read-all', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;
    const userId = user.nim || user.user_id || user.username;

    const result = await NotificationService.markAllAsRead(tenantId, userId, user.role);

    res.json({
      success: true,
      message: `${result.count} notifikasi ditandai sebagai telah dibaca.`,
      updated_count: result.count
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal menandai semua notifikasi.');
  }
});

/**
 * POST /api/notifications/:id/read - Mark single notification as read
 */
notificationRouter.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;
    const userId = user.nim || user.user_id || user.username;
    const notificationId = req.params.id;

    const updated = await NotificationService.markAsRead(tenantId, notificationId, userId, user.role);

    res.json({
      success: true,
      message: 'Notifikasi ditandai sebagai telah dibaca.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'MARK_READ_FAILED', err.message || 'Gagal menandai notifikasi.');
  }
});
