// @ts-nocheck
// FASE J1-A: Automated Test Suite for Initial Admin Security
import { UserService } from './services/userService.ts';
import { AuthService } from './services/authService.ts';
import { AuditService } from './services/auditService.ts';
import { CacheManager } from './services/cacheManager.ts';
import { verifyPassword } from './utils/security.ts';

async function runInitialAdminTests() {
  console.log('================================================================');
  console.log('🛡️ RUNNING FASE J1-A INITIAL ADMIN SECURITY TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  const TOTAL_TESTS = 12;
  const TEST_TENANT_FRESH = 'TENANT-002';
  const TEST_TENANT_MASTER = 'TENANT-001';

  try {
    // -------------------------------------------------------------
    // Test 1: Tenant tanpa PANITIA terdeteksi sebagai belum setup
    // -------------------------------------------------------------
    console.log('Test 1: Tenant tanpa PANITIA terdeteksi sebagai belum setup...');
    // Clear user store for fresh tenant to simulate zero admin
    CacheManager.invalidateAll(TEST_TENANT_FRESH);
    
    // Check setup status
    const statusBefore = await AuthService.getSetupStatus(TEST_TENANT_FRESH);
    if (statusBefore.hasActiveAdmin) {
      // Deactivate any pre-existing admin to simulate fresh uninitialized tenant state
      const users = await UserService.listUsers(TEST_TENANT_FRESH);
      for (const u of users) {
        if (u.role === 'PANITIA') {
          await UserService.updateUser(TEST_TENANT_FRESH, u.user_id, { status: 'INACTIVE' }, 'TEST_RUNNER');
        }
      }
    }
    
    const freshStatus = await AuthService.getSetupStatus(TEST_TENANT_FRESH);
    if (freshStatus.hasActiveAdmin !== false || freshStatus.isSetupNeeded !== true) {
      throw new Error(`Tenant tanpa admin gagal terdeteksi! (hasActiveAdmin: ${freshStatus.hasActiveAdmin})`);
    }
    console.log('   ✅ PASS: Tenant terdeteksi membutuhkan initial setup (isSetupNeeded: true).');
    passedTests++;

    // -------------------------------------------------------------
    // Test 2: Initial admin berhasil dibuat
    // -------------------------------------------------------------
    console.log('Test 2: Initial admin berhasil dibuat...');
    const setupResult = await AuthService.setupInitialAdmin(TEST_TENANT_FRESH, {
      name: 'Ketua Panitia Baru',
      email: 'ketua.panitia@prodi-akuntansi.ac.id',
      password: 'SecureAdminPassword2026!',
      username: 'ketua_panitia'
    });

    if (!setupResult || !setupResult.user_id) {
      throw new Error('Gagal membuat akun initial admin.');
    }
    console.log(`   ✅ PASS: Initial admin berhasil dibuat (User ID: ${setupResult.user_id}).`);
    passedTests++;

    // -------------------------------------------------------------
    // Test 3: Password tersimpan dalam bentuk hash
    // -------------------------------------------------------------
    console.log('Test 3: Password tersimpan dalam bentuk hash...');
    const rawUserInDb = await UserService.findById(TEST_TENANT_FRESH, setupResult.user_id);
    if (!rawUserInDb || !rawUserInDb.password_hash || !rawUserInDb.password_hash.includes(':')) {
      throw new Error('Password tidak tersimpan sebagai format hash salt:hash yang aman!');
    }
    const isPassValid = verifyPassword('SecureAdminPassword2026!', rawUserInDb.password_hash);
    if (!isPassValid) {
      throw new Error('Password hash tidak memvalidasi password plaintext asli!');
    }
    console.log('   ✅ PASS: Password tersimpan sebagai cryptographic hash yang valid.');
    passedTests++;

    // -------------------------------------------------------------
    // Test 4: Password plaintext tidak tersimpan
    // -------------------------------------------------------------
    console.log('Test 4: Password plaintext tidak tersimpan di database...');
    if ((rawUserInDb as any).password === 'SecureAdminPassword2026!') {
      throw new Error('CRITICAL SECURITY BUG: Plaintext password tersimpan di record database!');
    }
    console.log('   ✅ PASS: Plaintext password 100% tidak pernah disimpan di database.');
    passedTests++;

    // -------------------------------------------------------------
    // Test 5: Role = PANITIA
    // -------------------------------------------------------------
    console.log('Test 5: Verifikasi Role = PANITIA...');
    if (setupResult.role !== 'PANITIA' || rawUserInDb.role !== 'PANITIA') {
      throw new Error(`Role akun bukan PANITIA! (Role: ${setupResult.role})`);
    }
    console.log('   ✅ PASS: Role akun terverifikasi sebagai PANITIA.');
    passedTests++;

    // -------------------------------------------------------------
    // Test 6: Status = ACTIVE
    // -------------------------------------------------------------
    console.log('Test 6: Verifikasi Status = ACTIVE...');
    if (setupResult.status !== 'ACTIVE' || rawUserInDb.status !== 'ACTIVE') {
      throw new Error(`Status akun bukan ACTIVE! (Status: ${setupResult.status})`);
    }
    console.log('   ✅ PASS: Status akun initial admin langsung ACTIVE.');
    passedTests++;

    // -------------------------------------------------------------
    // Test 7: Tenant isolation berhasil
    // -------------------------------------------------------------
    console.log('Test 7: Verifikasi Tenant Isolation...');
    const tenantMasterUsers = await UserService.listUsers(TEST_TENANT_MASTER);
    const leakedUser = tenantMasterUsers.find(u => u.user_id === setupResult.user_id || u.email === setupResult.email);
    if (leakedUser) {
      throw new Error('CRITICAL SECURITY BUG: Initial admin tenant B bocor ke tenant A!');
    }
    console.log('   ✅ PASS: Akun initial admin terisolasi 100% pada tenant bersangkutan.');
    passedTests++;

    // -------------------------------------------------------------
    // Test 8: Initial setup kedua ditolak (Setup Lock)
    // -------------------------------------------------------------
    console.log('Test 8: Initial setup kedua ditolak (Setup Lock)...');
    let secondSetupRejected = false;
    try {
      await AuthService.setupInitialAdmin(TEST_TENANT_FRESH, {
        name: 'Hacker Infiltrator',
        email: 'hacker@prodi-akuntansi.ac.id',
        password: 'HackerPassword123!',
        username: 'hacker_admin'
      });
    } catch (err: any) {
      if (err.message.includes('Setup awal Panitia sudah selesai') || err.message.includes('sudah selesai')) {
        secondSetupRejected = true;
      }
    }

    if (!secondSetupRejected) {
      throw new Error('CRITICAL SECURITY BUG: Setup kedua diizinkan (Setup Lock Gagal)!');
    }
    console.log('   ✅ PASS: Setup kedua berhasil ditolak dan terkunci (Setup Lock Terpasang).');
    passedTests++;

    // -------------------------------------------------------------
    // Test 9: PANITIA dapat login menggunakan password yang dibuat
    // -------------------------------------------------------------
    console.log('Test 9: PANITIA dapat login menggunakan password yang dibuat...');
    const loginRes = await AuthService.login(TEST_TENANT_FRESH, 'ketua_panitia', 'SecureAdminPassword2026!');
    if (!loginRes.token || loginRes.user.role !== 'PANITIA') {
      throw new Error('PANITIA gagal login dengan kredensial yang baru dibuat!');
    }
    console.log(`   ✅ PASS: Login PANITIA berhasil (JWT Token diterbitkan untuk ${loginRes.user.name}).`);
    passedTests++;

    // -------------------------------------------------------------
    // Test 10: Audit log tercatat
    // -------------------------------------------------------------
    console.log('Test 10: Audit log tercatat untuk setup awal...');
    const auditLogs = await AuditService.queryLogs(TEST_TENANT_FRESH, { action: 'INITIAL_ADMIN_SETUP' });
    if (!auditLogs.logs || auditLogs.logs.length === 0) {
      throw new Error('Audit log INITIAL_ADMIN_SETUP tidak ditemukan di AuditLogs!');
    }
    const setupLog = auditLogs.logs[0];
    if (!setupLog.details.includes('ketua.panitia@prodi-akuntansi.ac.id')) {
      throw new Error('Detail audit log tidak mencantumkan email admin!');
    }
    console.log(`   ✅ PASS: Audit log INITIAL_ADMIN_SETUP tercatat rapi: "${setupLog.details}".`);
    passedTests++;

    // -------------------------------------------------------------
    // Test 11: Credential sensitif tidak bocor dalam response
    // -------------------------------------------------------------
    console.log('Test 11: Credential sensitif tidak bocor dalam response...');
    if ((setupResult as any).password || (setupResult as any).password_hash) {
      throw new Error('CRITICAL SECURITY BUG: Password atau password_hash bocor dalam response setup!');
    }
    if ((loginRes.user as any).password || (loginRes.user as any).password_hash) {
      throw new Error('CRITICAL SECURITY BUG: Password bocor dalam response user login!');
    }
    console.log('   ✅ PASS: Response 100% tersanitasi dari password dan password hash.');
    passedTests++;

    // -------------------------------------------------------------
    // Test 12: Manipulasi tenant ditolak
    // -------------------------------------------------------------
    console.log('Test 12: Manipulasi tenant / token mismatch ditolak...');
    // Attempt to login to Tenant A using Tenant B credentials
    let crossTenantLoginFailed = false;
    try {
      await AuthService.login(TEST_TENANT_MASTER, 'ketua_panitia', 'SecureAdminPassword2026!');
    } catch {
      crossTenantLoginFailed = true;
    }

    if (!crossTenantLoginFailed) {
      throw new Error('CRITICAL SECURITY BUG: Akun Tenant B berhasil login ke Tenant A!');
    }
    console.log('   ✅ PASS: Upaya akses lintas tenant ditolak secara tegas.');
    passedTests++;

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passedTests}/${TOTAL_TESTS} FASE J1-A INITIAL ADMIN TESTS PASSED`);
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('\n❌ FASE J1-A INITIAL ADMIN TEST FAILED:', err.message || err);
    process.exit(1);
  }
}

runInitialAdminTests();
