// Master API Router (Fase 1 & Fase 2)
import { Router } from 'express';
import { healthRouter } from './healthRoutes.ts';
import { tenantRouter } from './tenantRoutes.ts';
import { authRouter } from './authRoutes.ts';
import { userRouter } from './userRoutes.ts';
import { studentRouter } from './studentRoutes.ts';
import { configRouter } from './configRoutes.ts';
import { periodRouter } from './periodRoutes.ts';
import { pdhRouter } from './pdhRoutes.ts';
import { orderRouter } from './orderRoutes.ts';
import { paymentRouter } from './paymentRoutes.ts';
import { productionRouter } from './productionRoutes.ts';
import { notificationRouter } from './notificationRoutes.ts';
import { auditRouter } from './auditRoutes.ts';
import { reportRouter } from './reportRoutes.ts';
import { setupRouter } from './setupRoutes.ts';

export const apiRouter = Router();

// 1. Health check & Diagnostics
apiRouter.use('/health', healthRouter);

// 2. Tenants information (Safe Public Profiles)
apiRouter.use('/tenants', tenantRouter);

// 3. Initial Admin Setup (FASE J1-A)
apiRouter.use('/setup', setupRouter);

// 3. FASE 2, 3, 4, 5, 6, 7 & 8 Migrated Live Modules:
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/students', studentRouter);
apiRouter.use('/config', configRouter);
apiRouter.use('/periods', periodRouter);
apiRouter.use('/pdh', pdhRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/production', productionRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/audit', auditRouter);
apiRouter.use('/reports', reportRouter);

// 4. Standby Stubs for Subsequent Phases (Files, etc.)
const createModuleStub = (moduleName: string) => {
  const router = Router();
  router.all('*', (req, res) => {
    res.json({
      success: true,
      phase: 'FASE 11 (VERCEL FINAL)',
      module: moduleName,
      message: `Backend API endpoint '${moduleName}' operational on Vercel final backend.`
    });
  });
  return router;
};

apiRouter.use('/files', createModuleStub('files'));
