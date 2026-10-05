// Setup Routes Controller for Initial Admin Provisioning (FASE J1-A)
import { Router, Request, Response } from 'express';
import { requireTenant, sendApiError } from '../middlewares/authMiddleware.ts';
import { UserService } from '../services/userService.ts';

export const setupRouter = Router();

// Apply tenant resolution to all setup routes
setupRouter.use(requireTenant);

/**
 * GET /api/setup/status
 * Returns setup status (whether the tenant has an active PANITIA admin)
 */
setupRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const hasAdmin = await UserService.hasActiveAdmin(tenantId);

    res.json({
      success: true,
      data: {
        tenant_id: tenantId,
        nama_prodi: req.tenant!.nama_prodi,
        nama_universitas: req.tenant!.nama_universitas,
        has_active_admin: hasAdmin,
        is_setup_needed: !hasAdmin
      }
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'SETUP_CHECK_FAILED', err.message || 'Gagal memeriksa status setup admin.');
  }
});

/**
 * POST /api/setup/admin
 * Creates the initial PANITIA administrator for the tenant.
 * Rejects if an active PANITIA admin already exists (Setup Locked).
 * Body: { name, email, password, confirmPassword?, username? }
 */
setupRouter.post('/admin', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const { name, nama_lengkap, email, password, confirmPassword, konfirmasi_password, username } = req.body;

    const adminName = name || nama_lengkap;
    const confirmPass = confirmPassword || konfirmasi_password;

    if (!adminName || !email || !password) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Nama lengkap, email, dan kata sandi wajib diisi.');
    }

    if (confirmPass && confirmPass !== password) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Konfirmasi kata sandi tidak cocok.');
    }

    const createdAdmin = await UserService.setupInitialAdmin(tenantId, {
      name: adminName,
      email,
      password,
      username
    });

    res.status(201).json({
      success: true,
      message: 'Akun Panitia pertama berhasil dibuat! Silakan login untuk melanjutkan.',
      data: {
        user: createdAdmin
      }
    });
  } catch (err: any) {
    const isAlreadyLocked = err.message.includes('Setup awal Panitia sudah selesai');
    return sendApiError(
      res,
      isAlreadyLocked ? 403 : 400,
      isAlreadyLocked ? 'SETUP_ALREADY_COMPLETED' : 'SETUP_FAILED',
      err.message || 'Gagal melakukan setup admin awal.'
    );
  }
});
