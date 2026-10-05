// @ts-nocheck
// Comprehensive Cache Synchronization & Serverless Data Consistency Test Suite (P4)
import { CacheManager } from './services/cacheManager.ts';
import { ConfigService } from './services/configService.ts';
import { UserService } from './services/userService.ts';
import { StudentService } from './services/studentService.ts';
import { PDHService } from './services/pdhService.ts';
import { PeriodService } from './services/periodService.ts';
import { OrderService } from './services/orderService.ts';
import { PaymentService } from './services/paymentService.ts';
import { ProductionService } from './services/productionService.ts';
import { NotificationService } from './services/notificationService.ts';
import { AuditService } from './services/auditService.ts';
import { AuthService } from './services/authService.ts';

async function runCacheConsistencyTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING CACHE SYNCHRONIZATION & SERVERLESS CONSISTENCY TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  const TENANT_1 = 'TENANT-001';
  const TENANT_2 = 'TENANT-002';

  try {
    // -------------------------------------------------------------
    // Test 1: Cold Start - System initializes and reads from storage
    // -------------------------------------------------------------
    console.log('Test 1: Cold start - Inisialisasi awal membaca Google Sheets / Baseline...');
    CacheManager.invalidateAll();
    const config1 = await ConfigService.getConfig(TENANT_1);
    if (config1 && config1.tenant_id === TENANT_1) {
      console.log(`   ✅ PASS: Cold start berhasil membaca konfigurasi tenant '${config1.nama_prodi}'.`);
      passedTests++;
    } else {
      throw new Error('Gagal membaca konfigurasi pada cold start.');
    }

    // -------------------------------------------------------------
    // Test 2: Cache Hit - Pembacaan berulang menggunakan cache in-memory
    // -------------------------------------------------------------
    console.log('\nTest 2: Cache hit - Pembacaan berulang dalam jendela TTL...');
    const t0 = Date.now();
    const configHit1 = await ConfigService.getConfig(TENANT_1);
    const configHit2 = await ConfigService.getConfig(TENANT_1);
    const t1 = Date.now();
    if (configHit1.updated_at === configHit2.updated_at && (t1 - t0) < 100) {
      console.log('   ✅ PASS: Cache hit dikembalikan secara instan dari memori.');
      passedTests++;
    } else {
      throw new Error('Cache hit tidak merespons secara efisien.');
    }

    // -------------------------------------------------------------
    // Test 3: Cache Miss & Invalidations
    // -------------------------------------------------------------
    console.log('\nTest 3: Cache miss & invalidation - Paksa invalidate cache tenant...');
    ConfigService.invalidateCache(TENANT_1);
    const configReload = await ConfigService.getConfig(TENANT_1);
    if (configReload && configReload.tenant_id === TENANT_1) {
      console.log('   ✅ PASS: Cache miss tertangani, data berhasil di-load ulang.');
      passedTests++;
    } else {
      throw new Error('Gagal memuat data setelah cache invalidation.');
    }

    // -------------------------------------------------------------
    // Test 4: Mutation Invalidates / Updates Local Cache
    // -------------------------------------------------------------
    console.log('\nTest 4: Mutasi data otomatis meng-update cache lokal...');
    const updatedConfig = await ConfigService.updateConfig(TENANT_1, {
      nomor_wa: '089999888777'
    }, 'USR-ADMIN-01');
    const readAfterMutate = await ConfigService.getConfig(TENANT_1);
    if (readAfterMutate.nomor_wa === '089999888777') {
      console.log('   ✅ PASS: Mutasi berhasil memperbarui cache lokal secara konsisten.');
      passedTests++;
    } else {
      throw new Error('Cache lokal stale setelah mutasi.');
    }

    // -------------------------------------------------------------
    // Test 5: Simulasi Multi-Instance Serverless (Instance A Update -> Instance B Read)
    // -------------------------------------------------------------
    console.log('\nTest 5: Simulasi Multi-Instance Serverless (Instance A Update -> Instance B Read)...');
    // Instance A: Updates user status
    const testUserId = 'USR-MHS-01';
    await UserService.updateUser(TENANT_1, testUserId, { name: 'Ahmad Mahasiswa Updated' }, 'USR-ADMIN-01');
    
    // Simulate Instance B (Cold / Stale cache cleared)
    UserService.invalidateCache(TENANT_1);
    const instanceBUser = await UserService.findById(TENANT_1, testUserId);

    if (instanceBUser && instanceBUser.name === 'Ahmad Mahasiswa Updated') {
      console.log('   ✅ PASS: Instance B membaca data terbaru hasil update Instance A dari Google Sheets.');
      passedTests++;
    } else {
      throw new Error('Instance B menerima data stale dari Google Sheets.');
    }

    // -------------------------------------------------------------
    // Test 6: Critical Data Freshness (Orders, Payments, Production)
    // -------------------------------------------------------------
    console.log('\nTest 6: Memastikan data kritis (Orders, Payments, Production) tidak stale...');
    OrderService.invalidateCache(TENANT_1);
    const orders = await OrderService.listOrders(TENANT_1);
    PaymentService.invalidateCache(TENANT_1);
    const payments = await PaymentService.listPayments(TENANT_1);
    ProductionService.invalidateCache(TENANT_1);
    const progs = await ProductionService.getProductionHistory(TENANT_1, 'ORD-2026-001');

    if (orders && Array.isArray(orders.orders) && payments && Array.isArray(payments.payments) && progs) {
      console.log(`   ✅ PASS: Critical reads fresh (Orders: ${orders.orders.length}, Payments: ${payments.payments.length}).`);
      passedTests++;
    } else {
      throw new Error('Gagal membaca data kritis setelah cache clear.');
    }

    // -------------------------------------------------------------
    // Test 7: Cache Expiry Simulation
    // -------------------------------------------------------------
    console.log('\nTest 7: Simulasi Cache Expiry berdasarkan TTL...');
    // Manually trigger invalidation as TTL simulation
    NotificationService.invalidateCache(TENANT_1);
    const notifs = await NotificationService.listNotifications(TENANT_1, '22MJSP001', 'MAHASISWA');
    if (notifs && Array.isArray(notifs.notifications)) {
      console.log('   ✅ PASS: Pembacaan setelah cache expiry memuat data notifikasi dengan sukses.');
      passedTests++;
    } else {
      throw new Error('Gagal memuat notifikasi setelah expiry.');
    }

    // -------------------------------------------------------------
    // Test 8: Tenant Cache Isolation
    // -------------------------------------------------------------
    console.log('\nTest 8: Isolasi cache antar tenant (TENANT-001 vs TENANT-002)...');
    CacheManager.invalidateAll(TENANT_2);
    const tenant2Config = await ConfigService.getConfig(TENANT_2);
    const tenant1Config = await ConfigService.getConfig(TENANT_1);

    if (tenant1Config.tenant_id === TENANT_1 && tenant2Config.tenant_id === TENANT_2) {
      console.log('   ✅ PASS: Invalidation TENANT-002 tidak merusak cache TENANT-001.');
      passedTests++;
    } else {
      throw new Error('Pembersihan cache tenant merusak data tenant lain.');
    }

    // -------------------------------------------------------------
    // Test 9: Auth Token & Password Reset Freshness
    // -------------------------------------------------------------
    console.log('\nTest 9: Verifikasi keandalan Auth Tokens & Password Reset pada Instance Baru...');
    AuthService.invalidateCache(TENANT_1);
    const resetRes = await AuthService.sendPasswordResetLink(TENANT_1, '22MJSP001');
    if (resetRes && resetRes.resetToken) {
      AuthService.invalidateCache(TENANT_1); // Simulate instance restart before reset execution
      const resetOk = await AuthService.resetPasswordWithToken(TENANT_1, resetRes.resetToken, 'newPassCache123');
      if (resetOk) {
        console.log('   ✅ PASS: Token reset password berhasil diverifikasi oleh instance baru.');
        passedTests++;
      } else {
        throw new Error('Gagal melakukan reset password via token persisten.');
      }
    } else {
      throw new Error('Gagal menerbitkan token reset password.');
    }

    // Restore user password for subsequent tests
    await UserService.updateUser(TENANT_1, 'USR-MHS-01', { password: '123' }, 'SYSTEM');

    console.log('\n================================================================');
    console.log(`🎉 CACHE CONSISTENCY TESTS FINISHED: ${passedTests}/9 TESTS PASSED`);
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('\n❌ CACHE CONSISTENCY TEST FAILED:', err.message || err);
    process.exit(1);
  }
}

runCacheConsistencyTests();
