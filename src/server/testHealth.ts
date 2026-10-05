// @ts-nocheck
// Unit/Integration Test for FASE 1 Backend Foundation
import { getSanitizedEnvStatus } from './config/env.ts';
import { getTenantById } from './config/tenants.ts';
import { GoogleAuthService } from './services/googleAuthService.ts';
import { GoogleSheetsService } from './services/googleSheetsService.ts';
import { GoogleDriveService } from './services/googleDriveService.ts';

export async function runBackendHealthTest() {
  console.log('================================================================');
  console.log('🧪 RUNNING FASE 1 BACKEND FOUNDATION TESTS');
  console.log('================================================================\n');

  // Test 1: Environment Status
  console.log('1️⃣ Testing Environment Variables Configuration:');
  const envStatus = getSanitizedEnvStatus();
  console.log(`   - Node Environment: ${envStatus.nodeEnv}`);
  console.log(`   - Server Port: ${envStatus.port}`);
  console.log(`   - Google Project ID Set: ${envStatus.googleProjectIdSet ? '✅ YES' : 'ℹ️ NOT_SET'}`);
  console.log(`   - Google Client Email Set: ${envStatus.googleClientEmailSet ? '✅ YES' : 'ℹ️ NOT_SET'}`);
  console.log(`   - Google Private Key Set: ${envStatus.googlePrivateKeySet ? '✅ YES' : 'ℹ️ NOT_SET'}`);
  console.log(`   - Default Tenant ID: ${envStatus.defaultTenantId}`);

  // Test 2: Tenant-001 Configuration Check
  console.log('\n2️⃣ Testing Tenant-001 Resolution:');
  const tenant001 = getTenantById('TENANT-001');
  if (tenant001) {
    console.log(`   ✅ Tenant-001 found in registry!`);
    console.log(`   - Tenant ID: ${tenant001.tenant_id}`);
    console.log(`   - Universitas: ${tenant001.nama_universitas}`);
    console.log(`   - Fakultas: ${tenant001.nama_fakultas}`);
    console.log(`   - Prodi: ${tenant001.nama_prodi} (${tenant001.kode_prodi})`);
    console.log(`   - Status: ${tenant001.status}`);
    console.log(`   - Spreadsheet ID Configured: ${Boolean(tenant001.spreadsheet_id)}`);
    console.log(`   - Drive Root ID Configured: ${Boolean(tenant001.drive_root_id)}`);
  } else {
    console.error(`   ❌ Tenant-001 NOT found in registry!`);
  }

  // Test 3: Google Service Account Credentials Check
  console.log('\n3️⃣ Testing Google Service Account Auth:');
  const isAuthConfigured = GoogleAuthService.isConfigured();
  console.log(`   - Google Auth Configured: ${isAuthConfigured ? '✅ YES' : 'ℹ️ STANDBY (Credentials optional in dev without live SA)'}`);

  // Test 4: Google Sheets Service Layer Test
  console.log('\n4️⃣ Testing Google Sheets Service Layer Abstraction:');
  if (tenant001) {
    const sheetsResult = await GoogleSheetsService.testConnection(tenant001.spreadsheet_id);
    console.log(`   - Connected: ${sheetsResult.connected ? '✅ YES' : 'ℹ️ ' + sheetsResult.message}`);
  }

  // Test 5: Google Drive Service Layer Test
  console.log('\n5️⃣ Testing Google Drive Service Layer Abstraction:');
  if (tenant001) {
    const driveResult = await GoogleDriveService.testConnection(tenant001.drive_root_id);
    console.log(`   - Connected: ${driveResult.connected ? '✅ YES' : 'ℹ️ ' + driveResult.message}`);
  }

  console.log('\n================================================================');
  console.log('🎉 FASE 1 BACKEND FOUNDATION TESTS COMPLETED');
  console.log('================================================================\n');

  return {
    success: Boolean(tenant001),
    envStatus,
    tenant001
  };
}

// If executed directly via tsx
if (process.argv[1]?.includes('testHealth')) {
  runBackendHealthTest().catch(console.error);
}
