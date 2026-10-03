/**
 * PDH CAMPUS ORDER SYSTEM
 * Auth File: Auth.gs
 * 
 * Server-side authentication, authorization, session tokens, and user password verification.
 */

/**
 * Helper function to hash user password server-side
 * @param {string} pass 
 * @returns {string}
 */
function hashPassword(pass) {
  if (!pass) return '';
  try {
    if (typeof Utilities !== 'undefined' && Utilities.computeDigest) {
      var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pass);
      var txt = '';
      for (var i = 0; i < rawHash.length; i++) {
        var byteVal = rawHash[i];
        if (byteVal < 0) byteVal += 256;
        var byteStr = byteVal.toString(16);
        if (byteStr.length == 1) byteStr = '0' + byteStr;
        txt += byteStr;
      }
      return 'SHA256:' + txt;
    }
  } catch(e) {}
  var hash = 0;
  for (var j = 0; j < pass.length; j++) {
    hash = (hash << 5) - hash + pass.charCodeAt(j);
    hash |= 0;
  }
  return 'HASH-' + Math.abs(hash).toString(36);
}

/**
 * Authenticate user by username and password
 * @param {Object} credentials { username, password }
 * @returns {Object} response with user details and session token
 */
function apiAuthenticateUser(credentials) {
  try {
    if (!credentials || !credentials.username || !credentials.password) {
      return createResponse(false, null, 'Username/NIM dan password wajib diisi.');
    }

    var username = String(credentials.username).trim().toLowerCase();
    var password = String(credentials.password).trim();

    // Fetch users from database
    var users = batchRead(CONFIG.SHEETS.USERS);
    var user = null;

    for (var i = 0; i < users.length; i++) {
      var uName = String(users[i].username || '').toLowerCase();
      var uNim = String(users[i].nim || '').toLowerCase();
      if (uName === username || uNim === username) {
        user = users[i];
        break;
      }
    }

    if (!user) {
      logAudit('GUEST', 'LOGIN_FAILED', 'AUTH', 'User not found: ' + username);
      return createResponse(false, null, 'NIM atau password salah.');
    }

    // Server-Side Verification Status Check (Requirement 5)
    var userStatus = String(user.status || '').toUpperCase();
    if (userStatus === 'BELUM TERVERIFIKASI' || userStatus === 'UNVERIFIED' || userStatus === 'PENDING') {
      logAudit(user.user_id, 'LOGIN_BLOCKED_UNVERIFIED', 'AUTH', 'Unverified login attempt: ' + username);
      return createResponse(false, null, 'Akun Anda belum diverifikasi. Silakan cek email untuk melakukan verifikasi.');
    }

    if (userStatus !== 'ACTIVE' && userStatus !== 'TERVERIFIKASI') {
      logAudit(user.user_id, 'LOGIN_BLOCKED', 'AUTH', 'Inactive user attempt: ' + username);
      return createResponse(false, null, 'Akun anda nonaktif. Silakan hubungi Panitia.');
    }

    // Verify password against plaintext or server-side hash
    var hashedInput = hashPassword(password);
    if (String(user.password_hash) !== password && String(user.password_hash) !== hashedInput) {
      logAudit(user.user_id, 'LOGIN_FAILED', 'AUTH', 'Wrong password for: ' + username);
      return createResponse(false, null, 'NIM atau password salah.');
    }

    // Generate Session Token
    var token = generateUniqueId('SESS') + '-' + new Date().getTime();
    var sessionUser = {
      userId: user.user_id,
      username: user.username,
      nim: user.nim || user.username,
      className: user.class_name || user.className || '',
      name: user.name,
      email: user.email,
      role: user.role, // PANITIA | MAHASISWA
      token: token,
      loginAt: new Date().toISOString()
    };

    logAudit(user.user_id, 'LOGIN_SUCCESS', 'AUTH', 'Successful login for role: ' + user.role);

    return createResponse(true, sessionUser, 'Login berhasil! Selamat datang, ' + user.name + '.');
  } catch (err) {
    Logger.log('Auth Error: ' + err.message);
    return createResponse(false, null, 'Gagal autentikasi: ' + err.message);
  }
}

