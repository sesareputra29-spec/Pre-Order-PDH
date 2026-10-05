// Auth Routes Controller
import { Router, Request, Response } from 'express';
import { requireTenant, authenticate, sendApiError } from '../middlewares/authMiddleware.ts';
import { AuthService } from '../services/authService.ts';
import { UserService } from '../services/userService.ts';
import { verifyAuthToken, sanitizeUser } from '../utils/security.ts';

export const authRouter = Router();

// Apply tenant resolution to all auth routes
authRouter.use(requireTenant);

const loginAttempts = new Map<string, { count: number; blockUntil: number }>();

function rateLimitLogin(req: Request, res: Response, next: any) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const tenantId = req.tenant?.tenant_id || 'unknown';
  const limitKey = `${tenantId}:${ip}`;
  const now = Date.now();

  const record = loginAttempts.get(limitKey);
  if (record && record.blockUntil > now) {
    const minutesLeft = Math.ceil((record.blockUntil - now) / 60000);
    return sendApiError(
      res,
      429,
      'TOO_MANY_REQUESTS',
      `Terlalu banyak percobaan login salah. Silakan coba lagi dalam ${minutesLeft} menit.`
    );
  }
  next();
}

/**
 * POST /api/auth/login
 * Body: { identifier / username / nim, password }
 */
authRouter.post('/login', rateLimitLogin, async (req: Request, res: Response) => {
  const tenantId = req.tenant!.tenant_id;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const limitKey = `${tenantId}:${ip}`;

  try {
    const { identifier, username, nim, password } = req.body;
    const loginId = identifier || username || nim;

    if (!loginId || !password) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Username/NIM dan kata sandi wajib diisi.');
    }

    const result = await AuthService.login(tenantId, loginId, password);

    // Reset rate limiter on successful login
    loginAttempts.delete(limitKey);

    res.json({
      success: true,
      message: 'Login berhasil.',
      data: result
    });
  } catch (err: any) {
    // Record failure in rate limiter
    const now = Date.now();
    const record = loginAttempts.get(limitKey) || { count: 0, blockUntil: 0 };
    record.count += 1;
    if (record.count >= 5) {
      record.blockUntil = now + 15 * 60 * 1000; // 15 minutes ban
      record.count = 0; // reset counter after blocking
    }
    loginAttempts.set(limitKey, record);

    return sendApiError(res, 401, 'INVALID_CREDENTIALS', err.message || 'Gagal melakukan login.');
  }
});

/**
 * POST /api/auth/register
 * Body: { nim, name / nama_lengkap, className / kelas, email, password }
 */
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const { nim, name, nama_lengkap, className, kelas, email, password } = req.body;

    const result = await AuthService.registerStudent(tenantId, {
      nim,
      name: name || nama_lengkap,
      className: className || kelas,
      email,
      password
    });

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil! Link verifikasi telah dikirimkan ke email Anda.',
      data: result
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'REGISTER_FAILED', err.message || 'Gagal melakukan registrasi.');
  }
});

/**
 * POST /api/auth/verify-account
 * Body: { token }
 */
authRouter.post('/verify-account', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const { token } = req.body;
    if (!token) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Token verifikasi wajib disertakan.');
    }

    const result = await AuthService.verifyAccountToken(tenantId, token);
    res.json({
      success: true,
      message: 'Akun berhasil diverifikasi. Silakan login.',
      data: result
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'VERIFY_FAILED', err.message || 'Gagal memverifikasi token.');
  }
});

/**
 * POST /api/auth/forgot-password
 * Body: { nim }
 */
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const { nim } = req.body;
    if (!nim) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'NIM wajib diisi.');
    }

    const result = await AuthService.sendPasswordResetLink(tenantId, nim);
    res.json({
      success: true,
      message: 'Jika akun terdaftar, link reset password akan dikirim ke email yang terdaftar.',
      data: result
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'FORGOT_PASSWORD_FAILED', err.message || 'Gagal memproses permintaan reset password.');
  }
});

/**
 * POST /api/auth/reset-password
 * Body: { token, new_password / newPassword }
 */
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const { token, new_password, newPassword } = req.body;
    const pass = new_password || newPassword;

    if (!token || !pass) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Token dan kata sandi baru wajib disertakan.');
    }

    await AuthService.resetPasswordWithToken(tenantId, token, pass);
    res.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui. Silakan login.'
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'RESET_PASSWORD_FAILED', err.message || 'Gagal mereset kata sandi.');
  }
});

/**
 * POST /api/auth/logout
 */
authRouter.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const userId = req.user!.user_id;

    await AuthService.logout(tenantId, userId);

    res.json({
      success: true,
      message: 'Logout berhasil.'
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal melakukan logout.');
  }
});

/**
 * POST /api/auth/verify
 * Body: { token }
 */
authRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Token wajib disertakan.');
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return sendApiError(res, 401, 'INVALID_TOKEN', 'Token tidak valid atau telah kedaluwarsa.');
    }

    const tenantId = req.tenant!.tenant_id;
    if (payload.tenant_id !== tenantId) {
      return sendApiError(res, 403, 'TENANT_MISMATCH', 'Token tidak sesuai dengan tenant yang diminta.');
    }

    const user = await UserService.findById(tenantId, payload.user_id);
    if (!user || user.status !== 'ACTIVE') {
      return sendApiError(res, 401, 'USER_INACTIVE', 'Pengguna tidak ditemukan atau tidak aktif.');
    }

    res.json({
      success: true,
      valid: true,
      data: {
        user: sanitizeUser(user),
        tenant_id: payload.tenant_id,
        exp: payload.exp
      }
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal memverifikasi token.');
  }
});

/**
 * POST /api/auth/change-password
 * Body: { oldPassword, newPassword }
 */
authRouter.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const userId = req.user!.user_id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Password lama dan password baru wajib diisi.');
    }

    await UserService.changePassword(tenantId, userId, oldPassword, newPassword);

    res.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui.'
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'CHANGE_PASSWORD_FAILED', err.message || 'Gagal mengubah kata sandi.');
  }
});

/**
 * GET /api/auth/me
 */
authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const userId = req.user!.user_id;

    const user = await UserService.findById(tenantId, userId);
    if (!user) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pengguna tidak ditemukan.');
    }

    res.json({
      success: true,
      data: {
        ...sanitizeUser(user),
        tenant: {
          tenant_id: req.tenant!.tenant_id,
          nama_universitas: req.tenant!.nama_universitas,
          nama_fakultas: req.tenant!.nama_fakultas,
          nama_prodi: req.tenant!.nama_prodi,
          kode_prodi: req.tenant!.kode_prodi
        }
      }
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil data profil.');
  }
});
