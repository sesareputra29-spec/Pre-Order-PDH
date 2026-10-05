// User Service Layer (Multi-tenant User Repository with Google Sheets Persistence)
import { google } from 'googleapis';
import { Role } from '../../types/index.ts';
import { hashPassword, verifyPassword, sanitizeUser } from '../utils/security.ts';
import { AuditService } from './auditService.ts';
import { GoogleSheetsService } from './googleSheetsService.ts';
import { GoogleAuthService } from './googleAuthService.ts';
import { getTenantById } from '../config/tenants.ts';

export interface UserRecord {
  user_id: string;
  tenant_id: string;
  username: string;
  password_hash: string;
  name: string;
  email: string;
  role: Role;
  nim?: string;
  className?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  created_at: string;
  updated_at: string;
}

export class UserService {
  // In-memory cache store
  private static usersStore: Map<string, UserRecord> = new Map();
  private static initializedTenants: Set<string> = new Set();
  private static lastLoadedAt: Map<string, number> = new Map();
  private static CACHE_TTL_MS = Number(process.env.CACHE_TTL_USER_MS) || 10000;

  static invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.initializedTenants.delete(tenantId);
      this.lastLoadedAt.delete(tenantId);
      for (const [key, u] of this.usersStore.entries()) {
        if (u.tenant_id === tenantId) this.usersStore.delete(key);
      }
    } else {
      this.initializedTenants.clear();
      this.lastLoadedAt.clear();
      this.usersStore.clear();
    }
  }

  /**
   * Loads users from Google Sheets for the specified tenant.
   */
  private static async loadFromSheets(tenantId: string): Promise<boolean> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return false;
    }
    try {
      const range = 'Users!A2:L';
      const rows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, range);
      if (!rows || rows.length === 0) {
        return false;
      }

      // Clear existing cached users for this tenant before reloading
      for (const [key, user] of this.usersStore.entries()) {
        if (user.tenant_id === tenantId) {
          this.usersStore.delete(key);
        }
      }

      for (const row of rows) {
        if (!row[0]) continue; // Skip empty rows
        const user: UserRecord = {
          user_id: String(row[0] || ''),
          tenant_id: String(row[1] || tenantId),
          username: String(row[2] || ''),
          password_hash: String(row[3] || ''),
          name: String(row[4] || ''),
          email: String(row[5] || ''),
          role: (row[6] || 'MAHASISWA') as Role,
          nim: row[7] ? String(row[7]) : undefined,
          className: row[8] ? String(row[8]) : undefined,
          status: (row[9] || 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
          created_at: String(row[10] || new Date().toISOString()),
          updated_at: String(row[11] || new Date().toISOString())
        };
        this.usersStore.set(`${tenantId}:${user.user_id}`, user);
      }
      return true;
    } catch (err: any) {
      console.warn(`[UserService] Gagal memuat user dari Google Sheets untuk tenant ${tenantId}:`, err.message || err);
      return false;
    }
  }

  /**
   * Saves users of the specified tenant back to Google Sheets.
   */
  private static async saveToSheets(tenantId: string): Promise<void> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return;
    }
    try {
      const tenantUsers = Array.from(this.usersStore.values()).filter(u => u.tenant_id === tenantId);

      const headers = [
        'user_id', 'tenant_id', 'username', 'password_hash', 'name', 'email', 'role', 'nim', 'className', 'status', 'created_at', 'updated_at'
      ];
      const rows = tenantUsers.map(user => [
        user.user_id,
        user.tenant_id,
        user.username,
        user.password_hash,
        user.name,
        user.email,
        user.role,
        user.nim || '',
        user.className || '',
        user.status,
        user.created_at,
        user.updated_at
      ]);

      const values = [headers, ...rows];

      try {
        await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `Users!A1:L${values.length}`, values);
      } catch (err: any) {
        const errMsg = String(err.message || '').toLowerCase();
        if (errMsg.includes('range') || errMsg.includes('not found') || errMsg.includes('parse')) {
          console.log(`[UserService] Sheet 'Users' tidak ditemukan untuk tenant ${tenantId}, mencoba membuat sheet baru...`);
          try {
            const auth = GoogleAuthService.getAuthClient();
            const sheets = google.sheets({ version: 'v4', auth });
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId: tenant.spreadsheet_id,
              requestBody: {
                requests: [
                  {
                    addSheet: {
                      properties: {
                        title: 'Users'
                      }
                    }
                  }
                ]
              }
            });
            // Retry update after creating sheet
            await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `Users!A1:L${values.length}`, values);
          } catch (createErr: any) {
            console.error(`[UserService] Gagal membuat sheet 'Users' untuk tenant ${tenantId}:`, createErr.message || createErr);
            throw err;
          }
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.error(`[UserService] Gagal menyimpan user ke Google Sheets untuk tenant ${tenantId}:`, err.message || err);
    }
  }

  /**
   * Initializes users for the specified tenant (with seeds if Sheets is empty).
   */
  private static async initForTenant(tenantId: string, forceReload = false): Promise<void> {
    const lastLoaded = this.lastLoadedAt.get(tenantId) || 0;
    const isExpired = Date.now() - lastLoaded > this.CACHE_TTL_MS;

    if (!forceReload && this.initializedTenants.has(tenantId) && !isExpired) {
      return;
    }

    // 1. Seed fallback in-memory first so we always have a baseline
    this.seedBaseline(tenantId);

    // 2. Try loading from Sheets
    const loaded = await this.loadFromSheets(tenantId);
    if (!loaded) {
      if (!this.initializedTenants.has(tenantId)) {
        // If unable to load from sheets (e.g. newly setup prodi, sheet missing/empty), write seeds to Sheets
        console.log(`[UserService] Sheet 'Users' kosong atau gagal dibaca untuk tenant ${tenantId}. Mengunggah seed baseline ke Google Sheets...`);
        await this.saveToSheets(tenantId);
      }
    }

    this.lastLoadedAt.set(tenantId, Date.now());
    this.initializedTenants.add(tenantId);
  }

  /**
   * Generates baseline fallback seed users in-memory.
   */
  private static seedBaseline(tenantId: string) {
    const now = new Date().toISOString();
    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
    const adminPasswordHash = hashPassword(adminPassword);

    const initialUsers: UserRecord[] = [
      {
        user_id: 'USR-ADMIN-01',
        tenant_id: tenantId,
        username: adminUsername,
        password_hash: adminPasswordHash,
        name: 'Administrator Panitia',
        email: 'admin.pdh@campus.ac.id',
        role: 'PANITIA',
        status: 'ACTIVE',
        created_at: now,
        updated_at: now
      },
      {
        user_id: 'USR-MHS-01',
        tenant_id: tenantId,
        username: 'mhs',
        password_hash: hashPassword('123'),
        name: 'Ahmad Mahasiswa',
        email: 'ahmad.mhs@campus.ac.id',
        role: 'MAHASISWA',
        nim: '22MJSP001',
        className: '22MJSP001',
        status: 'ACTIVE',
        created_at: now,
        updated_at: now
      },
      {
        user_id: 'USR-MHS-02',
        tenant_id: tenantId,
        username: '22MJSP002',
        password_hash: hashPassword('password123'),
        name: 'Budi Santoso',
        email: 'budi.santoso@campus.ac.id',
        role: 'MAHASISWA',
        nim: '22MJSP002',
        className: '22MJSP001',
        status: 'ACTIVE',
        created_at: now,
        updated_at: now
      }
    ];

    for (const user of initialUsers) {
      const key = `${tenantId}:${user.user_id}`;
      if (!this.usersStore.has(key)) {
        this.usersStore.set(key, user);
      }
    }
  }

  static async findById(tenantId: string, userId: string): Promise<UserRecord | null> {
    await this.initForTenant(tenantId);
    const user = this.usersStore.get(`${tenantId}:${userId}`);
    return user || null;
  }

  static async findByUsernameOrNim(tenantId: string, identifier: string): Promise<UserRecord | null> {
    await this.initForTenant(tenantId);
    const cleanId = String(identifier || '').trim().toLowerCase();
    if (!cleanId) return null;

    // 1. Prioritize exact username match
    for (const user of this.usersStore.values()) {
      if (user.tenant_id !== tenantId) continue;
      if (user.username.toLowerCase() === cleanId) {
        return user;
      }
    }

    // 2. Search by NIM
    for (const user of this.usersStore.values()) {
      if (user.tenant_id !== tenantId) continue;
      if (user.nim && user.nim.toLowerCase() === cleanId) {
        return user;
      }
    }

    // 3. Search by Email
    for (const user of this.usersStore.values()) {
      if (user.tenant_id !== tenantId) continue;
      if (user.email.toLowerCase() === cleanId) {
        return user;
      }
    }

    return null;
  }

  static async listUsers(tenantId: string): Promise<Omit<UserRecord, 'password_hash'>[]> {
    await this.initForTenant(tenantId);
    const result: Omit<UserRecord, 'password_hash'>[] = [];
    for (const user of this.usersStore.values()) {
      if (user.tenant_id === tenantId) {
        result.push(sanitizeUser(user));
      }
    }
    return result;
  }

  static async createUser(
    tenantId: string,
    data: {
      user_id?: string;
      username: string;
      password?: string;
      name: string;
      email: string;
      role: Role;
      nim?: string;
      className?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
    },
    performedByUserId?: string
  ): Promise<Omit<UserRecord, 'password_hash'>> {
    await this.initForTenant(tenantId);

    const existing = await this.findByUsernameOrNim(tenantId, data.username);
    if (existing) {
      throw new Error(`Username atau NIM '${data.username}' sudah terdaftar pada tenant ini.`);
    }

    const userId = data.user_id || `USR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    const rawPassword = data.password || 'password123';
    const passwordHash = hashPassword(rawPassword);

    const newUser: UserRecord = {
      user_id: userId,
      tenant_id: tenantId,
      username: data.username.trim(),
      password_hash: passwordHash,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role || 'MAHASISWA',
      nim: data.nim?.trim() || (data.role === 'MAHASISWA' ? data.username.trim() : undefined),
      className: data.className?.trim().toUpperCase(),
      status: data.status || 'ACTIVE',
      created_at: now,
      updated_at: now
    };

    this.usersStore.set(`${tenantId}:${userId}`, newUser);
    this.lastLoadedAt.set(tenantId, Date.now());
    await this.saveToSheets(tenantId);

    AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'CREATE_USER',
      `User ${newUser.username}`,
      `Membuat user baru: ${newUser.name} (${newUser.role})`
    );

    return sanitizeUser(newUser);
  }

  static async updateUser(
    tenantId: string,
    userId: string,
    data: Partial<{
      name: string;
      email: string;
      role: Role;
      nim: string;
      className: string;
      status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
      password?: string;
    }>,
    performedByUserId?: string
  ): Promise<Omit<UserRecord, 'password_hash'>> {
    await this.initForTenant(tenantId);

    const user = await this.findById(tenantId, userId);
    if (!user) {
      throw new Error(`User '${userId}' tidak ditemukan.`);
    }

    if (data.name !== undefined) user.name = data.name.trim();
    if (data.email !== undefined) user.email = data.email.trim().toLowerCase();
    if (data.role !== undefined) user.role = data.role;
    if (data.nim !== undefined) user.nim = data.nim.trim();
    if (data.className !== undefined) user.className = data.className.trim().toUpperCase();
    if (data.status !== undefined) user.status = data.status;
    if (data.password) {
      user.password_hash = hashPassword(data.password);
    }
    user.updated_at = new Date().toISOString();

    this.usersStore.set(`${tenantId}:${userId}`, user);
    this.lastLoadedAt.set(tenantId, Date.now());
    await this.saveToSheets(tenantId);

    AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'UPDATE_USER',
      `User ${user.username}`,
      `Memperbarui profil user ${user.name}`
    );

    return sanitizeUser(user);
  }

  static async deleteUser(tenantId: string, userId: string, performedByUserId?: string): Promise<boolean> {
    await this.initForTenant(tenantId);

    const user = await this.findById(tenantId, userId);
    if (!user) {
      throw new Error(`User '${userId}' tidak ditemukan.`);
    }

    if (user.username === 'admin') {
      throw new Error('Akun super administrator sistem tidak dapat dihapus.');
    }

    this.usersStore.delete(`${tenantId}:${userId}`);
    this.lastLoadedAt.set(tenantId, Date.now());
    await this.saveToSheets(tenantId);

    AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'DELETE_USER',
      `User ${user.username}`,
      `Menghapus user: ${user.name}`
    );

    return true;
  }

  static async changePassword(
    tenantId: string,
    userId: string,
    oldPass: string,
    newPass: string
  ): Promise<boolean> {
    await this.initForTenant(tenantId);

    const user = await this.findById(tenantId, userId);
    if (!user) {
      throw new Error('User tidak ditemukan.');
    }

    if (!verifyPassword(oldPass, user.password_hash)) {
      throw new Error('Password lama tidak sesuai.');
    }

    if (!newPass || newPass.length < 4) {
      throw new Error('Password baru minimal 4 karakter.');
    }

    user.password_hash = hashPassword(newPass);
    user.updated_at = new Date().toISOString();
    this.usersStore.set(`${tenantId}:${userId}`, user);
    this.lastLoadedAt.set(tenantId, Date.now());
    await this.saveToSheets(tenantId);

    AuditService.logEvent(
      tenantId,
      userId,
      'CHANGE_PASSWORD',
      `User ${user.username}`,
      'User berhasil mengubah kata sandi'
    );

    return true;
  }

  /**
   * Checks if the tenant currently has any active PANITIA admin.
   */
  static async hasActiveAdmin(tenantId: string): Promise<boolean> {
    await this.initForTenant(tenantId);
    for (const user of this.usersStore.values()) {
      if (user.tenant_id === tenantId && user.role === 'PANITIA' && user.status === 'ACTIVE') {
        return true;
      }
    }
    return false;
  }

  /**
   * Creates the initial PANITIA administrator for a new tenant.
   * Rejects if an active PANITIA already exists (Setup Lock).
   */
  static async setupInitialAdmin(
    tenantId: string,
    payload: {
      name: string;
      email: string;
      password: string;
      username?: string;
    }
  ): Promise<Omit<UserRecord, 'password_hash'>> {
    await this.initForTenant(tenantId);

    const alreadyHasAdmin = await this.hasActiveAdmin(tenantId);
    if (alreadyHasAdmin) {
      throw new Error('Setup awal Panitia sudah selesai untuk tenant ini. Penambahan akun Panitia berikutnya hanya dapat dilakukan melalui menu Manajemen Pengguna.');
    }

    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '').trim();
    const username = String(payload.username || email.split('@')[0] || 'admin').trim().toLowerCase();

    if (!name || !email || !password) {
      throw new Error('Nama lengkap, email, dan kata sandi wajib diisi.');
    }

    if (password.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Format email tidak valid.');
    }

    // Check if username/email already taken in tenant
    const existingUsername = await this.findByUsernameOrNim(tenantId, username);
    if (existingUsername) {
      throw new Error(`Username '${username}' sudah terdaftar pada tenant ini.`);
    }

    const existingEmail = await this.findByUsernameOrNim(tenantId, email);
    if (existingEmail) {
      throw new Error(`Email '${email}' sudah terdaftar pada tenant ini.`);
    }

    const userId = `USR-ADMIN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    const newAdmin: UserRecord = {
      user_id: userId,
      tenant_id: tenantId,
      username,
      password_hash: passwordHash,
      name,
      email,
      role: 'PANITIA',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    };

    this.usersStore.set(`${tenantId}:${userId}`, newAdmin);
    this.lastLoadedAt.set(tenantId, Date.now());
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      userId,
      'INITIAL_ADMIN_SETUP',
      `User Panitia ${name}`,
      `Pembuatan akun Panitia utama pertama kali untuk tenant ${tenantId} (${email})`
    );

    return sanitizeUser(newAdmin);
  }
}