/**
 * Register new student account (NIM, Name, Class, Email, Password)
 * Status initially set to BELUM TERVERIFIKASI
 * Sends email containing account verification link (no OTP)
 * @param {Object} payload 
 */
function apiRegisterStudent(payload) {
  try {
    if (!payload || !payload.nim || !payload.name || !payload.className || !payload.email || !payload.password) {
      return createResponse(false, null, 'Seluruh field (NIM, Nama Lengkap, Kelas, Email Pribadi, Password) wajib diisi.');
    }

    var nim = String(payload.nim).trim();
    var name = String(payload.name).trim();
    var className = String(payload.className).trim().toUpperCase();
    var email = String(payload.email).trim().toLowerCase();
    var password = String(payload.password).trim();

    // Verify Class Format
    var classRegex = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;
    if (!classRegex.test(className)) {
      return createResponse(false, null, 'Format Kelas tidak valid! Harus berformat ##MJSP###, ##MJSM###, atau ##MJSE### (Contoh: 01MJSP001).');
    }

    if (password.length < 3) {
      return createResponse(false, null, 'Password minimal terdiri dari 3 karakter.');
    }

    // Check existing NIM / Email in database
    var users = batchRead(CONFIG.SHEETS.USERS);
    for (var i = 0; i < users.length; i++) {
      if (String(users[i].nim || users[i].username).trim().toLowerCase() === nim.toLowerCase()) {
        return createResponse(false, null, 'NIM ' + nim + ' sudah terdaftar sebagai akun mahasiswa.');
      }
      if (String(users[i].email || '').trim().toLowerCase() === email) {
        return createResponse(false, null, 'Email ' + email + ' sudah digunakan oleh akun lain.');
      }
    }

    var userId = 'USR-MHS-' + nim;
    var now = new Date().toISOString();
    var hashedPass = hashPassword(password);

    // Save student with status BELUM TERVERIFIKASI
    var newUser = {
      user_id: userId,
      username: nim,
      nim: nim,
      name: name,
      class_name: className,
      email: email,
      password_hash: hashedPass,
      role: 'MAHASISWA',
      status: 'BELUM TERVERIFIKASI',
      created_at: now,
      updated_at: now
    };

    appendData(CONFIG.SHEETS.USERS, newUser);

    // Generate Server-Side Verification Token (Requirement 7)
    var vToken = 'VRF-' + generateUniqueId('TOK') + '-' + new Date().getTime();
    var expiresAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();

    var tokenRecord = {
      token: vToken,
      user_id: userId,
      email: email,
      created_at: now,
      expires_at: expiresAt,
      used: 'FALSE'
    };

    try {
      appendData('VERIFICATION_TOKENS', tokenRecord);
    } catch(e) {
      Logger.log('Notice saving token record: ' + e.message);
    }

    var appUrl = ScriptApp.getService().getUrl() || '';
    var verifyUrl = appUrl + (appUrl.indexOf('?') >= 0 ? '&' : '?') + 'verify_token=' + vToken;

    // Send Verification Email (Requirement 3)
    try {
      if (typeof MailApp !== 'undefined') {
        MailApp.sendEmail({
          to: email,
          subject: 'Verifikasi Akun Mahasiswa - PDH Campus Order',
          htmlBody: '<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">' +
            '<h2>Verifikasi Akun Mahasiswa</h2>' +
            '<p>Halo <strong>' + name + '</strong> (' + nim + '),</p>' +
            '<p>Terima kasih telah mendaftar di sistem PDH Campus Order. Silakan klik link di bawah ini untuk memverifikasi akun Anda:</p>' +
            '<p><a href="' + verifyUrl + '" style="display: inline-block; padding: 12px 24px; background: #059669; color: #ffffff; text-decoration: none; font-weight: bold; borderRadius: 8px;">VERIFIKASI AKUN SAYA</a></p>' +
            '<p>Atau buka URL berikut di browser Anda:<br/><a href="' + verifyUrl + '">' + verifyUrl + '</a></p>' +
            '<p>Link verifikasi ini berlaku selama 24 jam dan hanya dapat digunakan 1 kali.</p>' +
            '</div>'
        });
      }
    } catch(mailErr) {
      Logger.log('MailApp error: ' + mailErr.message);
    }

    logAudit(userId, 'REGISTER_STUDENT_UNVERIFIED', 'USER', {
      nim: nim,
      name: name,
      email: email,
      verificationToken: vToken
    });

    return createResponse(true, {
      userId: userId,
      email: email,
      verificationToken: vToken,
      verificationLink: verifyUrl
    }, 'Registrasi akun berhasil! Link verifikasi telah dikirimkan ke email ' + email + '. Silakan cek email Anda untuk memverifikasi akun.');
  } catch(err) {
    Logger.log('Error apiRegisterStudent: ' + err.message);
    return createResponse(false, null, 'Gagal registrasi: ' + err.message);
  }
}

