// Authentication Service Layer (Google Sheets Persistent Tokens & Verification)
import crypto from 'crypto';
import { UserService, UserRecord } from './userService.ts';
import { StudentService } from './studentService.ts';
import { verifyPassword, hashPassword, generateAuthToken, sanitizeUser } from '../utils/security.ts';
import { AuditService } from './auditService.ts';
import { GoogleSheetsService } from './googleSheetsService.ts';
import { GoogleAuthService } from './googleAuthService.ts';
import { getTenantById } from '../config/tenants.ts';
import { EmailService } from './emailService.ts';

export interface LoginResult {
  user: Omit<UserRecord, 'password_hash'>;
  token: string;
  expires_in: number;
}

export type TokenType = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

export interface AuthTokenRecord {
  token_id: string;
  user_id: string;
  tenant_id: string;
  token_hash: string;
  token_type: TokenType;
  expires_at: string;
  used_at: string; // ISO string if used, '' if unused
  created_at: string;
}

export class AuthService {
  // In-memory cache for fast lookup within a request
  private static tokensCache: Map<string, AuthTokenRecord> = new Map();
  private static initializedTenants: Set<string> = new Set();
  private static lastLoadedAt: Map<string, number> = new Map();
  private static CACHE_TTL_MS = Number(process.env.CACHE_TTL_AUTH_MS) || 5000;

