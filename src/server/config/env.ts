// Server Environment Configuration
import dotenv from 'dotenv';
dotenv.config();

export interface ServerEnv {
  NODE_ENV: string;
  PORT: number;
  GOOGLE_PROJECT_ID: string;
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  DEFAULT_TENANT_ID: string;
}

function parsePrivateKey(rawKey?: string): string {
  if (!rawKey) return '';
  // Handle escaped newlines in env variables (e.g., from Vercel / Cloud Run)
  let key = rawKey.trim();
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.substring(1, key.length - 1);
  }
  return key.replace(/\\n/g, '\n');
}

export const serverEnv: ServerEnv = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID || process.env.VITE_GOOGLE_PROJECT_ID || '',
  GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL || process.env.VITE_GOOGLE_CLIENT_EMAIL || '',
  GOOGLE_PRIVATE_KEY: parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY || process.env.VITE_GOOGLE_PRIVATE_KEY),
  DEFAULT_TENANT_ID: process.env.DEFAULT_TENANT_ID || 'TENANT-001'
};

import { getTenantById } from './tenants.ts';

export function getSanitizedEnvStatus() {
  return {
    nodeEnv: serverEnv.NODE_ENV,
    port: serverEnv.PORT,
    googleProjectIdSet: Boolean(serverEnv.GOOGLE_PROJECT_ID),
    googleClientEmailSet: Boolean(serverEnv.GOOGLE_CLIENT_EMAIL),
    googlePrivateKeySet: Boolean(serverEnv.GOOGLE_PRIVATE_KEY && serverEnv.GOOGLE_PRIVATE_KEY.length > 20),
    defaultTenantId: serverEnv.DEFAULT_TENANT_ID
  };
}

export function validateStartup(): void {
  const status = getSanitizedEnvStatus();
  const errors: string[] = [];

  if (!status.googleProjectIdSet) errors.push('GOOGLE_PROJECT_ID belum dikonfigurasi di environment.');
  if (!status.googleClientEmailSet) errors.push('GOOGLE_CLIENT_EMAIL belum dikonfigurasi di environment.');
  if (!status.googlePrivateKeySet) errors.push('GOOGLE_PRIVATE_KEY belum dikonfigurasi atau terlalu pendek.');

  const tenant = getTenantById(status.defaultTenantId);
  if (!tenant) {
    errors.push(`DEFAULT_TENANT_ID '${status.defaultTenantId}' tidak terdaftar di database registry.`);
  } else {
    if (!tenant.spreadsheet_id || tenant.spreadsheet_id.startsWith('1SpreadsheetId')) {
      if (serverEnv.NODE_ENV === 'production') {
        errors.push(`Spreadsheet ID untuk tenant '${status.defaultTenantId}' belum dikonfigurasi dengan Google Sheet riil.`);
      }
    }
    if (!tenant.drive_root_id || tenant.drive_root_id.startsWith('1DriveRootFolder')) {
      if (serverEnv.NODE_ENV === 'production') {
        errors.push(`Drive Root ID untuk tenant '${status.defaultTenantId}' belum dikonfigurasi dengan Google Drive Folder riil.`);
      }
    }
  }

  if (errors.length > 0) {
    if (serverEnv.NODE_ENV === 'production' && !process.env.VERCEL) {
      console.error('\n================================================================');
      console.error('❌ FATAL STARTUP ERROR: KONFIGURASI INSTANCE RUSAK ATAU TIDAK LENGKAP');
      console.error('================================================================');
      errors.forEach((err, idx) => console.error(`${idx + 1}. ${err}`));
      console.error('================================================================\n');
      process.exit(1);
    } else {
      console.warn('\n================================================================');
      console.warn('⚠️  STARTUP WARNING: BEBERAPA KONFIGURASI BELUM LENGKAP (STANDBY MODE)');
      console.warn('================================================================');
      errors.forEach((err, idx) => console.warn(`${idx + 1}. ${err}`));
      console.warn('   ℹ️  Aplikasi tetap berjalan dalam mode STANDBY/DEV offline.');
      console.warn('================================================================\n');
    }
  }

  // Print Instance Info Check Log
  if (tenant) {
    const mask = (str: string) => (str.length > 12 ? `${str.substring(0, 6)}...${str.substring(str.length - 6)}` : 'INVALID');
    console.log('\n================================================================');
    console.log('🏛️  PDH CAMPUS ORDER — PRODI INSTANCE CHECK SUCCESS');
    console.log('================================================================');
    console.log(`   - INSTANCE (TENANT) : ${tenant.tenant_id}`);
    console.log(`   - UNIVERSITAS       : ${tenant.nama_universitas}`);
    console.log(`   - FAKULTAS          : ${tenant.nama_fakultas}`);
    console.log(`   - PRODI ACTIVE      : ${tenant.nama_prodi} (${tenant.kode_prodi})`);
    console.log(`   - SPREADSHEET DB    : ${mask(tenant.spreadsheet_id)}`);
    console.log(`   - DRIVE STORAGE     : ${mask(tenant.drive_root_id)}`);
    console.log(`   - PORT / RUNTIME    : ${serverEnv.PORT} / ${serverEnv.NODE_ENV}`);
    console.log('================================================================\n');
  }
}