/**
 * Validate and verify student account token (Requirement 4)
 * @param {string} token 
 */
function apiVerifyAccountToken(token) {
  try {
    if (!token || !String(token).trim()) {
      return createResponse(false, null, 'Token verifikasi wajib diberikan.');
    }

    var cleanToken = String(token).trim();
    var tokens = batchRead('VERIFICATION_TOKENS');
    var tokenObj = null;

    for (var i = 0; i < tokens.length; i++) {
      if (String(tokens[i].token).trim() === cleanToken) {
        tokenObj = tokens[i];
        break;
      }
    }

    if (!tokenObj) {
      return createResponse(false, null, 'Token verifikasi tidak ditemukan atau tidak valid.');
    }

    if (String(tokenObj.used).toUpperCase() === 'TRUE' || tokenObj.used === true) {
      return createResponse(false, null, 'Token verifikasi ini sudah pernah digunakan.');
    }

    if (tokenObj.expires_at && new Date(tokenObj.expires_at).getTime() < new Date().getTime()) {
      return createResponse(false, null, 'Token verifikasi telah kedaluwarsa. Silakan lakukan registrasi ulang.');
    }

    // Mark token as used
    tokenObj.used = 'TRUE';
    updateRecord('VERIFICATION_TOKENS', 'token', cleanToken, { used: 'TRUE' });

    // Update user status to TERVERIFIKASI
    var users = batchRead(CONFIG.SHEETS.USERS);
    var targetUser = null;
    for (var j = 0; j < users.length; j++) {
      if (users[j].user_id === tokenObj.user_id) {
        targetUser = users[j];
        break;
      }
    }

    if (!targetUser) {
      return createResponse(false, null, 'Akun pengguna untuk token ini tidak ditemukan.');
    }

    updateRecord(CONFIG.SHEETS.USERS, 'user_id', targetUser.user_id, {
      status: 'TERVERIFIKASI',
      updated_at: new Date().toISOString()
    });

    logAudit(targetUser.user_id, 'VERIFY_ACCOUNT_SUCCESS', 'USER', 'Akun berhasil diverifikasi via token');

    return createResponse(true, { userId: targetUser.user_id, nim: targetUser.nim }, 'Akun berhasil diverifikasi. Silakan login.');
  } catch (err) {
    Logger.log('Error apiVerifyAccountToken: ' + err.message);
    return createResponse(false, null, 'Gagal memverifikasi akun: ' + err.message);
  }
}

/**
 * Verify if user session has valid permission for role
 * @param {string} userId 
 * @param {string} requiredRole 
 * @returns {boolean}
 */
function authorizeRole(userId, requiredRole) {
  if (!userId) return false;
  var users = batchRead(CONFIG.SHEETS.USERS);
  for (var i = 0; i < users.length; i++) {
    if (users[i].user_id === userId) {
      if (users[i].status !== 'ACTIVE') return false;
      if (requiredRole && users[i].role !== requiredRole) return false;
      return true;
    }
  }
  return false;
}