  static invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.initializedTenants.delete(tenantId);
      this.lastLoadedAt.delete(tenantId);
      for (const [key, t] of this.tokensCache.entries()) {
        if (t.tenant_id === tenantId) this.tokensCache.delete(key);
      }
    } else {
      this.initializedTenants.clear();
      this.lastLoadedAt.clear();
      this.tokensCache.clear();
    }
  }

  /**
   * Hashes a raw token string using SHA-256 for secure storage.
   */
  private static hashToken(token: string): string {
    if (!token) return '';
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Loads tokens from Google Sheets for the specified tenant.
   */
  private static async loadTokensFromSheets(tenantId: string): Promise<boolean> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return false;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Tokens');
      const range = 'Tokens!A2:H';
      const rows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, range);

      // Clear tokens for this tenant in local cache before reloading
      for (const [key, t] of this.tokensCache.entries()) {
        if (t.tenant_id === tenantId) {
          this.tokensCache.delete(key);
        }
      }

      if (rows && rows.length > 0) {
        for (const row of rows) {
          if (!row[0]) continue;
          const rec: AuthTokenRecord = {
            token_id: String(row[0] || ''),
            user_id: String(row[1] || ''),
            tenant_id: String(row[2] || tenantId),
            token_hash: String(row[3] || ''),
            token_type: (row[4] || 'EMAIL_VERIFICATION') as TokenType,
            expires_at: String(row[5] || ''),
            used_at: row[6] ? String(row[6]) : '',
            created_at: String(row[7] || new Date().toISOString())
          };
          this.tokensCache.set(`${tenantId}:${rec.token_hash}`, rec);
        }
      }
      return true;
    } catch (err: any) {
      console.warn(`[AuthService] Gagal memuat tokens dari Google Sheets untuk tenant ${tenantId}:`, err.message || err);
      return false;
    }
  }

  /**
   * Saves tokens of the specified tenant back to Google Sheets.
   */
  private static async saveTokensToSheets(tenantId: string): Promise<void> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Tokens');
      const tenantTokens = Array.from(this.tokensCache.values()).filter(t => t.tenant_id === tenantId);

      const headers = [
        'token_id', 'user_id', 'tenant_id', 'token_hash', 'token_type', 'expires_at', 'used_at', 'created_at'
      ];
      const rows = tenantTokens.map(t => [
        t.token_id,
        t.user_id,
        t.tenant_id,
        t.token_hash,
        t.token_type,
        t.expires_at,
        t.used_at || '',
        t.created_at
      ]);

      const values = [headers, ...rows];
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `Tokens!A1:H${values.length}`, values);
    } catch (err: any) {
      console.error(`[AuthService] Gagal menyimpan tokens ke Google Sheets untuk tenant ${tenantId}:`, err.message || err);
    }
  }

  /**
   * Ensures tokens are loaded for the tenant (ensures cross-instance serverless sync).
   */
  private static async initForTenant(tenantId: string, forceReload = false): Promise<void> {
    const lastLoaded = this.lastLoadedAt.get(tenantId) || 0;
    const isExpired = Date.now() - lastLoaded > this.CACHE_TTL_MS;

    if (!forceReload && this.initializedTenants.has(tenantId) && !isExpired) {
      return;
    }

    await this.loadTokensFromSheets(tenantId);
    this.lastLoadedAt.set(tenantId, Date.now());
    this.initializedTenants.add(tenantId);
  }

  /**
   * Performs user login with tenant isolation & PENDING_VERIFICATION check.
   */
  static async login(
    tenantId: string,
    identifier: string,
    password: string
  ): Promise<LoginResult> {
    if (!identifier || !password) {
      throw new Error('Username/NIM dan password wajib diisi.');
    }

    const user = await UserService.findByUsernameOrNim(tenantId, identifier);

    if (!user) {
      throw new Error('Username, NIM, atau kata sandi tidak sesuai.');
    }

    if (user.status === 'PENDING_VERIFICATION') {
      throw new Error('Akun Anda belum diverifikasi. Silakan periksa email Anda untuk memverifikasi akun.');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error(`Akun Anda tidak aktif (status: ${user.status}). Silakan hubungi Panitia.`);
    }

    const isPasswordValid = verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Username, NIM, atau kata sandi tidak sesuai.');
    }

    // Generate 7 days valid signed token
    const expiresIn = 7 * 24 * 60 * 60;
    const token = generateAuthToken(user, tenantId, expiresIn);

    // Audit log
    await AuditService.logEvent(
      tenantId,
      user.user_id,
      'LOGIN',
      `Auth ${user.username}`,
      `User ${user.name} (${user.role}) berhasil masuk ke sistem`
    );

    return {
      user: sanitizeUser(user),
      token,
      expires_in: expiresIn
    };
  }

  /**
   * Registers a new student account with PENDING_VERIFICATION status.
   */
  static async registerStudent(
    tenantId: string,
    payload: {
      nim: string;
      name: string;
      className: string;
      email: string;
      password: string;
    }
  ): Promise<{
    userId: string;
    email: string;
    verificationToken: string;
    verificationLink: string;
  }> {
    const nim = String(payload.nim || '').trim();
    const name = String(payload.name || '').trim();
    const className = String(payload.className || '').trim().toUpperCase();
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '').trim();

    if (!nim || !name || !className || !email || !password) {
      throw new Error('Seluruh field (NIM, Nama Lengkap, Kelas, Email Pribadi, Password) wajib diisi.');
    }

    const classRegex = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;
    if (!classRegex.test(className)) {
      throw new Error('Format Kelas tidak valid! Harus berformat ##MJSP###, ##MJSM###, atau ##MJSE### (Contoh: 01MJSP001).');
    }

    const existingUsers = await UserService.listUsers(tenantId);
    if (existingUsers.some(u => (u.nim || u.username).toLowerCase() === nim.toLowerCase())) {
      throw new Error(`NIM ${nim} sudah terdaftar sebagai akun mahasiswa.`);
    }
    if (existingUsers.some(u => (u.email || '').toLowerCase() === email)) {
      throw new Error(`Email ${email} sudah digunakan oleh akun lain.`);
    }

    const userId = `USR-MHS-${nim}`;
    const now = new Date().toISOString();

    // Create user in UserService with status PENDING_VERIFICATION
    const createdUser = await UserService.createUser(
      tenantId,
      {
        user_id: userId,
        username: nim,
        password: password,
        name: name,
        email: email,
        role: 'MAHASISWA',
        nim: nim,
        className: className,
        status: 'PENDING_VERIFICATION'
      },
      'SYSTEM'
    );

    // Create student in StudentService with status PENDING_VERIFICATION
    try {
      await StudentService.createStudent(
        tenantId,
        {
          nama_lengkap: name,
          nim: nim,
          kode_kelas: className,
          kelas: className,
          no_wa: '',
          user_id: userId,
          status: 'PENDING_VERIFICATION'
        },
        userId
      );
    } catch {
      // Student record may already exist
    }

    await this.initForTenant(tenantId);

    // Generate Verification Token & Hash
    const vToken = `VRF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const tokenHash = this.hashToken(vToken);
    const tokenId = `TKN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const tokenRecord: AuthTokenRecord = {
      token_id: tokenId,
      user_id: userId,
      tenant_id: tenantId,
      token_hash: tokenHash,
      token_type: 'EMAIL_VERIFICATION',
      expires_at: expiresAt,
      used_at: '',
      created_at: now
    };

    this.tokensCache.set(`${tenantId}:${tokenHash}`, tokenRecord);
    await this.saveTokensToSheets(tenantId);

    const verifyLink = `/?verify_token=${vToken}`;

    await AuditService.logEvent(
      tenantId,
      userId,
      'REGISTER_STUDENT',
      `Mahasiswa ${name}`,
      `Registrasi mahasiswa baru NIM ${nim} (${name}) status PENDING_VERIFICATION`
    );

    // Dispatch verification email to student
    try {
      await EmailService.sendVerificationEmail({
        tenantId,
        email,
        name,
        verificationToken: vToken
      });
    } catch (emailErr: any) {
      console.warn(`[AuthService] Peringatan: Email verifikasi gagal dikirim, tetapi akun tetap tersimpan sebagai PENDING_VERIFICATION.`, emailErr.message || emailErr);
    }

    return {
      userId,
      email,
      verificationToken: vToken,
      verificationLink: verifyLink
    };
  }

  /**
   * Verifies an account token and activates user status to ACTIVE.
   */
  static async verifyAccountToken(tenantId: string, token: string): Promise<{ userId: string; nim?: string }> {
    if (!token) throw new Error('Token verifikasi wajib disertakan.');

    await this.initForTenant(tenantId);

    const tokenHash = this.hashToken(token);
    const tokenRecord = this.tokensCache.get(`${tenantId}:${tokenHash}`);

    if (!tokenRecord || tokenRecord.token_type !== 'EMAIL_VERIFICATION') {
      throw new Error('Token verifikasi tidak ditemukan atau tidak valid.');
    }

    if (tokenRecord.tenant_id !== tenantId) {
      throw new Error('Token verifikasi tidak sesuai dengan tenant yang diminta.');
    }

    if (tokenRecord.used_at) {
      throw new Error('Token verifikasi ini sudah pernah digunakan.');
    }

    if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
      throw new Error('Token verifikasi telah kedaluwarsa. Silakan lakukan registrasi ulang.');
    }

    // Mark token as used
    const now = new Date().toISOString();
    tokenRecord.used_at = now;
    this.tokensCache.set(`${tenantId}:${tokenHash}`, tokenRecord);
    await this.saveTokensToSheets(tenantId);

    // Update user & student status to ACTIVE
    const user = await UserService.findById(tenantId, tokenRecord.user_id);
    if (!user) {
      throw new Error('Akun pengguna tidak ditemukan.');
    }

    await UserService.updateUser(tenantId, user.user_id, { status: 'ACTIVE' }, 'SYSTEM');

    try {
      const student = await StudentService.getStudentByNim(tenantId, user.nim || user.username);
      if (student) {
        await StudentService.updateStudent(tenantId, student.mahasiswa_id, { status: 'ACTIVE' }, 'SYSTEM');
      }
    } catch {
      // Ignore if student record update fails
    }

    await AuditService.logEvent(
      tenantId,
      user.user_id,
      'VERIFY_ACCOUNT',
      `Akun ${user.username}`,
      `Akun ${user.name} berhasil diverifikasi melalui token dan diaktifkan`
    );

    return {
      userId: user.user_id,
      nim: user.nim
    };
  }

  /**
   * Generates a password reset link and persists hashed token to Google Sheets.
   */
  static async sendPasswordResetLink(tenantId: string, nim: string): Promise<{ resetToken: string; resetLink: string } | null> {
    const targetNim = nim.trim().toLowerCase();
    const user = await UserService.findByUsernameOrNim(tenantId, targetNim);

    if (!user) {
      return null;
    }

    await this.initForTenant(tenantId);

    const rToken = `RST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const tokenHash = this.hashToken(rToken);
    const tokenId = `TKN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours

    const tokenRecord: AuthTokenRecord = {
      token_id: tokenId,
      user_id: user.user_id,
      tenant_id: tenantId,
      token_hash: tokenHash,
      token_type: 'PASSWORD_RESET',
      expires_at: expiresAt,
      used_at: '',
      created_at: now
    };

    this.tokensCache.set(`${tenantId}:${tokenHash}`, tokenRecord);
    await this.saveTokensToSheets(tenantId);

    const resetLink = `/?reset_token=${rToken}`;

    await AuditService.logEvent(
      tenantId,
      user.user_id,
      'REQUEST_PASSWORD_RESET',
      `User ${user.username}`,
      `Permintaan tautan reset password untuk NIM ${user.nim}`
    );

    // Dispatch password reset email to student
    try {
      await EmailService.sendPasswordResetEmail({
        tenantId,
        email: user.email,
        name: user.name,
        resetToken: rToken
      });
    } catch (emailErr: any) {
      console.warn(`[AuthService] Peringatan: Email reset password gagal dikirim, tetapi token reset tetap aktif.`, emailErr.message || emailErr);
    }

    return {
      resetToken: rToken,
      resetLink
    };
  }

  /**
   * Resets password using valid token from Tokens sheet.
   */
  static async resetPasswordWithToken(tenantId: string, token: string, newPass: string): Promise<boolean> {
    if (!token) throw new Error('Token reset password wajib diberikan.');
    if (!newPass || newPass.length < 3) throw new Error('Password baru minimal terdiri dari 3 karakter.');

    await this.initForTenant(tenantId);

    const tokenHash = this.hashToken(token);
    const tokenRecord = this.tokensCache.get(`${tenantId}:${tokenHash}`);

    if (!tokenRecord || tokenRecord.token_type !== 'PASSWORD_RESET') {
      throw new Error('Token reset password tidak ditemukan atau tidak valid.');
    }

    if (tokenRecord.tenant_id !== tenantId) {
      throw new Error('Token reset password tidak sesuai dengan tenant yang diminta.');
    }

    if (tokenRecord.used_at) {
      throw new Error('Token reset password ini sudah pernah digunakan.');
    }

    if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
      throw new Error('Token reset password telah kedaluwarsa. Silakan ajukan reset password baru.');
    }

    // Mark token as used
    const now = new Date().toISOString();
    tokenRecord.used_at = now;
    this.tokensCache.set(`${tenantId}:${tokenHash}`, tokenRecord);
    await this.saveTokensToSheets(tenantId);

    const user = await UserService.findById(tenantId, tokenRecord.user_id);
    if (!user) {
      throw new Error('Akun pengguna tidak ditemukan.');
    }

    await UserService.updateUser(
      tenantId,
      user.user_id,
      { password: newPass },
      user.user_id
    );

    await AuditService.logEvent(
      tenantId,
      user.user_id,
      'RESET_PASSWORD',
      `User ${user.username}`,
      `Password berhasil direset menggunakan tautan token reset`
    );

    return true;
  }

  /**
   * Logs out user.
   */
  static async logout(tenantId: string, userId: string): Promise<boolean> {
    await AuditService.logEvent(
      tenantId,
      userId,
      'LOGOUT',
      'Auth Session',
      `User ${userId} berhasil keluar dari sesi`
    );
    return true;
  }

  /**
   * Checks if tenant setup is completed (has active PANITIA admin).
   */
  static async getSetupStatus(tenantId: string): Promise<{ hasActiveAdmin: boolean; isSetupNeeded: boolean }> {
    const hasAdmin = await UserService.hasActiveAdmin(tenantId);
    return {
      hasActiveAdmin: hasAdmin,
      isSetupNeeded: !hasAdmin
    };
  }

  /**
   * Sets up the initial PANITIA admin for a new tenant.
   */
  static async setupInitialAdmin(
    tenantId: string,
    payload: {
      name: string;
      email: string;
      password: string;
      username?: string;
    }
  ) {
    return UserService.setupInitialAdmin(tenantId, payload);
  }
}
