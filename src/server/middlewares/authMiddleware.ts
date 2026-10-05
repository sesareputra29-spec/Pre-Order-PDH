// Authentication & Authorization Middlewares
import { Request, Response, NextFunction } from 'express';
import { TenantService, TenantError } from '../services/tenantService.ts';
import { TenantConfig } from '../config/tenants.ts';
import { verifyAuthToken, AuthTokenPayload } from '../utils/security.ts';
import { Role } from '../../types/index.ts';

// Extend Express Request interface to include tenant and authenticated user
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantConfig;
      user?: AuthTokenPayload;
    }
  }
}

/**
 * Standardized Error Response Helper
 */
export function sendApiError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}

/**
 * Middleware to enforce and resolve tenant isolation on every request.
 */
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const tenant = TenantService.resolveTenantFromRequest(req);
    req.tenant = tenant;
    next();
  } catch (err: any) {
    if (err instanceof TenantError) {
      return sendApiError(res, err.statusCode, 'TENANT_ERROR', err.message);
    }
    return sendApiError(res, 400, 'TENANT_ERROR', err.message || 'Tenant tidak valid.');
  }
}

/**
 * Middleware to authenticate requests via Bearer token or x-auth-token header.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-auth-token'] as string | undefined;

  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (customHeader) {
    token = customHeader.trim();
  } else if (typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) {
    return sendApiError(res, 401, 'UNAUTHORIZED', 'Autentikasi diperlukan. Token tidak ditemukan.');
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return sendApiError(res, 401, 'UNAUTHORIZED', 'Sesi login telah kedaluwarsa atau token tidak valid.');
  }

  // Enforce Tenant Alignment: User token must match active tenant if tenant is resolved
  if (req.tenant && req.tenant.tenant_id !== payload.tenant_id) {
    return sendApiError(
      res,
      403,
      'TENANT_MISMATCH',
      `Akses ditolak: Akun Anda terdaftar di tenant '${payload.tenant_id}', tidak dapat mengakses tenant '${req.tenant.tenant_id}'.`
    );
  }

  req.user = payload;
  next();
}

/**
 * Middleware to enforce role-based access control (RBAC).
 */
export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendApiError(res, 401, 'UNAUTHORIZED', 'Autentikasi diperlukan.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendApiError(
        res,
        403,
        'FORBIDDEN',
        `Akses ditolak: Fitur ini hanya dapat diakses oleh role [${allowedRoles.join(', ')}]. Role Anda saat ini: ${req.user.role}.`
      );
    }

    next();
  };
}

/**
 * Optional authentication: Attaches user if valid token exists, proceeds regardless.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-auth-token'] as string | undefined;

  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (customHeader) {
    token = customHeader.trim();
  }

  if (token) {
    const payload = verifyAuthToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}