/**
 * Get current user profile by userId
 * @param {string} userId 
 */
function apiGetUserProfile(userId) {
  try {
    var users = batchRead(CONFIG.SHEETS.USERS);
    for (var i = 0; i < users.length; i++) {
      if (users[i].user_id === userId) {
        return createResponse(true, {
          userId: users[i].user_id,
          username: users[i].username,
          name: users[i].name,
          email: users[i].email,
          role: users[i].role,
          status: users[i].status
        }, 'Profil berhasil dimuat.');
      }
    }
    return createResponse(false, null, 'Pengguna tidak ditemukan.');
  } catch (e) {
    return createResponse(false, null, 'Gagal memuat profil: ' + e.message);
  }
}

/**
 * Request password reset link for student by NIM
 * @param {string} nim 
 */
function apiSendPasswordResetLink(nim) {
  try {
    var genericMsg = 'Jika akun terdaftar, link reset password akan dikirim ke email yang terdaftar.';
    if (!nim || !String(nim).trim()) {
      return createResponse(false, null, 'NIM wajib diisi.');
    }

    var cleanNim = String(nim).trim().toLowerCase();
    var users = batchRead(CONFIG.SHEETS.USERS);
    var user = null;

    for (var i = 0; i < users.length; i++) {
      var uNim = String(users[i].nim || users[i].username || '').trim().toLowerCase();
      if (uNim === cleanNim) {
        user = users[i];
        break;
      }
    }

    // Do not reveal account existence if not found or not verified
    if (!user) {
      return createResponse(true, null, genericMsg);
    }

    var userStatus = String(user.status || '').toUpperCase();
    if (userStatus === 'BELUM TERVERIFIKASI' || userStatus === 'UNVERIFIED' || userStatus === 'PENDING') {
      return createResponse(true, null, genericMsg);
    }

    var rToken = 'RST-' + generateUniqueId('RST') + '-' + new Date().getTime();
    var expiresAt = new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours

    var tokenRecord = {
      token: rToken,
      user_id: user.user_id,
      email: user.email,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      used: 'FALSE'
    };

    try {
      appendData('RESET_TOKENS', tokenRecord);
    } catch(e) {
      Logger.log('Notice saving reset token: ' + e.message);
    }

    var appUrl = ScriptApp.getService().getUrl() || '';
    var resetUrl = appUrl + (appUrl.indexOf('?') >= 0 ? '&' : '?') + 'reset_token=' + rToken;

    try {
      if (typeof MailApp !== 'undefined') {
        MailApp.sendEmail({
          to: user.email,
          subject: 'Reset Password Akun - PDH Campus Order',
          htmlBody: '<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">' +
            '<h2>Reset Password Akun PDH</h2>' +
            '<p>Halo <strong>' + user.name + '</strong> (' + user.nim + '),</p>' +
            '<p>Kami menerima permintaan untuk meriset password akun Anda. Silakan klik tombol di bawah untuk membuat password baru:</p>' +
            '<p><a href="' + resetUrl + '" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: bold; borderRadius: 8px;">RESET PASSWORD SAYA</a></p>' +
            '<p>Atau buka URL berikut di browser Anda:<br/><a href="' + resetUrl + '">' + resetUrl + '</a></p>' +
            '<p>Link ini berlaku selama 2 jam dan hanya dapat digunakan 1 kali.</p>' +
            '</div>'
        });
      }
    } catch(mailErr) {
      Logger.log('MailApp reset error: ' + mailErr.message);
    }

    logAudit(user.user_id, 'REQUEST_PASSWORD_RESET', 'USER', { nim: user.nim, resetToken: rToken });

    return createResponse(true, {
      resetToken: rToken,
      resetLink: resetUrl
    }, genericMsg);
  } catch (err) {
    Logger.log('Error apiSendPasswordResetLink: ' + err.message);
    return createResponse(false, null, 'Terjadi kesalahan sistem.');
  }
}

