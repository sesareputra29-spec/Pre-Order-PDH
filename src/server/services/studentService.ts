// Student / Mahasiswa Service Layer (Google Sheets Persistent)
import { google } from 'googleapis';
import { AuditService } from './auditService.ts';
import { GoogleSheetsService } from './googleSheetsService.ts';
import { GoogleAuthService } from './googleAuthService.ts';
import { getTenantById } from '../config/tenants.ts';

export interface StudentRecord {
  mahasiswa_id: string;
  tenant_id: string;
  user_id?: string;
  nama_lengkap: string;
  nim: string;
  kode_kelas: string;
  kelas: string;
  no_wa: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION';
  created_at: string;
  updated_at: string;
}

export class StudentService {
  private static studentsStore: Map<string, StudentRecord> = new Map();
  private static initializedTenants: Set<string> = new Set();
  private static lastLoadedAt: Map<string, number> = new Map();
  private static CACHE_TTL_MS = Number(process.env.CACHE_TTL_STUDENT_MS) || 10000;

  static invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.initializedTenants.delete(tenantId);
      this.lastLoadedAt.delete(tenantId);
      for (const [key, s] of this.studentsStore.entries()) {
        if (s.tenant_id === tenantId) this.studentsStore.delete(key);
      }
    } else {
      this.initializedTenants.clear();
      this.lastLoadedAt.clear();
      this.studentsStore.clear();
    }
  }

  private static async loadFromSheets(tenantId: string): Promise<boolean> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return false;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Students');
      const range = 'Students!A2:K';
      const rows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, range);
      if (!rows || rows.length === 0) {
        return false;
      }

      // Clear existing cached students for this tenant before reloading
      for (const [key, student] of this.studentsStore.entries()) {
        if (student.tenant_id === tenantId) {
          this.studentsStore.delete(key);
        }
      }

      for (const row of rows) {
        if (!row[0]) continue; // Skip empty rows
        const student: StudentRecord = {
          mahasiswa_id: String(row[0] || ''),
          tenant_id: String(row[1] || tenantId),
          user_id: row[2] ? String(row[2]) : undefined,
          nama_lengkap: String(row[3] || ''),
          nim: String(row[4] || ''),
          kode_kelas: String(row[5] || ''),
          kelas: String(row[6] || ''),
          no_wa: String(row[7] || ''),
          status: (row[8] || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
          created_at: String(row[9] || new Date().toISOString()),
          updated_at: String(row[10] || new Date().toISOString())
        };
        this.studentsStore.set(`${tenantId}:${student.mahasiswa_id}`, student);
      }
      return true;
    } catch (err: any) {
      console.warn(`[StudentService] Gagal memuat mahasiswa dari Google Sheets untuk tenant ${tenantId}:`, err.message || err);
      return false;
    }
  }

  private static async saveToSheets(tenantId: string): Promise<void> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Students');
      const tenantStudents = Array.from(this.studentsStore.values()).filter(s => s.tenant_id === tenantId);

      const headers = [
        'mahasiswa_id', 'tenant_id', 'user_id', 'nama_lengkap', 'nim', 'kode_kelas', 'kelas', 'no_wa', 'status', 'created_at', 'updated_at'
      ];
      const rows = tenantStudents.map(student => [
        student.mahasiswa_id,
        student.tenant_id,
        student.user_id || '',
        student.nama_lengkap,
        student.nim,
        student.kode_kelas,
        student.kelas,
        student.no_wa,
        student.status,
        student.created_at,
        student.updated_at
      ]);

      const values = [headers, ...rows];
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `Students!A1:K${values.length}`, values);
    } catch (err: any) {
      console.error(`[StudentService] Gagal menyimpan mahasiswa ke Google Sheets untuk tenant ${tenantId}:`, err.message || err);
    }
  }

  private static async initForTenant(tenantId: string, forceReload = false): Promise<void> {
    const lastLoaded = this.lastLoadedAt.get(tenantId) || 0;
    const isExpired = Date.now() - lastLoaded > this.CACHE_TTL_MS;

    if (!forceReload && this.initializedTenants.has(tenantId) && !isExpired) {
      return;
    }

    this.seedBaseline(tenantId);

    const loaded = await this.loadFromSheets(tenantId);
    if (!loaded) {
      if (!this.initializedTenants.has(tenantId)) {
        console.log(`[StudentService] Sheet 'Students' kosong atau gagal dibaca untuk tenant ${tenantId}. Mengunggah seed baseline ke Google Sheets...`);
        await this.saveToSheets(tenantId);
      }
    }

    this.lastLoadedAt.set(tenantId, Date.now());
    this.initializedTenants.add(tenantId);
  }

  private static seedBaseline(tenantId: string) {
    const now = new Date().toISOString();

    const baselineStudents: StudentRecord[] = [
      {
        mahasiswa_id: 'MHS-22MJSP001',
        tenant_id: tenantId,
        user_id: 'USR-MHS-01',
        nama_lengkap: 'Ahmad Mahasiswa',
        nim: '22MJSP001',
        kode_kelas: '22MJSP001',
        kelas: '22MJSP001',
        no_wa: '081234567890',
        status: 'ACTIVE',
        created_at: now,
        updated_at: now
      },
      {
        mahasiswa_id: 'MHS-22MJSP002',
        tenant_id: tenantId,
        user_id: 'USR-MHS-02',
        nama_lengkap: 'Budi Santoso',
        nim: '22MJSP002',
        kode_kelas: '22MJSP001',
        kelas: '22MJSP001',
        no_wa: '081298765432',
        status: 'ACTIVE',
        created_at: now,
        updated_at: now
      }
    ];

    for (const student of baselineStudents) {
      const key = `${tenantId}:${student.mahasiswa_id}`;
      if (!this.studentsStore.has(key)) {
        this.studentsStore.set(key, student);
      }
    }
  }

  static async listStudents(tenantId: string): Promise<StudentRecord[]> {
    await this.initForTenant(tenantId);
    const list: StudentRecord[] = [];
    for (const s of this.studentsStore.values()) {
      if (s.tenant_id === tenantId) {
        list.push({ ...s });
      }
    }
    return list;
  }

  static async getStudentById(tenantId: string, studentId: string): Promise<StudentRecord | null> {
    await this.initForTenant(tenantId);
    const student = this.studentsStore.get(`${tenantId}:${studentId}`);
    return student ? { ...student } : null;
  }

  static async getStudentByNim(tenantId: string, nim: string): Promise<StudentRecord | null> {
    await this.initForTenant(tenantId);
    const cleanNim = String(nim || '').trim().toLowerCase();
    for (const s of this.studentsStore.values()) {
      if (s.tenant_id === tenantId && s.nim.toLowerCase() === cleanNim) {
        return { ...s };
      }
    }
    return null;
  }

  static async createStudent(
    tenantId: string,
    data: {
      nama_lengkap: string;
      nim: string;
      kode_kelas: string;
      kelas?: string;
      no_wa?: string;
      user_id?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION';
    },
    performedByUserId?: string
  ): Promise<StudentRecord> {
    await this.initForTenant(tenantId);

    const existing = await this.getStudentByNim(tenantId, data.nim);
    if (existing) {
      throw new Error(`Mahasiswa dengan NIM '${data.nim}' sudah terdaftar.`);
    }

    const mahasiswaId = `MHS-${data.nim.trim().toUpperCase()}`;
    const now = new Date().toISOString();

    const newStudent: StudentRecord = {
      mahasiswa_id: mahasiswaId,
      tenant_id: tenantId,
      user_id: data.user_id,
      nama_lengkap: data.nama_lengkap.trim(),
      nim: data.nim.trim(),
      kode_kelas: data.kode_kelas.trim().toUpperCase(),
      kelas: data.kelas?.trim().toUpperCase() || data.kode_kelas.trim().toUpperCase(),
      no_wa: data.no_wa?.trim() || '',
      status: data.status || 'ACTIVE',
      created_at: now,
      updated_at: now
    };

    this.studentsStore.set(`${tenantId}:${mahasiswaId}`, newStudent);
    this.lastLoadedAt.set(tenantId, Date.now());
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'CREATE_STUDENT',
      `Mahasiswa ${newStudent.nim}`,
      `Menambahkan mahasiswa baru: ${newStudent.nama_lengkap} (${newStudent.kode_kelas})`
    );

    return { ...newStudent };
  }

  static async updateStudent(
    tenantId: string,
    studentId: string,
    data: Partial<{
      nama_lengkap: string;
      kode_kelas: string;
      kelas: string;
      no_wa: string;
      status: 'ACTIVE' | 'INACTIVE' | 'PENDING_VERIFICATION';
    }>,
    performedByUserId?: string
  ): Promise<StudentRecord> {
    await this.initForTenant(tenantId);

    const student = this.studentsStore.get(`${tenantId}:${studentId}`);
    if (!student) {
      throw new Error(`Mahasiswa dengan ID '${studentId}' tidak ditemukan.`);
    }

    if (data.nama_lengkap !== undefined) student.nama_lengkap = data.nama_lengkap.trim();
    if (data.kode_kelas !== undefined) student.kode_kelas = data.kode_kelas.trim().toUpperCase();
    if (data.kelas !== undefined) student.kelas = data.kelas.trim().toUpperCase();
    if (data.no_wa !== undefined) student.no_wa = data.no_wa.trim();
    if (data.status !== undefined) student.status = data.status;
    student.updated_at = new Date().toISOString();

    this.studentsStore.set(`${tenantId}:${studentId}`, student);
    this.lastLoadedAt.set(tenantId, Date.now());
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'UPDATE_STUDENT',
      `Mahasiswa ${student.nim}`,
      `Memperbarui data mahasiswa: ${student.nama_lengkap}`
    );

    return { ...student };
  }
}
