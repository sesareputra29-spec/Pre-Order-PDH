// Tenant Routes: GET /api/tenants, GET /api/tenants/:id
import { Router, Request, Response } from 'express';
import { getAllActiveTenants, getTenantById } from '../config/tenants.ts';
import { TenantService } from '../services/tenantService.ts';

export const tenantRouter = Router();

// GET /api/tenants - List all active public tenants
tenantRouter.get('/', (req: Request, res: Response) => {
  const tenants = getAllActiveTenants();
  res.json({
    success: true,
    data: tenants
  });
});

// GET /api/tenants/:id - Get specific tenant public profile
tenantRouter.get('/:id', (req: Request, res: Response) => {
  const tenantId = req.params.id;
  const tenant = getTenantById(tenantId);

  if (!tenant) {
    return res.status(404).json({
      success: false,
      message: `Tenant dengan ID '${tenantId}' tidak ditemukan.`
    });
  }

  res.json({
    success: true,
    data: TenantService.getPublicTenantProfile(tenant)
  });
});
