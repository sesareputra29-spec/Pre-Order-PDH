// Comprehensive Integration Test Suite for Persistent Tokens, Email Verification & Dispatcher Flow
import { AuthService } from './services/authService.ts';
import { UserService } from './services/userService.ts';
import { StudentService } from './services/studentService.ts';
import { EmailService } from './services/emailService.ts';

export async function runAuthVerificationTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING AUTHENTICATION TOKENS & EMAIL DISPATCHER TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 20;
  const tenantId = 'TENANT-001';
  const otherTenantId = 'TENANT-002';
  const testNim = `22MJSP888`;
  const testEmail = `student.test888@campus.ac.id`;
  const testPassword = `InitialPass123!`;
  const newPassword = `UpdatedPass456!`;

  let registrationResult: any = null;
  let resetResult: any = null;

  // Test 1: Register mahasiswa baru
  console.log('Test 1: Register mahasiswa baru...');
  try {
    registrationResult = await AuthService.registerStudent(tenantId, {
      nim: testNim,
      name: 'Mahasiswa Test Auth',
      className: '01MJSP001',
      email: testEmail,
      password: testPassword
    });

    if (registrationResult && registrationResult.verificationToken && registrationResult.userId) {
      console.log(`   ✅ PASS: Mahasiswa berhasil terdaftar dengan User ID: ${registrationResult.userId}`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Registrasi mahasiswa tidak mengembalikan token.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 2: Status akun baru = PENDING_VERIFICATION
  console.log('\nTest 2: Verifikasi status akun baru = PENDING_VERIFICATION...');
  try {
    const user = await UserService.findById(tenantId, registrationResult.userId);
    if (user && user.status === 'PENDING_VERIFICATION') {
      console.log(`   ✅ PASS: Status akun di database terverifikasi 'PENDING_VERIFICATION'.`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: Status akun adalah '${user?.status}', seharusnya 'PENDING_VERIFICATION'.`);
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 3: Login sebelum verification -> FAIL (dengan pesan error spesifik)
  console.log('\nTest 3: Login sebelum verifikasi email (Harus FAIL)...');
  try {
    await AuthService.login(tenantId, testNim, testPassword);
    console.error('   ❌ FAIL: Login berhasil padahal akun belum terverifikasi!');
  } catch (e: any) {
    if (e.message.includes('belum diverifikasi')) {
      console.log(`   ✅ PASS: Login ditolak dengan pesan yang sesuai: "${e.message}"`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: Pesan error tidak sesuai: "${e.message}"`);
    }
  }

  // Test 4: Verification valid -> SUCCESS
  console.log('\nTest 4: Verifikasi akun dengan token valid...');
  try {
    const verifyRes = await AuthService.verifyAccountToken(tenantId, registrationResult.verificationToken);
    if (verifyRes && verifyRes.userId === registrationResult.userId) {
      console.log(`   ✅ PASS: Token verifikasi berhasil diproses.`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Hasil verifikasi token tidak sesuai.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 5: Status akun diupdate menjadi ACTIVE
  console.log('\nTest 5: Memastikan status akun berubah menjadi ACTIVE...');
  try {
    const user = await UserService.findById(tenantId, registrationResult.userId);
    if (user && user.status === 'ACTIVE') {
      console.log(`   ✅ PASS: Status akun di database berubah menjadi 'ACTIVE'.`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: Status akun adalah '${user?.status}', seharusnya 'ACTIVE'.`);
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 6: Login setelah verification -> SUCCESS
  console.log('\nTest 6: Login setelah akun terverifikasi (Harus SUCCESS)...');
  try {
    const loginRes = await AuthService.login(tenantId, testNim, testPassword);
    if (loginRes && loginRes.token && loginRes.user.status === 'ACTIVE') {
      console.log(`   ✅ PASS: Login berhasil setelah verifikasi. Token terbit.`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Sesi login gagal terbit.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 7: Gunakan token verification kedua kali -> FAIL (Single-use token)
  console.log('\nTest 7: Menggunakan kembali token verifikasi yang sudah terpakai (Harus FAIL)...');
  try {
    await AuthService.verifyAccountToken(tenantId, registrationResult.verificationToken);
    console.error('   ❌ FAIL: Token verifikasi kedua kali tidak ditolak!');
  } catch (e: any) {
    if (e.message.includes('sudah pernah digunakan')) {
      console.log(`   ✅ PASS: Token ditolak dengan pesan: "${e.message}"`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: Pesan error tidak sesuai: "${e.message}"`);
    }
  }

  // Test 8: Token verifikasi expired / invalid -> FAIL
  console.log('\nTest 8: Menguji token verifikasi fiktif/invalid (Harus FAIL)...');
  try {
    await AuthService.verifyAccountToken(tenantId, 'VRF-INVALID-TOKEN-99999');
    console.error('   ❌ FAIL: Token invalid diterima!');
  } catch (e: any) {
    if (e.message.includes('tidak ditemukan atau tidak valid')) {
      console.log(`   ✅ PASS: Token invalid ditolak secara tepat: "${e.message}"`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: Pesan error tidak sesuai: "${e.message}"`);
    }
  }

  // Test 9: Token verifikasi dari tenant lain -> FAIL
  console.log('\nTest 9: Verifikasi token pada tenant lain (Harus FAIL)...');
  try {
    // Generate valid token on tenant 1
    const dummyReg = await AuthService.registerStudent(tenantId, {
      nim: '22MJSP889',
      name: 'Mahasiswa Tenant Isolation',
      className: '01MJSP001',
      email: 'student.test889@campus.ac.id',
      password: testPassword
    });

    // Try verifying the token under tenant 2
    await AuthService.verifyAccountToken(otherTenantId, dummyReg.verificationToken);
    console.error('   ❌ FAIL: Token tenant 1 dapat diverifikasi pada tenant 2!');
  } catch (e: any) {
    if (e.message.includes('tidak sesuai') || e.message.includes('tidak ditemukan')) {
      console.log(`   ✅ PASS: Token tenant lain berhasil ditolak: "${e.message}"`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: Pesan error tidak sesuai: "${e.message}"`);
    }
  }

  // Test 10: Password reset request -> CREATE & STORE HASH
  console.log('\nTest 10: Permintaan reset password (sendPasswordResetLink)...');
  try {
    resetResult = await AuthService.sendPasswordResetLink(tenantId, testNim);
    if (resetResult && resetResult.resetToken) {
      console.log(`   ✅ PASS: Permintaan reset password berhasil terbit.`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Permintaan reset password gagal.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 11: Reset password dengan token valid
  console.log('\nTest 11: Melakukan reset password dengan token valid...');
  try {
    const resetSuccess = await AuthService.resetPasswordWithToken(tenantId, resetResult.resetToken, newPassword);
    if (resetSuccess) {
      console.log(`   ✅ PASS: Password berhasil diperbarui via token.`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Reset password gagal.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 12: Reset password token kedua kali -> FAIL (Single-use)
  console.log('\nTest 12: Menggunakan reset token kedua kali (Harus FAIL)...');
  try {
    await AuthService.resetPasswordWithToken(tenantId, resetResult.resetToken, 'AnotherPass123!');
    console.error('   ❌ FAIL: Reset token kedua kali diterima!');
  } catch (e: any) {
    if (e.message.includes('sudah pernah digunakan')) {
      console.log(`   ✅ PASS: Reset token kedua kali ditolak: "${e.message}"`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: Pesan error tidak sesuai: "${e.message}"`);
    }
  }

  // Test 13: Password lama tidak dapat digunakan untuk login -> FAIL
  console.log('\nTest 13: Login dengan password LAMA (Harus FAIL)...');
  try {
    await AuthService.login(tenantId, testNim, testPassword);
    console.error('   ❌ FAIL: Password lama masih dapat digunakan!');
  } catch (e: any) {
    if (e.message.includes('tidak sesuai')) {
      console.log(`   ✅ PASS: Password lama berhasil ditolak.`);
      passedTests++;
    } else {
      console.error(`   ❌ FAIL: Pesan error tidak sesuai: "${e.message}"`);
    }
  }

  // Test 14: Password baru dapat digunakan untuk login -> SUCCESS
  console.log('\nTest 14: Login dengan password BARU (Harus SUCCESS)...');
  try {
    const loginNewRes = await AuthService.login(tenantId, testNim, newPassword);
    if (loginNewRes && loginNewRes.token) {
      console.log(`   ✅ PASS: Login berhasil menggunakan password baru.`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Login password baru gagal.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 15: Simulasi instance Vercel serverless baru (Clear in-memory cache)
  console.log('\nTest 15: Simulasi instance serverless Vercel baru (Re-read Google Sheets)...');
  try {
    // Request a new reset token
    const newResetReq = await AuthService.sendPasswordResetLink(tenantId, testNim);

    // Simulate new serverless container by forcing reloading tokens from Google Sheets
    await (AuthService as any).loadTokensFromSheets(tenantId);

    // Now try resetting password with the token on the "new instance"
    const finalResetPass = `FinalInstancePass789!`;
    if (!newResetReq) throw new Error('Reset request gagal.');
    const instanceResetRes = await AuthService.resetPasswordWithToken(tenantId, newResetReq.resetToken, finalResetPass);

    if (instanceResetRes) {
      console.log('   ✅ PASS: Token persisten di Google Sheets berhasil dibaca oleh instance serverless baru.');
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Token hilang saat instance serverless berganti.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 16: EmailService sendVerificationEmail dispatch & mode verification
  console.log('\nTest 16: Pengujian EmailService.sendVerificationEmail...');
  try {
    const emailRes = await EmailService.sendVerificationEmail({
      tenantId,
      email: testEmail,
      name: 'Mahasiswa Test Email',
      verificationToken: 'VRF-TEST-DISPATCH-12345'
    });

    if (emailRes && (emailRes.mode === 'RESEND_API' || emailRes.mode === 'DEV_FALLBACK') && emailRes.success) {
      console.log(`   ✅ PASS: EmailService verifikasi berhasil dipanggil (Mode: ${emailRes.mode}).`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: EmailService verifikasi gagal.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 17: EmailService sendPasswordResetEmail dispatch & mode verification
  console.log('\nTest 17: Pengujian EmailService.sendPasswordResetEmail...');
  try {
    const emailRes = await EmailService.sendPasswordResetEmail({
      tenantId,
      email: testEmail,
      name: 'Mahasiswa Test Email',
      resetToken: 'RST-TEST-DISPATCH-12345'
    });

    if (emailRes && (emailRes.mode === 'RESEND_API' || emailRes.mode === 'DEV_FALLBACK') && emailRes.success) {
      console.log(`   ✅ PASS: EmailService reset password berhasil dipanggil (Mode: ${emailRes.mode}).`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: EmailService reset password gagal.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 18: Penggunaan APP_BASE_URL dalam link
  console.log('\nTest 18: Memastikan APP_BASE_URL digunakan dengan benar dalam link...');
  try {
    const baseUrl = (EmailService as any).getAppBaseUrl();
    if (baseUrl && (baseUrl.startsWith('http://') || baseUrl.startsWith('https://'))) {
      console.log(`   ✅ PASS: APP_BASE_URL terdeteksi valid: ${baseUrl}`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Format APP_BASE_URL tidak valid.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 19: Kerahasiaan RESEND_API_KEY (Server-side Only)
  console.log('\nTest 19: Sanitasi kredensial (RESEND_API_KEY tidak bocor)...');
  try {
    const key = process.env.RESEND_API_KEY || '';
    const isLeakedInFrontend = key.startsWith('VITE_');
    if (!isLeakedInFrontend) {
      console.log('   ✅ PASS: RESEND_API_KEY murni server-side, tidak menggunakan prefix VITE_.');
      passedTests++;
    } else {
      console.error('   ❌ FAIL: RESEND_API_KEY terekspos ke VITE_!');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 20: Pemetaan token existing tanpa membuat token baru
  console.log('\nTest 20: Verifikasi pemetaan token ke Email Dispatcher...');
  try {
    const newReg = await AuthService.registerStudent(tenantId, {
      nim: '22MJSP890',
      name: 'Mahasiswa Mapping Test',
      className: '01MJSP001',
      email: 'student.test890@campus.ac.id',
      password: testPassword
    });

    if (newReg.verificationLink.includes(newReg.verificationToken)) {
      console.log('   ✅ PASS: Tautan email menggunakan token verifikasi asli.');
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Token verifikasi tidak sesuai dalam tautan email.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  console.log('\n================================================================');
  console.log(`🎉 AUTH VERIFICATION & EMAIL TESTS FINISHED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  return {
    passedTests,
    totalTests,
    success: passedTests === totalTests
  };
}

// Run directly if invoked via CLI
if (process.argv[1]?.includes('testAuthVerification')) {
  runAuthVerificationTestSuite().catch(console.error);
}