/**
 * Reset user password with valid server-side reset token
 * @param {string} token 
 * @param {string} newPassword 
 */
function apiResetPasswordWithToken(token, newPassword) {
  try {
    if (!token || !String(token).trim()) {
      return createResponse(false, null, 'Token reset password wajib diberikan.');
    }
    if (!newPassword || String(newPassword).trim().length < 3) {
      return createResponse(false, null, 'Password baru minimal terdiri dari 3 karakter.');
    }

    var cleanToken = String(token).trim();
    var cleanPassword = String(newPassword).trim();
    var tokens = batchRead('RESET_TOKENS');
    var tokenObj = null;

    for (var i = 0; i < tokens.length; i++) {
      if (String(tokens[i].token).trim() === cleanToken) {
        tokenObj = tokens[i];
        break;
      }
    }

    if (!tokenObj) {
      return createResponse(false, null, 'Token reset password tidak ditemukan atau tidak valid.');
    }

    if (String(tokenObj.used).toUpperCase() === 'TRUE' || tokenObj.used === true) {
      return createResponse(false, null, 'Token reset password ini sudah pernah digunakan.');
    }

    if (tokenObj.expires_at && new Date(tokenObj.expires_at).getTime() < new Date().getTime()) {
      return createResponse(false, null, 'Token reset password telah kedaluwarsa. Silakan lakukan permintaan ulang.');
    }

    // Hash new password securely
    var hashedNewPass = hashPassword(cleanPassword);

    // Update user password in USERS
    var users = batchRead(CONFIG.SHEETS.USERS);
    var targetUser = null;
    for (var j = 0; j < users.length; j++) {
      if (users[j].user_id === tokenObj.user_id) {
        targetUser = users[j];
        break;
      }
    }

    if (!targetUser) {
      return createResponse(false, null, 'Akun pengguna untuk token ini tidak ditemukan.');
    }

    updateRecord(CONFIG.SHEETS.USERS, 'user_id', targetUser.user_id, {
      password_hash: hashedNewPass,
      updated_at: new Date().toISOString()
    });

    // Mark token as used
    updateRecord('RESET_TOKENS', 'token', cleanToken, { used: 'TRUE' });

    logAudit(targetUser.user_id, 'RESET_PASSWORD_SUCCESS', 'USER', 'Password berhasil diperbarui via token reset');

    return createResponse(true, null, 'Password berhasil diubah. Silakan login.');
  } catch (err) {
    Logger.log('Error apiResetPasswordWithToken: ' + err.message);
    return createResponse(false, null, 'Gagal mengubah password: ' + err.message);
  }
}

/**
 * Get all registered panitia users for Panitia User Management
 * @param {string} userId 
 */
function apiGetAllPanitiaUsers(userId) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang dapat mengakses manajemen user.');
    }

    var users = batchRead(CONFIG.SHEETS.USERS);
    var safeUsers = [];
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      safeUsers.push({
        user_id: u.user_id,
        username: u.username,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status || 'ACTIVE',
        created_at: u.created_at || u.createdAt || '',
        updated_at: u.updated_at || u.updatedAt || ''
      });
    }

    return createResponse(true, safeUsers, 'Daftar user berhasil dimuat.');
  } catch (err) {
    return createResponse(false, null, 'Gagal memuat daftar user: ' + err.message);
  }
}

/**
 * Create a new Panitia user (Locked role PANITIA)
 * @param {string} userId 
 * @param {Object} payload 
 */
