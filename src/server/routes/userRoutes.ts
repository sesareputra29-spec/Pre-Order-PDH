// User & Role Routes Controller
import { Router, Request, Response } from 'express';
import { requireTenant, authenticate, requireRole, sendApiError } from '../middlewares/authMiddleware.ts';
import { UserService } from '../services/userService.ts';

export const userRouter = Router();

userRouter.use(requireTenant);
userRouter.use(authenticate);

/**
 * GET /api/users - PANITIA only
 */
userRouter.get('/', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const users = await UserService.listUsers(tenantId);
    res.json({
      success: true,
      data: users
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil daftar pengguna.');
  }
});

/**
 * POST /api/users - PANITIA only
 */
userRouter.post('/', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const { username, password, name, email, role, nim, className, status } = req.body;

    if (!username || !name || !email || !role) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field username, name, email, dan role wajib diisi.');
    }

    const newUser = await UserService.createUser(
      tenantId,
      { username, password, name, email, role, nim, className, status },
      req.user!.user_id
    );

    res.status(201).json({
      success: true,
      message: 'Pengguna berhasil dibuat.',
      data: newUser
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'CREATE_USER_FAILED', err.message || 'Gagal membuat pengguna.');
  }
});

/**
 * GET /api/users/:id - PANITIA or Self
 */
userRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const targetUserId = req.params.id;

    // Authorization check: only PANITIA or the user themselves can view this profile
    if (req.user!.role !== 'PANITIA' && req.user!.user_id !== targetUserId) {
      return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak: Anda hanya dapat melihat profil Anda sendiri.');
    }

    const user = await UserService.findById(tenantId, targetUserId);
    if (!user) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pengguna tidak ditemukan.');
    }

    res.json({
      success: true,
      data: user
        ? {
            user_id: user.user_id,
            tenant_id: user.tenant_id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            nim: user.nim,
            className: user.className,
            status: user.status,
            created_at: user.created_at,
            updated_at: user.updated_at
          }
        : null
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil detail pengguna.');
  }
});

/**
 * PUT /api/users/:id - PANITIA or Self
 */
userRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const targetUserId = req.params.id;

    // Authorization: only PANITIA can edit any user; non-PANITIA can only edit self without role escalation
    if (req.user!.role !== 'PANITIA' && req.user!.user_id !== targetUserId) {
      return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak: Anda hanya dapat mengubah data akun sendiri.');
    }

    const payload = { ...req.body };

    // Prevent non-panitia from escalating roles or status
    if (req.user!.role !== 'PANITIA') {
      delete payload.role;
      delete payload.status;
    }

    const updated = await UserService.updateUser(tenantId, targetUserId, payload, req.user!.user_id);

    res.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_USER_FAILED', err.message || 'Gagal memperbarui pengguna.');
  }
});

/**
 * DELETE /api/users/:id - PANITIA only
 */
userRouter.delete('/:id', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const targetUserId = req.params.id;

    await UserService.deleteUser(tenantId, targetUserId, req.user!.user_id);

    res.json({
      success: true,
      message: 'Pengguna berhasil dihapus.'
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'DELETE_USER_FAILED', err.message || 'Gagal menghapus pengguna.');
  }
});

/**
 * POST /api/users/:id/reset-password - PANITIA only password reset
 */
userRouter.post('/:id/reset-password', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const targetUserId = req.params.id;
    const { password, newPassword } = req.body;
    const passToSet = password || newPassword;
    if (!passToSet) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Password baru wajib disertakan.');
    }

    await UserService.updateUser(tenantId, targetUserId, { password: passToSet }, req.user!.user_id);

    res.json({
      success: true,
      message: 'Password akun berhasil diperbarui.'
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'RESET_PASSWORD_FAILED', err.message || 'Gagal mereset password.');
  }
});
