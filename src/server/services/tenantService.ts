// Tenant Isolation & Resolution Service
import { Request } from 'express';
import { TenantConfig, getTenantById, PublicTenantInfo, TENANTS_REGISTRY } from '../config/tenants.ts';
import { serverEnv } from '../config/env.ts';

export class TenantError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'TenantError';
    this.statusCode = statusCode;
  }
}

export class TenantService {
  /**
   * Resolves tenant ID from request headers ('x-tenant-id'), query params, or default env fallback.
   * Enforces isolation: verified tenant existence and active status.
   */
  static resolveTenantFromRequest(req: Request): TenantConfig {
    const rawHeader = req.headers['x-tenant-id'] as string | undefined;
    const rawQuery = req.query.tenant_id as string | undefined;
    const rawBody = req.body?.tenant_id as string | undefined;

    const requestedTenantId = (rawHeader || rawQuery || rawBody || serverEnv.DEFAULT_TENANT_ID || 'TENANT-001').trim().toUpperCase();

    const tenant = getTenantById(requestedTenantId);

    if (!tenant) {
      throw new TenantError(`Tenant '${requestedTenantId}' tidak ditemukan di sistem.`, 404);
    }

    if (tenant.status !== 'ACTIVE') {
      throw new TenantError(`Tenant '${requestedTenantId}' sedang dalam status ${tenant.status}.`, 403);
    }

    return tenant;
  }

  /**
   * Returns safe public profile of tenant without exposing sensitive spreadsheet_id or drive_root_id.
   */
  static getPublicTenantProfile(tenant: TenantConfig): PublicTenantInfo {
    return {
      tenant_id: tenant.tenant_id,
      nama_universitas: tenant.nama_universitas,
      nama_fakultas: tenant.nama_fakultas,
      nama_prodi: tenant.nama_prodi,
      kode_prodi: tenant.kode_prodi,
      status: tenant.status
    };
  }

  /**
   * Validates whether a given tenant ID is active and authorized.
   */
  static isValidTenant(tenantId: string): boolean {
    const tenant = getTenantById(tenantId);
    return tenant !== null && tenant.status === 'ACTIVE';
  }
}