function apiCreatePanitiaUser(userId, payload) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang berwenang menambah user panitia.');
    }

    if (!payload || !payload.name || !payload.username || !payload.email || !payload.password || !payload.confirmPassword) {
      return createResponse(false, null, 'Semua field (Nama, Username, Email, Password, Konfirmasi Password) wajib diisi!');
    }

    if (payload.password !== payload.confirmPassword) {
      return createResponse(false, null, 'Konfirmasi password tidak cocok dengan password!');
    }

    if (String(payload.password).trim().length < 3) {
      return createResponse(false, null, 'Password minimal 3 karakter!');
    }

    var cleanUsername = String(payload.username).trim().toLowerCase();
    var cleanEmail = String(payload.email).trim().toLowerCase();

    var existingUsers = batchRead(CONFIG.SHEETS.USERS);
    for (var i = 0; i < existingUsers.length; i++) {
      if (String(existingUsers[i].username || '').toLowerCase() === cleanUsername) {
        return createResponse(false, null, 'Username "' + cleanUsername + '" sudah digunakan oleh akun lain!');
      }
      if (String(existingUsers[i].email || '').toLowerCase() === cleanEmail) {
        return createResponse(false, null, 'Email "' + cleanEmail + '" sudah terdaftar pada sistem!');
      }
    }

    var newUserId = generateUniqueId('USR-PANITIA');
    var hashedPass = hashPassword(String(payload.password).trim());
    var now = new Date().toISOString();

    var newUserRecord = {
      user_id: newUserId,
      username: cleanUsername,
      password_hash: hashedPass,
      name: String(payload.name).trim(),
      email: cleanEmail,
      role: 'PANITIA',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    };

    appendData(CONFIG.SHEETS.USERS, newUserRecord);
    logAudit(userId, 'CREATE_PANITIA_USER', 'USER_ACCESS', 'User ID: ' + newUserId + ', Username: ' + cleanUsername + ', Role: PANITIA');

    var safeUser = {
      user_id: newUserId,
      username: cleanUsername,
      name: newUserRecord.name,
      email: cleanEmail,
      role: 'PANITIA',
      status: 'ACTIVE',
      created_at: now
    };

    return createResponse(true, safeUser, 'User Panitia baru "' + cleanUsername + '" berhasil dibuat!');
  } catch (err) {
    return createResponse(false, null, 'Gagal membuat user panitia: ' + err.message);
  }
}

/**
 * Update Panitia user info (Name & Email)
 * @param {string} userId 
 * @param {string} targetUserId 
 * @param {Object} payload 
 */
function apiUpdatePanitiaUser(userId, targetUserId, payload) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang berwenang mengedit user.');
    }

    var users = batchRead(CONFIG.SHEETS.USERS);
    var targetIdx = -1;
    for (var i = 0; i < users.length; i++) {
      if (users[i].user_id === targetUserId || users[i].username === targetUserId) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx < 0) {
      return createResponse(false, null, 'User tidak ditemukan.');
    }

    var cleanName = payload.name ? String(payload.name).trim() : users[targetIdx].name;
    var cleanEmail = payload.email ? String(payload.email).trim().toLowerCase() : users[targetIdx].email;

    if (cleanEmail && cleanEmail !== String(users[targetIdx].email || '').toLowerCase()) {
      for (var j = 0; j < users.length; j++) {
        if (j !== targetIdx && String(users[j].email || '').toLowerCase() === cleanEmail) {
          return createResponse(false, null, 'Email "' + cleanEmail + '" sudah digunakan oleh akun lain!');
        }
      }
    }

    var updatedPayload = {
      name: cleanName,
      email: cleanEmail,
      updated_at: new Date().toISOString()
    };

    updateRecord(CONFIG.SHEETS.USERS, 'user_id', users[targetIdx].user_id, updatedPayload);
    logAudit(userId, 'UPDATE_PANITIA_USER', 'USER_ACCESS', 'Target User ID: ' + users[targetIdx].user_id + ', Nama: ' + cleanName);

    return createResponse(true, updatedPayload, 'Data user panitia berhasil diperbarui.');
  } catch (err) {
    return createResponse(false, null, 'Gagal memperbarui data user: ' + err.message);
  }
}

/**
 * Toggle Panitia / Student user active status
 * @param {string} userId 
 * @param {string} targetUserId 
 * @param {string} newStatus 
 */
