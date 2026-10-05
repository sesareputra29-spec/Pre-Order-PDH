// Health Check Route: GET /api/health
import { Router, Request, Response } from 'express';
import { getSanitizedEnvStatus } from '../config/env.ts';
import { getTenantById } from '../config/tenants.ts';
import { GoogleAuthService } from '../services/googleAuthService.ts';
import { GoogleSheetsService } from '../services/googleSheetsService.ts';
import { GoogleDriveService } from '../services/googleDriveService.ts';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const envStatus = getSanitizedEnvStatus();

  // 1. Resolve Tenant-001
  const tenant001 = getTenantById('TENANT-001');
  const tenantStatus = tenant001
    ? {
        found: true,
        tenantId: tenant001.tenant_id,
        universitas: tenant001.nama_universitas,
        fakultas: tenant001.nama_fakultas,
        prodi: tenant001.nama_prodi,
        kodeProdi: tenant001.kode_prodi,
        status: tenant001.status,
        spreadsheetConfigured: Boolean(tenant001.spreadsheet_id),
        driveRootConfigured: Boolean(tenant001.drive_root_id)
      }
    : {
        found: false,
        message: 'Tenant-001 tidak ditemukan di registry konfigurasi.'
      };

  // 2. Google Auth Verification
  let googleAuthResult = {
    configured: GoogleAuthService.isConfigured(),
    message: GoogleAuthService.isConfigured()
      ? 'Google Service Account credentials terdeteksi.'
      : 'Google Service Account credentials belum diatur di environment variables (Menunggu GOOGLE_CLIENT_EMAIL & GOOGLE_PRIVATE_KEY).'
  };

  // 3. Google Sheets Connection Test (Tenant-001)
  let sheetsResult: any = {
    tested: false,
    connected: false,
    message: 'Google Sheets test dilewati karena credentials belum diatur.'
  };

  // 4. Google Drive Connection Test (Tenant-001)
  let driveResult: any = {
    tested: false,
    connected: false,
    message: 'Google Drive test dilewati karena credentials belum diatur.'
  };

  if (GoogleAuthService.isConfigured() && tenant001) {
    try {
      const [sheetsTest, driveTest] = await Promise.all([
        GoogleSheetsService.testConnection(tenant001.spreadsheet_id),
        GoogleDriveService.testConnection(tenant001.drive_root_id)
      ]);
      sheetsResult = {
        tested: true,
        ...sheetsTest
      };
      driveResult = {
        tested: true,
        ...driveTest
      };
    } catch (err: any) {
      sheetsResult = {
        tested: true,
        connected: false,
        message: `Error saat pengujian: ${err.message}`
      };
      driveResult = {
        tested: true,
        connected: false,
        message: `Error saat pengujian: ${err.message}`
      };
    }
  }

  const durationMs = Date.now() - startTime;

  res.json({
    status: 'HEALTHY',
    service: 'PDH Campus Order Backend Foundation (Vercel/Node.js API)',
    phase: 'FASE 1 — BACKEND FOUNDATION',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    latencyMs: durationMs,
    dependencies: {
      backend: {
        status: 'UP',
        environment: envStatus.nodeEnv,
        port: envStatus.port
      },
      environmentVariables: {
        status: envStatus.googlePrivateKeySet && envStatus.googleClientEmailSet ? 'CONFIGURED' : 'PARTIAL_OR_UNSET',
        details: envStatus
      },
      tenantRegistry: {
        status: tenant001 ? 'READY' : 'NOT_FOUND',
        tenant001: tenantStatus
      },
      googleSheetsApi: {
        status: sheetsResult.connected ? 'CONNECTED' : GoogleAuthService.isConfigured() ? 'AUTH_READY_OR_ERROR' : 'UNCONFIGURED_STANDBY',
        ...sheetsResult
      },
      googleDriveApi: {
        status: driveResult.connected ? 'CONNECTED' : GoogleAuthService.isConfigured() ? 'AUTH_READY_OR_ERROR' : 'UNCONFIGURED_STANDBY',
        ...driveResult
      }
    }
  });
});