function apiTogglePanitiaUserStatus(userId, targetUserId, newStatus) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang berwenang mengubah status akun.');
    }

    var users = batchRead(CONFIG.SHEETS.USERS);
    var targetUser = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].user_id === targetUserId || users[i].username === targetUserId || users[i].nim === targetUserId) {
        targetUser = users[i];
        break;
      }
    }

    if (!targetUser) {
      return createResponse(false, null, 'User tidak ditemukan.');
    }

    if (targetUser.user_id === 'USR-ADMIN-01' || targetUser.username === 'admin') {
      return createResponse(false, null, 'Dilarang menonaktifkan atau mengubah akun Administrator Utama (admin)!');
    }

    var finalStatus = (newStatus === 'ACTIVE' || newStatus === 'AKTIF' || newStatus === 'TERVERIFIKASI') ? 'ACTIVE' : 'INACTIVE';
    updateRecord(CONFIG.SHEETS.USERS, 'user_id', targetUser.user_id, {
      status: finalStatus,
      updated_at: new Date().toISOString()
    });

    logAudit(userId, 'TOGGLE_USER_STATUS', 'USER_ACCESS', 'Target Username: ' + targetUser.username + ', Status Baru: ' + finalStatus);

    return createResponse(true, { status: finalStatus }, 'Status akun "' + targetUser.username + '" berhasil diubah menjadi ' + finalStatus + '.');
  } catch (err) {
    return createResponse(false, null, 'Gagal mengubah status akun: ' + err.message);
  }
}

/**
 * Reset user password by Panitia admin
 * @param {string} userId 
 * @param {string} targetUserId 
 * @param {string} newPassword 
 * @param {string} confirmPassword 
 */
function apiResetPanitiaUserPassword(userId, targetUserId, newPassword, confirmPassword) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang berwenang mereset password user.');
    }

    if (!newPassword || !confirmPassword) {
      return createResponse(false, null, 'Password baru dan konfirmasi password wajib diisi!');
    }

    if (newPassword !== confirmPassword) {
      return createResponse(false, null, 'Konfirmasi password tidak cocok dengan password baru!');
    }

    if (String(newPassword).trim().length < 3) {
      return createResponse(false, null, 'Password baru minimal terdiri dari 3 karakter.');
    }

    var users = batchRead(CONFIG.SHEETS.USERS);
    var targetUser = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].user_id === targetUserId || users[i].username === targetUserId || users[i].nim === targetUserId) {
        targetUser = users[i];
        break;
      }
    }

    if (!targetUser) {
      return createResponse(false, null, 'User tidak ditemukan.');
    }

    var hashedPass = hashPassword(String(newPassword).trim());
    updateRecord(CONFIG.SHEETS.USERS, 'user_id', targetUser.user_id, {
      password_hash: hashedPass,
      updated_at: new Date().toISOString()
    });

    logAudit(userId, 'RESET_USER_PASSWORD', 'USER_ACCESS', 'Target Username: ' + targetUser.username);

    return createResponse(true, null, 'Password user "' + targetUser.username + '" berhasil diperbarui!');
  } catch (err) {
    return createResponse(false, null, 'Gagal mereset password: ' + err.message);
  }
}

/**
 * Get all student accounts for Student Management Tab
 * @param {string} userId 
 */
function apiGetAllStudentsPanitia(userId) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang dapat memuat data mahasiswa.');
    }

    var users = batchRead(CONFIG.SHEETS.USERS);
    var students = [];
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      if (u.role === 'MAHASISWA' || u.nim || u.class_name) {
        students.push({
          user_id: u.user_id,
          username: u.username,
          nim: u.nim || u.username,
          name: u.name,
          class_name: u.class_name || '',
          email: u.email,
          phone: u.phone || u.whatsapp || '',
          role: 'MAHASISWA',
          status: u.status || 'TERVERIFIKASI',
          created_at: u.created_at || u.createdAt || ''
        });
      }
    }

    return createResponse(true, students, 'Daftar data mahasiswa berhasil dimuat.');
  } catch (err) {
    return createResponse(false, null, 'Gagal memuat data mahasiswa: ' + err.message);
  }
}
