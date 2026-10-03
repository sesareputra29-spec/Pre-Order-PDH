/**
 * PDH CAMPUS ORDER - Google Apps Script RPC Bridge
 * 
 * Provides unified interface for google.script.run.
 * When running in AI Studio preview, provides a full fidelity simulator matching Code.gs
 */

import { ApiResponse, User, DriveFolderStructure, AuditLogEntry, NotificationRecord, SystemConfig, PDHMasterData, PDHInfo, PDHPricing, PDHSize, PDHImage, PDHPaymentInfo, POPeriod, POMode, POStatus, ProductionStatus, ProductionProgressEntry, PickupStatus, PickupInfoSettings, TrackOrderResult } from '../types';

// Check if running inside real Google Apps Script iframe
export const isNativeGAS = typeof window !== 'undefined' && 
  (window as any).google && 
  (window as any).google.script && 
  (window as any).google.script.run;

// Local persistent state for AI Studio preview mode
const STORAGE_KEYS = {
  USERS: 'pdh_gas_sim_users',
  SETTINGS: 'pdh_gas_sim_settings',
  AUDIT_LOGS: 'pdh_gas_sim_audit_logs',
  DRIVE_FOLDERS: 'pdh_gas_sim_drive_folders',
  SPREADSHEET_ID: 'pdh_gas_sim_ss_id',
  PDH_MASTER: 'pdh_gas_sim_master',
  PO_PERIODS: 'pdh_gas_sim_po_periods',
  NOTIFICATIONS: 'pdh_gas_sim_notifications'
};

const DEFAULT_PO_PERIOD: POPeriod = {
  period_id: 'PO-2026-GEL1',
  name: 'PO PDH Angkatan 2026/2027 Gelombang 1',
  start_date: new Date().toISOString().split('T')[0],
  start_time: '08:00',
  end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  end_time: '23:59',
  mode: 'MANUAL',
  status: 'OPEN',
  manual_override: false,
  target_quota: 500,
  notes: 'Pre-Order resmi PDH Kampus Gelombang 1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

function getSimPOPeriods(): POPeriod[] {
  const data = localStorage.getItem(STORAGE_KEYS.PO_PERIODS);
  if (data) {
    try { return JSON.parse(data); } catch(e) {}
  }
  const seed = [DEFAULT_PO_PERIOD];
  localStorage.setItem(STORAGE_KEYS.PO_PERIODS, JSON.stringify(seed));
  return seed;
}

function saveSimPOPeriods(periods: POPeriod[]) {
  localStorage.setItem(STORAGE_KEYS.PO_PERIODS, JSON.stringify(periods));
}

function getSimNotifications(): NotificationRecord[] {
  const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch(e) {}
  }
  return [];
}

function saveSimNotifications(notifs: NotificationRecord[]) {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
}

function addSimNotification(nim: string, orderId: string | undefined, type: string, title: string, message: string, sendEmail: boolean = false): NotificationRecord {
  const notifs = getSimNotifications();
  // Check duplicate prevention for same event on same order
  if (orderId && type) {
    const existingSame = notifs.find((n) => n.nim === nim && n.order_id === orderId && n.type === type);
    if (existingSame) {
      // Avoid duplicate notification for same event/order
      return existingSame;
    }
  }

  const notifId = `NTF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const newNotif: NotificationRecord = {
    notification_id: notifId,
    nim: String(nim || '').trim(),
    order_id: orderId || '',
    type,
    title,
    message,
    read_status: false,
    created_at: new Date().toISOString(),
    email_sent: sendEmail
  };

  notifs.unshift(newNotif);
  saveSimNotifications(notifs);
  return newNotif;
}

function evaluateSimPOStatus(p: POPeriod): 'OPEN' | 'CLOSED' {
  if (!p) return 'CLOSED';
  if (p.mode === 'MANUAL' || p.manual_override) {
    return p.status === 'OPEN' ? 'OPEN' : 'CLOSED';
  }
  try {
    const now = new Date();
    const startStr = `${p.start_date}T${p.start_time || '00:00'}:00+07:00`;
    const endStr = `${p.end_date}T${p.end_time || '23:59'}:59+07:00`;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (now >= start && now <= end) return 'OPEN';
  } catch(e) {}
  return 'CLOSED';
}


const DEFAULT_PDH_MASTER: PDHMasterData = {
  info: {
    pdhName: 'Pakaian Dinas Harian (PDH) Kampus 2026',
    pdhYear: '2026/2027',
    pdhDescription: 'Seragam resmi PDH Kampus berkualitas tinggi dengan bahan American Drill premium dan bordir kustom nama.',
    pdhSpec: 'Lengan Panjang, Kerah Kemeja, 2 Saku Depan dengan Penutup, Bordir Logo Kampus & Bordir Nama Kustom',
    pdhMaterial: 'American Drill Premium (Dingin, Menyerap Keringat, Awet)',
    pdhModel: 'Unisex (Slim Fit & Reguler)',
    pdhColor: 'Navy Blue / Biru Dongker dengan Aksentuasi Abu-Abu',
    pdhTerms: '1. Wajib melunasi pembayaran sesuai jadwal.\n2. Nama bordir kustom maksimal 18 karakter.\n3. Ukuran tidak dapat diubah setelah batas akhir PO.',
    pdhContact: 'WhatsApp Panitia: 0812-3456-7890 (Humas PDH)'
  },
  pricing: {
    price: 185000,
    active: true,
    notes: 'Harga termasuk bordir nama & logo resmi kampus.'
  },
  sizes: [
    { size_id: 'SZ-01', size_code: 'S', size_name: 'Small (S)', chest_width: '48 cm', body_length: '65 cm', sleeve_length: '56 cm', extra_fee: 0, status: 'ACTIVE', notes: 'Ukuran Standar' },
    { size_id: 'SZ-02', size_code: 'M', size_name: 'Medium (M)', chest_width: '51 cm', body_length: '68 cm', sleeve_length: '58 cm', extra_fee: 0, status: 'ACTIVE', notes: 'Ukuran Standar' },
    { size_id: 'SZ-03', size_code: 'L', size_name: 'Large (L)', chest_width: '54 cm', body_length: '71 cm', sleeve_length: '60 cm', extra_fee: 0, status: 'ACTIVE', notes: 'Ukuran Standar' },
    { size_id: 'SZ-04', size_code: 'XL', size_name: 'Extra Large (XL)', chest_width: '57 cm', body_length: '74 cm', sleeve_length: '62 cm', extra_fee: 5000, status: 'ACTIVE', notes: 'Biaya tambahan +Rp 5.000' },
    { size_id: 'SZ-05', size_code: 'XXL', size_name: 'Double XL (XXL)', chest_width: '60 cm', body_length: '77 cm', sleeve_length: '64 cm', extra_fee: 10000, status: 'ACTIVE', notes: 'Biaya tambahan +Rp 10.000' }
  ],
  images: [
    {
      image_id: 'IMG-01',
      drive_file_id: 'DRV-FILE-PDH-DEFAULT',
      file_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
      file_name: 'Desain_Utama_PDH_2026.jpg',
      is_primary: true,
      uploaded_at: new Date().toISOString()
    }
  ],
  payment: {
    method: 'Transfer Bank / QRIS',
    bankName: 'Bank Mandiri',
    accountNumber: '137-00-1234567-8',
    accountHolder: 'Panitia PDH Kampus 2026',
    instructions: 'Sertakan Kode Unik Pesanan pada berita transfer dan simpan bukti transfer untuk diunggah.'
  }
};

function getSimPDHMaster(): PDHMasterData {
  const data = localStorage.getItem(STORAGE_KEYS.PDH_MASTER);
  if (data) {
    try { return JSON.parse(data); } catch(e) {}
  }
  localStorage.setItem(STORAGE_KEYS.PDH_MASTER, JSON.stringify(DEFAULT_PDH_MASTER));
  return DEFAULT_PDH_MASTER;
}

function saveSimPDHMaster(master: PDHMasterData) {
  localStorage.setItem(STORAGE_KEYS.PDH_MASTER, JSON.stringify(master));
}

function getSimOrders(): any[] {
  const data = localStorage.getItem('pdh_gas_sim_orders');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Strip out old mock sample order if present
        const clean = parsed.filter((o) => o.order_id !== 'ORD-SAMPLE-01');
        return clean;
      }
    } catch(e) {}
  }
  return [];
}

function saveSimOrders(orders: any[]) {
  try {
    localStorage.setItem('pdh_gas_sim_orders', JSON.stringify(orders));
  } catch (e) {
    console.warn('localStorage quota exceeded in saveSimOrders. Stripping large images...', e);
    const cleanOrders = orders.map((o) => {
      const clone = { ...o };
      if (clone.production_photo_url && clone.production_photo_url.length > 50000) {
        clone.production_photo_url = 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80';
      }
      if (Array.isArray(clone.production_history)) {
        clone.production_history = clone.production_history.map((h: any) => ({
          ...h,
          photo_url: h.photo_url && h.photo_url.length > 50000 ? 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80' : h.photo_url
        }));
      }
      return clone;
    });
    try {
      localStorage.setItem('pdh_gas_sim_orders', JSON.stringify(cleanOrders));
    } catch (err) {
      console.error('Failed to save sim orders even after stripping images:', err);
    }
  }
}

function getSimTokens(): any[] {
  const data = localStorage.getItem('pdh_gas_sim_tokens');
  return data ? JSON.parse(data) : [];
}

function saveSimTokens(tokens: any[]) {
  localStorage.setItem('pdh_gas_sim_tokens', JSON.stringify(tokens));
}

function hashSimPassword(pass: string): string {
  if (!pass) return '';
  let hash = 0;
  for (let i = 0; i < pass.length; i++) {
    hash = (hash << 5) - hash + pass.charCodeAt(i);
    hash |= 0;
  }
  return `HASH-${Math.abs(hash).toString(36)}`;
}

function getSimResetTokens(): any[] {
  const data = localStorage.getItem('pdh_gas_sim_reset_tokens');
  return data ? JSON.parse(data) : [];
}

function saveSimResetTokens(tokens: any[]) {
  localStorage.setItem('pdh_gas_sim_reset_tokens', JSON.stringify(tokens));
}

function getSimPickupSettings(): PickupInfoSettings {
  const data = localStorage.getItem('pdh_gas_sim_pickup_settings');
  if (data) return JSON.parse(data);

  const defaultSettings: PickupInfoSettings = {
    status: 'Belum Siap Diambil',
    location: 'Gedung Kemahasiswaan Lantai 1 (Sekre Ormawa)',
    fullAddress: 'Jl. Kampus Utama No. 1, Ruang 102 (Samping Perpustakaan)',
    startDate: '2026-10-15',
    endDate: '2026-10-22',
    pickupHours: '09:00 - 16:00 WIB',
    contactPerson: '0812-3456-7890 (Panitia Logistik PDH)',
    instructions: '1. Wajib menunjukkan Kartu Tanda Mahasiswa (KTM) asli / Bukti Identitas.\n2. Wajib menunjukkan nomor pesanan atau bukti pembayaran lunas.\n3. Pengambilan kolektif diwakilkan oleh Ketua/Penanggung Jawab Kelas.',
    additionalNotes: 'Harap mengambil pesanan sesuai jadwal jam operasional yang ditentukan.'
  };

  localStorage.setItem('pdh_gas_sim_pickup_settings', JSON.stringify(defaultSettings));
  return defaultSettings;
}

function saveSimPickupSettings(settings: PickupInfoSettings) {
  localStorage.setItem('pdh_gas_sim_pickup_settings', JSON.stringify(settings));
}


function getSimUsers() {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  if (data) return JSON.parse(data);
  const now = new Date().toISOString();
  const seed = [
    {
      user_id: 'USR-ADMIN-01',
      username: 'admin',
      password_hash: '123',
      name: 'Administrator Panitia',
      email: 'admin.pdh@campus.ac.id',
      role: 'PANITIA',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      user_id: 'USR-MHS-01',
      username: 'mhs',
      password_hash: '123',
      name: 'Ahmad Mahasiswa',
      email: 'ahmad.mhs@campus.ac.id',
      role: 'MAHASISWA',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    }
  ];
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(seed));
  return seed;
}

function getSimAuditLogs(): AuditLogEntry[] {
  const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch(e) {}
  }
  return [];
}

function addSimAuditLog(userId: string, action: string, entity: string, details: string) {
  const logs = getSimAuditLogs();
  const newLog: AuditLogEntry = {
    log_id: `LOG-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    user_id: userId || 'SYSTEM',
    action,
    entity,
    details
  };
  logs.unshift(newLog);
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 100)));
}

/**
 * Execute GAS function either natively via google.script.run or via local GAS simulator
 */
export function callGAS<T = any>(funcName: string, ...args: any[]): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    // 1. Native Google Apps Script execution
    if (isNativeGAS) {
      const runner = (window as any).google.script.run
        .withSuccessHandler((res: ApiResponse<T>) => resolve(res))
        .withFailureHandler((err: any) => resolve({
          success: false,
          data: null,
          message: err?.message || 'Error executing Google Apps Script backend function',
          timestamp: new Date().toISOString()
        }));

      if (typeof runner[funcName] === 'function') {
        runner[funcName](...args);
        return;
      }
    }

    // 2. High fidelity GAS Simulator execution (AI Studio preview environment)
    setTimeout(() => {
      try {
        switch (funcName) {
          case 'sendOTP': {
            const email = String(args[0] || '').trim().toLowerCase();
            if (!email) {
              resolve({ success: false, data: null, message: 'Email pribadi wajib diisi.', timestamp: new Date().toISOString() });
              return;
            }
            resolve({
              success: true,
              data: { email: email, otpCode: '123456' } as any,
              message: `Kode OTP verifikasi 6-digit (123456) telah dikirimkan ke email ${email}.`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'registerStudent': {
            const payload = args[0] || {};
            if (!payload.nim || !payload.name || !payload.className || !payload.email || !payload.password) {
              resolve({ success: false, data: null, message: 'Seluruh field (NIM, Nama Lengkap, Kelas, Email Pribadi, Password) wajib diisi.', timestamp: new Date().toISOString() });
              return;
            }

            const nim = String(payload.nim).trim();
            const name = String(payload.name).trim();
            const className = String(payload.className).trim().toUpperCase();
            const email = String(payload.email).trim().toLowerCase();
            const password = String(payload.password).trim();

            const classRegex = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;
            if (!classRegex.test(className)) {
              resolve({ success: false, data: null, message: 'Format Kelas tidak valid! Harus berformat ##MJSP###, ##MJSM###, atau ##MJSE### (Contoh: 01MJSP001).', timestamp: new Date().toISOString() });
              return;
            }

            const users = getSimUsers();
            if (users.some((u: any) => String(u.nim || u.username).toLowerCase() === nim.toLowerCase())) {
              resolve({ success: false, data: null, message: `NIM ${nim} sudah terdaftar sebagai akun mahasiswa.`, timestamp: new Date().toISOString() });
              return;
            }
            if (users.some((u: any) => String(u.email || '').toLowerCase() === email)) {
              resolve({ success: false, data: null, message: `Email ${email} sudah digunakan oleh akun lain.`, timestamp: new Date().toISOString() });
              return;
            }

            const userId = `USR-MHS-${nim}`;
            const now = new Date().toISOString();
            const hashedPass = hashSimPassword(password);

            const newUser = {
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

            users.push(newUser);
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

            // Generate Server-Side Verification Token
            const vToken = `VRF-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            const tokens = getSimTokens();
            tokens.push({
              token: vToken,
              userId: userId,
              email: email,
              created_at: now,
              expires_at: expiresAt,
              used: false
            });
            saveSimTokens(tokens);

            const verifyLink = `${window.location.origin}${window.location.pathname}?verify_token=${vToken}`;

            addSimAuditLog(userId, 'REGISTER_STUDENT_UNVERIFIED', 'USER', `NIM: ${nim}, Email: ${email}, Token: ${vToken}`);

            resolve({
              success: true,
              data: {
                userId,
                email,
                verificationToken: vToken,
                verificationLink: verifyLink
              } as any,
              message: `Registrasi akun berhasil! Link verifikasi telah dikirimkan ke email ${email}. Silakan cek email Anda untuk memverifikasi akun.`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'verifyAccountToken': {
            const tokenParam = String(args[0] || '').trim();
            if (!tokenParam) {
              resolve({
                success: false,
                data: null,
                message: 'Token verifikasi wajib diberikan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const tokens = getSimTokens();
            const tokenObj = tokens.find((t: any) => t.token === tokenParam);

            if (!tokenObj) {
              resolve({
                success: false,
                data: null,
                message: 'Token verifikasi tidak ditemukan atau tidak valid.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            if (tokenObj.used) {
              resolve({
                success: false,
                data: null,
                message: 'Token verifikasi ini sudah pernah digunakan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            if (new Date(tokenObj.expires_at).getTime() < new Date().getTime()) {
              resolve({
                success: false,
                data: null,
                message: 'Token verifikasi telah kedaluwarsa. Silakan lakukan registrasi ulang.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            // Mark token as used
            tokenObj.used = true;
            saveSimTokens(tokens);

            // Update user status
            const users = getSimUsers();
            const user = users.find((u: any) => u.user_id === tokenObj.userId);

            if (!user) {
              resolve({
                success: false,
                data: null,
                message: 'Akun pengguna tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            user.status = 'TERVERIFIKASI';
            user.updated_at = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

            addSimAuditLog(user.user_id, 'VERIFY_ACCOUNT_SUCCESS', 'USER', 'Akun terverifikasi via link token');

            resolve({
              success: true,
              data: { userId: user.user_id, nim: user.nim } as any,
              message: 'Akun berhasil diverifikasi. Silakan login.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'sendPasswordResetLink': {
            const targetNim = String(args[0] || '').trim().toLowerCase();
            const genericMsg = 'Jika akun terdaftar, link reset password akan dikirim ke email yang terdaftar.';

            if (!targetNim) {
              resolve({
                success: false,
                data: null,
                message: 'NIM wajib diisi.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const users = getSimUsers();
            const user = users.find((u: any) => String(u.nim || u.username || '').trim().toLowerCase() === targetNim);

            if (!user) {
              resolve({
                success: true,
                data: null,
                message: genericMsg,
                timestamp: new Date().toISOString()
              });
              return;
            }

            const userStatus = String(user.status || '').toUpperCase();
            if (userStatus === 'BELUM TERVERIFIKASI' || userStatus === 'UNVERIFIED' || userStatus === 'PENDING') {
              resolve({
                success: true,
                data: null,
                message: genericMsg,
                timestamp: new Date().toISOString()
              });
              return;
            }

            const rToken = `RST-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
            const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

            const resetTokens = getSimResetTokens();
            resetTokens.push({
              token: rToken,
              userId: user.user_id,
              email: user.email,
              created_at: new Date().toISOString(),
              expires_at: expiresAt,
              used: false
            });
            saveSimResetTokens(resetTokens);

            const resetLink = `${window.location.origin}${window.location.pathname}?reset_token=${rToken}`;

            addSimAuditLog(user.user_id, 'REQUEST_PASSWORD_RESET', 'USER', `NIM: ${user.nim}, ResetToken: ${rToken}`);

            resolve({
              success: true,
              data: {
                resetToken: rToken,
                resetLink: resetLink
              } as any,
              message: genericMsg,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'resetPasswordWithToken': {
            const tokenParam = String(args[0] || '').trim();
            const newPassword = String(args[1] || '').trim();

            if (!tokenParam) {
              resolve({
                success: false,
                data: null,
                message: 'Token reset password wajib diberikan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            if (!newPassword || newPassword.length < 3) {
              resolve({
                success: false,
                data: null,
                message: 'Password baru minimal terdiri dari 3 karakter.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const resetTokens = getSimResetTokens();
            const tokenObj = resetTokens.find((t: any) => t.token === tokenParam);

            if (!tokenObj) {
              resolve({
                success: false,
                data: null,
                message: 'Token reset password tidak ditemukan atau tidak valid.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            if (tokenObj.used) {
              resolve({
                success: false,
                data: null,
                message: 'Token reset password ini sudah pernah digunakan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            if (new Date(tokenObj.expires_at).getTime() < new Date().getTime()) {
              resolve({
                success: false,
                data: null,
                message: 'Token reset password telah kedaluwarsa. Silakan lakukan permintaan ulang.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const users = getSimUsers();
            const user = users.find((u: any) => u.user_id === tokenObj.userId);

            if (!user) {
              resolve({
                success: false,
                data: null,
                message: 'Akun pengguna tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            // Update user password and mark token as used
            user.password_hash = hashSimPassword(newPassword);
            user.updated_at = new Date().toISOString();
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

            tokenObj.used = true;
            saveSimResetTokens(resetTokens);

            addSimAuditLog(user.user_id, 'RESET_PASSWORD_SUCCESS', 'USER', 'Password berhasil diperbarui');

            resolve({
              success: true,
              data: null,
              message: 'Password berhasil diubah. Silakan login.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'trackOrderPublic': {
            const targetNim = String(args[0] || '').trim();
            if (!targetNim) {
              resolve({
                success: true,
                data: { found: false, message: 'NIM wajib diisi untuk melacak pesanan.' } as any,
                message: 'NIM kosong.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const orders = getSimOrders();

            let matchedOrder: any = null;
            let matchedItem: any = null;

            for (let i = 0; i < orders.length; i++) {
              const ord = orders[i];
              if (ord.status === 'DIBATALKAN') continue;

              if (String(ord.buyer_nim || '').trim().toLowerCase() === targetNim.toLowerCase()) {
                matchedOrder = ord;
                matchedItem = (ord.items || []).find((it: any) => String(it.nim || '').trim().toLowerCase() === targetNim.toLowerCase()) || ord.items?.[0];
                break;
              }

              const itemMatch = (ord.items || []).find((it: any) => String(it.nim || '').trim().toLowerCase() === targetNim.toLowerCase());
              if (itemMatch) {
                matchedOrder = ord;
                matchedItem = itemMatch;
                break;
              }
            }

            if (!matchedOrder) {
              resolve({
                success: true,
                data: {
                  found: false,
                  message: `Data NIM ${targetNim} tidak ditemukan dalam pesanan PDH.`
                } as any,
                message: 'NIM tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const pickupSettings = getSimPickupSettings();
            let effectivePickupStatus: PickupStatus = matchedOrder.pickup_status || 'Belum Siap Diambil';
            if (!matchedOrder.pickup_status && (matchedOrder.production_percentage === 100 || matchedOrder.production_status === 'Selesai' || matchedOrder.production_status === 'Siap Diambil')) {
              effectivePickupStatus = pickupSettings.status === 'Siap Diambil' ? 'Siap Diambil' : 'Belum Siap Diambil';
            }

            resolve({
              success: true,
              data: {
                found: true,
                studentName: matchedItem ? matchedItem.student_name : matchedOrder.buyer_name,
                nim: targetNim,
                className: matchedItem ? matchedItem.class_name : matchedOrder.buyer_class,
                sizeCode: matchedItem ? matchedItem.size_code : 'M',
                customName: matchedItem ? matchedItem.custom_name : matchedOrder.buyer_name,
                orderNumber: matchedOrder.order_number,
                orderType: matchedOrder.order_type || 'PRIBADI',
                paymentStatus: matchedOrder.payment_status || 'BELUM_BAYAR',
                orderStatus: matchedOrder.status || 'MENUNGGU PEMBAYARAN',
                productionStatus: matchedOrder.production_status || 'Belum Diproduksi',
                productionPercentage: matchedOrder.production_percentage || 0,
                productionNotes: matchedOrder.production_notes || '',
                productionPhotoUrl: matchedOrder.production_photo_url || '',
                productionHistory: matchedOrder.production_history || [],
                pickupStatus: effectivePickupStatus,
                pickupInfo: pickupSettings,
                pickupAt: matchedOrder.pickup_at,
                pickupByPanitia: matchedOrder.pickup_by_panitia,
                isBuyer: String(matchedOrder.buyer_nim || '').trim().toLowerCase() === targetNim.toLowerCase()
              } as any,
              message: 'Data pesanan berhasil ditemukan.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getPickupSettings': {
            const settings = getSimPickupSettings();
            resolve({
              success: true,
              data: settings as any,
              message: 'Informasi pengambilan PDH berhasil dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'savePickupSettings': {
            const userId = args[0];
            const payload = args[1] || {};

            const settings = getSimPickupSettings();
            const updated: PickupInfoSettings = {
              status: payload.status || settings.status || 'Belum Siap Diambil',
              location: String(payload.location || settings.location || '').trim(),
              fullAddress: String(payload.fullAddress || settings.fullAddress || '').trim(),
              startDate: String(payload.startDate || settings.startDate || '').trim(),
              endDate: String(payload.endDate || settings.endDate || '').trim(),
              pickupHours: String(payload.pickupHours || settings.pickupHours || '').trim(),
              contactPerson: String(payload.contactPerson || settings.contactPerson || '').trim(),
              instructions: String(payload.instructions || settings.instructions || '').trim(),
              additionalNotes: String(payload.additionalNotes || settings.additionalNotes || '').trim()
            };

            saveSimPickupSettings(updated);

            addSimAuditLog(userId, 'UPDATE_PICKUP_SETTINGS', 'SETTINGS', `Lokasi: ${updated.location}, Status Global: ${updated.status}`);

            resolve({
              success: true,
              data: updated as any,
              message: 'Informasi pengaturan pengambilan PDH berhasil disimpan.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'markOrderSiapDiambil': {
            const userId = args[0];
            const orderId = args[1];

            const orders = getSimOrders();
            const idx = orders.findIndex((o: any) => o.order_id === orderId);

            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'Pesanan tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const currentOrder = orders[idx];
            const isProductionFinished =
              currentOrder.production_status === 'Selesai' ||
              currentOrder.production_status === 'Siap Diambil' ||
              (currentOrder.production_percentage || 0) === 100;

            if (!isProductionFinished) {
              resolve({
                success: false,
                data: null,
                message: 'Pesanan hanya dapat berstatus "Siap Diambil" jika produksi sudah selesai (100%).',
                timestamp: new Date().toISOString()
              });
              return;
            }

            orders[idx].pickup_status = 'Siap Diambil';
            orders[idx].production_status = 'Siap Diambil';
            saveSimOrders(orders);

            addSimAuditLog(userId, 'MARK_ORDER_SIAP_DIAMBIL', 'PICKUP', `Order ID: ${orderId}`);

            if (orders[idx].buyer_nim) {
              addSimNotification(
                orders[idx].buyer_nim,
                orders[idx].order_id,
                'PICKUP_READY',
                'PDH Siap Diambil!',
                `PDH pesanan ${orders[idx].order_number} Anda telah SIAP DIAMBIL. Silakan cek informasi lokasi & jadwal pengambilan di portal.`,
                true
              );
            }

            resolve({
              success: true,
              data: orders[idx] as any,
              message: 'Status pesanan berhasil diubah menjadi Siap Diambil.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'confirmOrderPickup': {
            const userId = args[0];
            const orderId = args[1];
            const notes = String(args[2] || '').trim();

            const orders = getSimOrders();
            const idx = orders.findIndex((o: any) => o.order_id === orderId);

            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'Pesanan tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const currentOrder = orders[idx];
            if (currentOrder.pickup_status !== 'Siap Diambil' && currentOrder.production_status !== 'Siap Diambil') {
              resolve({
                success: false,
                data: null,
                message: 'Pesanan belum berstatus "Siap Diambil". Tidak dapat ditandai sebagai "Sudah Diambil".',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const now = new Date().toISOString();
            const users = getSimUsers();
            const panitiaUser = users.find((u: any) => u.user_id === userId);
            const panitiaName = panitiaUser ? panitiaUser.name : userId;

            orders[idx].pickup_status = 'Sudah Diambil';
            orders[idx].pickup_at = now;
            orders[idx].pickup_by_panitia = panitiaName;
            orders[idx].pickup_notes = notes;
            orders[idx].status = 'SELESAI';

            saveSimOrders(orders);

            addSimAuditLog(userId, 'CONFIRM_ORDER_PICKUP', 'PICKUP', `Order ID: ${orderId}, Picked up at: ${now}`);

            if (orders[idx].buyer_nim) {
              addSimNotification(
                orders[idx].buyer_nim,
                orders[idx].order_id,
                'PICKUP_COMPLETED',
                'PDH Telah Diambil',
                `PDH pesanan ${orders[idx].order_number} telah diserahkan dan dikonfirmasi SUDAH DIAMBIL oleh Panitia. Terima kasih!`,
                false
              );
            }

            resolve({
              success: true,
              data: orders[idx] as any,
              message: 'Pesanan berhasil dikonfirmasi sebagai SUDAH DIAMBIL.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getProductionOrdersPanitia': {
            const orders = getSimOrders();
            const prodOrders = orders.filter((o: any) =>
              o.status !== 'DIBATALKAN' &&
              (o.payment_status === 'LUNAS' || o.status === 'PEMBAYARAN LUNAS' || o.status === 'SELESAI' || o.production_status)
            );

            resolve({
              success: true,
              data: prodOrders as any,
              message: 'Daftar pesanan produksi berhasil dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'updateProductionProgress': {
            const userId = args[0];
            const orderId = args[1];
            const payload = args[2] || {};

            const percentage = Math.min(100, Math.max(0, parseInt(payload.percentage || 0, 10)));
            const prodStatus = payload.productionStatus || (percentage === 100 ? 'Selesai' : percentage > 0 ? 'Sedang Diproduksi' : 'Belum Diproduksi');
            const notes = String(payload.notes || '').trim();
            const fileBase64 = payload.fileBase64;
            const fileName = payload.fileName || 'foto_progres.jpg';
            const mimeType = payload.mimeType || 'image/jpeg';

            const orders = getSimOrders();
            const idx = orders.findIndex((o: any) => o.order_id === orderId);

            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'Pesanan tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const now = new Date().toISOString();
            let photoUrl = orders[idx].production_photo_url || '';
            let drivePhotoId = orders[idx].production_drive_photo_id || '';

            if (fileBase64) {
              drivePhotoId = `DRV-PROG-${Date.now()}`;
              photoUrl = fileBase64.startsWith('data:') ? fileBase64 : `data:${mimeType};base64,${fileBase64}`;
            }

            const historyEntry = {
              progress_id: `PROG-${Date.now().toString(36).toUpperCase()}`,
              order_id: orderId,
              percentage: percentage,
              production_status: prodStatus,
              notes: notes,
              photo_url: photoUrl,
              drive_photo_id: drivePhotoId,
              updated_at: now,
              updated_by: userId
            };

            orders[idx].production_status = prodStatus;
            orders[idx].production_percentage = percentage;
            orders[idx].production_notes = notes;
            orders[idx].production_photo_url = photoUrl;
            orders[idx].production_drive_photo_id = drivePhotoId;
            orders[idx].production_updated_at = now;

            if (!orders[idx].production_history) {
              orders[idx].production_history = [];
            }
            orders[idx].production_history.unshift(historyEntry);

            if (percentage === 100 || prodStatus === 'Selesai' || prodStatus === 'Siap Diambil') {
              orders[idx].status = 'SELESAI';
            } else if (percentage > 0 || prodStatus === 'Sedang Diproduksi') {
              orders[idx].status = 'DIPROSES';
            }

            saveSimOrders(orders);

            addSimAuditLog(userId, 'UPDATE_PRODUCTION_PROGRESS', 'PRODUCTION', `Order ID: ${orderId}, Status: ${prodStatus}, Progress: ${percentage}%, Notes: ${notes}`);

            if (orders[idx].buyer_nim) {
              if (percentage === 100 || prodStatus === 'Selesai') {
                addSimNotification(
                  orders[idx].buyer_nim,
                  orders[idx].order_id,
                  'PRODUCTION_COMPLETED',
                  'Produksi PDH Selesai (100%)',
                  `Kabar gembira! Baju PDH pesanan ${orders[idx].order_number} Anda telah selesai diproduksi 100%.`,
                  true
                );
              } else {
                addSimNotification(
                  orders[idx].buyer_nim,
                  orders[idx].order_id,
                  'PRODUCTION_PROGRESS',
                  `Update Progres Produksi (${percentage}%)`,
                  `Pengerjaan pesanan ${orders[idx].order_number} mencapai ${percentage}%. Status: ${prodStatus}. Keterangan: ${notes || '-'}`,
                  false
                );
              }
            }

            resolve({
              success: true,
              data: orders[idx] as any,
              message: `Progres produksi berhasil diperbarui menjadi ${percentage}% (${prodStatus}).`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getSystemConfig': {
            const config: SystemConfig = {
              appName: 'PDH Campus Order',
              version: '1.0.0 (Tahap 1 - Fondasi)',
              hasSpreadsheetId: true,
              roles: ['PANITIA', 'MAHASISWA'],
              sheets: [
                'USERS', 'SETTINGS', 'AUDIT_LOG', 'PRODUCTS', 'PRODUCT_SIZES',
                'PRODUCT_IMAGES', 'PO_PERIODS', 'STUDENTS', 'CLASSES', 'ORDERS',
                'ORDER_ITEMS', 'PAYMENTS', 'PAYMENT_PROOFS', 'PRODUCTION_PROGRESS',
                'PICKUP_INFORMATION', 'NOTIFICATIONS'
              ],
              driveFolders: {
                ROOT: 'PDH_CAMPUS',
                DESIGN: 'DESIGN',
                PAYMENT_PROOF: 'PAYMENT_PROOF',
                RECEIPT: 'RECEIPT',
                PRODUCTION_PROGRESS: 'PRODUCTION_PROGRESS'
              }
            };
            resolve({
              success: true,
              data: config as any,
              message: 'Konfigurasi Google Apps Script berhasil dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'loginUser': {
            const credentials = args[0] || {};
            const username = String(credentials.username || '').trim().toLowerCase();
            const password = String(credentials.password || '').trim();

            const users = getSimUsers();
            const user = users.find((u: any) => String(u.username || u.nim || '').toLowerCase() === username);

            if (!user) {
              addSimAuditLog('GUEST', 'LOGIN_FAILED', 'AUTH', `User not found: ${username}`);
              resolve({
                success: false,
                data: null,
                message: 'NIM atau password salah.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const userStatus = String(user.status || '').toUpperCase();
            if (userStatus === 'BELUM TERVERIFIKASI' || userStatus === 'UNVERIFIED' || userStatus === 'PENDING') {
              addSimAuditLog(user.user_id, 'LOGIN_BLOCKED_UNVERIFIED', 'AUTH', `Unverified login attempt: ${username}`);
              resolve({
                success: false,
                data: null,
                message: 'Akun Anda belum diverifikasi. Silakan cek email untuk melakukan verifikasi.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            if (userStatus !== 'ACTIVE' && userStatus !== 'TERVERIFIKASI') {
              addSimAuditLog(user.user_id, 'LOGIN_BLOCKED', 'AUTH', `Inactive user attempt: ${username}`);
              resolve({
                success: false,
                data: null,
                message: 'Akun anda nonaktif. Silakan hubungi Panitia.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const hashedInput = hashSimPassword(password);
            if (user.password_hash !== password && user.password_hash !== hashedInput) {
              addSimAuditLog(user.user_id, 'LOGIN_FAILED', 'AUTH', `Password Mismatch for: ${username}`);
              resolve({
                success: false,
                data: null,
                message: 'NIM atau password salah.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const token = `SESS-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
            const sessionUser: User = {
              userId: user.user_id,
              username: user.username,
              name: user.name,
              email: user.email,
              role: user.role,
              token: token,
              status: user.status,
              loginAt: new Date().toISOString()
            };

            addSimAuditLog(user.user_id, 'LOGIN_SUCCESS', 'AUTH', `Berhasil login role: ${user.role}`);

            resolve({
              success: true,
              data: sessionUser as any,
              message: `Selamat datang, ${user.name}! Login berhasil sebagai ${user.role}.`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getDatabaseTables': {
            const userId = args[0];
            const tables = {
              USERS: { rowCount: getSimUsers().length, headers: ['user_id', 'username', 'password_hash', 'name', 'email', 'role', 'status', 'created_at', 'updated_at'] },
              SETTINGS: { rowCount: 3, headers: ['setting_key', 'setting_value', 'description', 'updated_at'] },
              AUDIT_LOG: { rowCount: getSimAuditLogs().length, headers: ['log_id', 'timestamp', 'user_id', 'action', 'entity', 'details', 'ip_address'] },
              PRODUCTS: { rowCount: 0, headers: ['product_id', 'code', 'name', 'description', 'base_price', 'category', 'status', 'created_at'] },
              PRODUCT_SIZES: { rowCount: 0, headers: ['size_id', 'product_id', 'size_code', 'extra_fee', 'chest_width', 'body_length', 'sleeve_length'] },
              PRODUCT_IMAGES: { rowCount: 0, headers: ['image_id', 'product_id', 'drive_file_id', 'file_url', 'is_primary', 'sort_order'] },
              PO_PERIODS: { rowCount: 0, headers: ['period_id', 'name', 'start_date', 'end_date', 'target_quota', 'status', 'notes'] },
              STUDENTS: { rowCount: 0, headers: ['student_id', 'user_id', 'nim', 'full_name', 'class_name', 'phone', 'whatsapp'] },
              CLASSES: { rowCount: 0, headers: ['class_id', 'class_name', 'department', 'batch_year'] },
              ORDERS: { rowCount: 0, headers: ['order_id', 'order_number', 'user_id', 'order_type', 'status', 'total_amount', 'shipping_type', 'created_at'] },
              ORDER_ITEMS: { rowCount: 0, headers: ['item_id', 'order_id', 'product_id', 'size_code', 'custom_name', 'quantity', 'unit_price', 'subtotal'] },
              PAYMENTS: { rowCount: 0, headers: ['payment_id', 'order_id', 'payment_method', 'amount', 'status', 'verification_status', 'created_at'] },
              PAYMENT_PROOFS: { rowCount: 0, headers: ['proof_id', 'payment_id', 'drive_file_id', 'file_name', 'mime_type', 'uploaded_at'] },
              PRODUCTION_PROGRESS: { rowCount: 0, headers: ['progress_id', 'period_id', 'stage_name', 'percentage', 'notes', 'drive_photo_id', 'updated_at'] },
              PICKUP_INFORMATION: { rowCount: 0, headers: ['pickup_id', 'order_id', 'status', 'location', 'pickup_date', 'picked_up_by', 'receipt_signature'] },
              NOTIFICATIONS: { rowCount: 0, headers: ['notification_id', 'user_id', 'title', 'message', 'type', 'is_read', 'created_at'] }
            };

            resolve({
              success: true,
              data: tables as any,
              message: 'Database schema dan statistik row berhasil dibaca dari Google Sheets.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'setupDriveFolders': {
            const userId = args[0];
            const driveStructure: DriveFolderStructure = {
              root: {
                id: 'DRV-ROOT-1A2B3C',
                name: 'PDH_CAMPUS',
                url: 'https://drive.google.com/drive/folders/PDH_CAMPUS'
              },
              subfolders: {
                DESIGN: {
                  id: 'DRV-SUB-DESIGN-01',
                  name: 'DESIGN',
                  url: 'https://drive.google.com/drive/folders/DESIGN'
                },
                PAYMENT_PROOF: {
                  id: 'DRV-SUB-PAYMENT-02',
                  name: 'PAYMENT_PROOF',
                  url: 'https://drive.google.com/drive/folders/PAYMENT_PROOF'
                },
                RECEIPT: {
                  id: 'DRV-SUB-RECEIPT-03',
                  name: 'RECEIPT',
                  url: 'https://drive.google.com/drive/folders/RECEIPT'
                },
                PRODUCTION_PROGRESS: {
                  id: 'DRV-SUB-PRODUCTION-04',
                  name: 'PRODUCTION_PROGRESS',
                  url: 'https://drive.google.com/drive/folders/PRODUCTION_PROGRESS'
                }
              }
            };
            addSimAuditLog(userId, 'INIT_DRIVE_FOLDERS', 'DRIVE', 'Struktur folder Google Drive PDH_CAMPUS terverifikasi');
            resolve({
              success: true,
              data: driveStructure as any,
              message: 'Struktur Google Drive PDH_CAMPUS terkonfigurasi.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getAuditLogs': {
            const userId = args[0];
            const logs = getSimAuditLogs();
            resolve({
              success: true,
              data: logs as any,
              message: 'Audit log berhasil dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'setupDatabase': {
            const ssId = args[0] || '1SpreadsheetIdPDHCampusOrderDatabase2026';
            localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, ssId);
            addSimAuditLog('SYSTEM', 'INIT_DATABASE', 'SYSTEM', `Spreadsheet ID dikonfigurasi: ${ssId}`);
            resolve({
              success: true,
              data: { spreadsheetId: ssId, url: `https://docs.google.com/spreadsheets/d/${ssId}` } as any,
              message: 'Database Google Sheets terhubung dan siap digunakan.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getPDHMasterData': {
            const master = getSimPDHMaster();
            resolve({
              success: true,
              data: master as any,
              message: 'Data Master PDH berhasil dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'updatePDHInfo': {
            const userId = args[0];
            const newInfo: PDHInfo = args[1];
            const master = getSimPDHMaster();
            master.info = { ...master.info, ...newInfo };
            saveSimPDHMaster(master);
            addSimAuditLog(userId, 'UPDATE_PDH_INFO', 'MASTER_PDH', JSON.stringify(newInfo));
            resolve({
              success: true,
              data: master.info as any,
              message: 'Informasi & Ketentuan PDH berhasil diperbarui.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'updatePDHPricing': {
            const userId = args[0];
            const newPricing: PDHPricing = args[1];
            const master = getSimPDHMaster();
            master.pricing = { ...master.pricing, ...newPricing };
            saveSimPDHMaster(master);
            addSimAuditLog(userId, 'UPDATE_PDH_PRICE', 'MASTER_PDH', JSON.stringify(newPricing));
            resolve({
              success: true,
              data: master.pricing as any,
              message: 'Harga Aktif PDH berhasil diperbarui.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'savePDHSize': {
            const userId = args[0];
            const newSize: PDHSize = args[1];
            const master = getSimPDHMaster();
            const idx = master.sizes.findIndex((s) => s.size_id === newSize.size_id);
            if (idx >= 0) {
              master.sizes[idx] = newSize;
            } else {
              if (!newSize.size_id) newSize.size_id = `SZ-${Date.now().toString(36).toUpperCase()}`;
              master.sizes.push(newSize);
            }
            saveSimPDHMaster(master);
            addSimAuditLog(userId, 'SAVE_PDH_SIZE', 'MASTER_PDH', `Ukuran ${newSize.size_code}`);
            resolve({
              success: true,
              data: master.sizes as any,
              message: `Ukuran ${newSize.size_code} berhasil disimpan.`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'uploadPDHDesignImage': {
            const userId = args[0];
            const filePayload = args[1];
            const master = getSimPDHMaster();
            if (master.images.length >= 5) {
              resolve({
                success: false,
                data: null,
                message: 'Batas maksimal 5 foto desain PDH telah tercapai. Hapus salah satu foto terlebih dahulu.',
                timestamp: new Date().toISOString()
              });
              return;
            }
            const driveFileId = `DRV-FILE-${Date.now().toString(36).toUpperCase()}`;
            const isFirst = master.images.length === 0;
            const newImage: PDHImage = {
              image_id: `IMG-${Date.now().toString(36).toUpperCase()}`,
              drive_file_id: driveFileId,
              file_url: filePayload.previewUrl || filePayload.base64Data || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
              file_name: filePayload.fileName || 'PDH_Design_Upload.jpg',
              is_primary: isFirst,
              uploaded_at: new Date().toISOString()
            };
            master.images.push(newImage);
            saveSimPDHMaster(master);
            addSimAuditLog(userId, 'UPLOAD_PDH_DESIGN', 'MASTER_PDH', `File ID: ${driveFileId}`);
            resolve({
              success: true,
              data: newImage as any,
              message: 'Desain PDH berhasil diunggah!',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'deletePDHDesignImage': {
            const userId = args[0];
            const imageId = args[1];
            const master = getSimPDHMaster();
            const initialLen = master.images.length;
            master.images = master.images.filter((img) => img.image_id !== imageId);
            if (master.images.length === initialLen) {
              resolve({
                success: false,
                data: null,
                message: 'Gambar desain tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }
            if (master.images.length > 0 && !master.images.some((img) => img.is_primary)) {
              master.images[0].is_primary = true;
            }
            saveSimPDHMaster(master);
            addSimAuditLog(userId, 'DELETE_PDH_DESIGN', 'MASTER_PDH', `Image ID: ${imageId}`);
            resolve({
              success: true,
              data: master.images as any,
              message: 'Foto desain berhasil dihapus.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'replacePDHDesignImage': {
            const userId = args[0];
            const imageId = args[1];
            const filePayload = args[2];
            const master = getSimPDHMaster();
            const idx = master.images.findIndex((img) => img.image_id === imageId);
            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'Gambar desain tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }
            const driveFileId = `DRV-FILE-${Date.now().toString(36).toUpperCase()}`;
            master.images[idx].drive_file_id = driveFileId;
            master.images[idx].file_url = filePayload.previewUrl || filePayload.base64Data || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80';
            master.images[idx].file_name = filePayload.fileName || 'PDH_Design_Replaced.jpg';
            master.images[idx].uploaded_at = new Date().toISOString();
            saveSimPDHMaster(master);
            addSimAuditLog(userId, 'REPLACE_PDH_DESIGN', 'MASTER_PDH', `Image ID: ${imageId}, File ID: ${driveFileId}`);
            resolve({
              success: true,
              data: master.images[idx] as any,
              message: 'Foto desain berhasil diganti!',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getAllPanitiaUsers': {
            const users = getSimUsers();
            const panitiaUsers = users.map((u: any) => {
              const { password_hash, ...safeUser } = u;
              return safeUser;
            });
            resolve({
              success: true,
              data: panitiaUsers as any,
              message: 'Daftar user berhasil dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'createPanitiaUser': {
            const userId = args[0];
            const payload = args[1] || {};
            const { name, username, email, password, confirmPassword } = payload;

            if (!name || !username || !email || !password || !confirmPassword) {
              resolve({
                success: false,
                data: null,
                message: 'Semua field (Nama, Username, Email, Password, Konfirmasi Password) wajib diisi!',
                timestamp: new Date().toISOString()
              });
              return;
            }

            if (password !== confirmPassword) {
              resolve({
                success: false,
                data: null,
                message: 'Konfirmasi password tidak cocok dengan password!',
                timestamp: new Date().toISOString()
              });
              return;
            }

            if (password.length < 3) {
              resolve({
                success: false,
                data: null,
                message: 'Password minimal 3 karakter!',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const users = getSimUsers();
            const cleanUsername = String(username).trim().toLowerCase();
            const cleanEmail = String(email).trim().toLowerCase();

            if (users.some((u: any) => String(u.username).trim().toLowerCase() === cleanUsername)) {
              resolve({
                success: false,
                data: null,
                message: `Username "${username}" sudah digunakan! Silakan pilih username lain.`,
                timestamp: new Date().toISOString()
              });
              return;
            }

            if (users.some((u: any) => String(u.email || '').trim().toLowerCase() === cleanEmail)) {
              resolve({
                success: false,
                data: null,
                message: `Email "${email}" sudah terdaftar dalam sistem!`,
                timestamp: new Date().toISOString()
              });
              return;
            }

            const now = new Date().toISOString();
            const newUser = {
              user_id: `USR-PANITIA-${Date.now().toString(36).toUpperCase()}`,
              username: cleanUsername,
              password_hash: String(password),
              name: String(name).trim(),
              email: cleanEmail,
              role: 'PANITIA',
              status: 'ACTIVE',
              created_at: now,
              updated_at: now
            };

            users.push(newUser);
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
            addSimAuditLog(userId, 'CREATE_PANITIA_USER', 'USER_ACCESS', `Username: ${cleanUsername}, Nama: ${name}`);

            const { password_hash, ...safeUser } = newUser;
            resolve({
              success: true,
              data: safeUser as any,
              message: `User Panitia "${name}" (${cleanUsername}) berhasil ditambahkan!`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'updatePanitiaUser': {
            const userId = args[0];
            const targetUserId = args[1];
            const payload = args[2] || {};
            const { name, email } = payload;

            const users = getSimUsers();
            const idx = users.findIndex((u: any) => u.user_id === targetUserId);
            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'User panitia tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const cleanEmail = String(email || '').trim().toLowerCase();
            if (cleanEmail && users.some((u: any) => u.user_id !== targetUserId && String(u.email || '').trim().toLowerCase() === cleanEmail)) {
              resolve({
                success: false,
                data: null,
                message: `Email "${email}" sudah terdaftar pada akun pengguna lain!`,
                timestamp: new Date().toISOString()
              });
              return;
            }

            users[idx].name = String(name || users[idx].name).trim();
            if (cleanEmail) users[idx].email = cleanEmail;
            users[idx].updated_at = new Date().toISOString();

            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
            addSimAuditLog(userId, 'UPDATE_PANITIA_USER', 'USER_ACCESS', `Target User ID: ${targetUserId}, Nama: ${users[idx].name}`);

            const { password_hash, ...safeUser } = users[idx];
            resolve({
              success: true,
              data: safeUser as any,
              message: 'Data user panitia berhasil diperbarui.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'togglePanitiaUserStatus': {
            const userId = args[0];
            const targetUserId = args[1];
            const newStatus = args[2];

            const users = getSimUsers();
            const idx = users.findIndex((u: any) => u.user_id === targetUserId || u.username === targetUserId);
            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'User tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const targetUser = users[idx];
            if (targetUser.user_id === 'USR-ADMIN-01' || targetUser.username === 'admin') {
              resolve({
                success: false,
                data: null,
                message: 'Dilarang menonaktifkan atau mengubah akun Administrator Utama (admin)!',
                timestamp: new Date().toISOString()
              });
              return;
            }

            targetUser.status = newStatus === 'ACTIVE' || newStatus === 'AKTIF' || newStatus === 'TERVERIFIKASI' ? 'ACTIVE' : 'INACTIVE';
            targetUser.updated_at = new Date().toISOString();

            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
            addSimAuditLog(userId, 'TOGGLE_USER_STATUS', 'USER_ACCESS', `Target Username: ${targetUser.username}, Status Baru: ${targetUser.status}`);

            const { password_hash, ...safeUser } = targetUser;
            resolve({
              success: true,
              data: safeUser as any,
              message: `Status akun "${targetUser.username}" berhasil diubah menjadi ${targetUser.status}.`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'resetPanitiaUserPassword': {
            const userId = args[0];
            const targetUserId = args[1];
            const newPassword = args[2];
            const confirmPassword = args[3];

            if (!newPassword || !confirmPassword) {
              resolve({
                success: false,
                data: null,
                message: 'Password baru dan konfirmasi password wajib diisi!',
                timestamp: new Date().toISOString()
              });
              return;
            }

            if (newPassword !== confirmPassword) {
              resolve({
                success: false,
                data: null,
                message: 'Konfirmasi password tidak cocok dengan password baru!',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const users = getSimUsers();
            const idx = users.findIndex((u: any) => u.user_id === targetUserId || u.username === targetUserId);
            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'User tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            users[idx].password_hash = String(newPassword);
            users[idx].updated_at = new Date().toISOString();

            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
            addSimAuditLog(userId, 'RESET_USER_PASSWORD', 'USER_ACCESS', `Target Username: ${users[idx].username}`);

            resolve({
              success: true,
              data: null,
              message: `Password user "${users[idx].username}" berhasil diperbarui!`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'updatePDHPaymentInfo': {
            const userId = args[0];
            const newPayment: PDHPaymentInfo = args[1];
            const master = getSimPDHMaster();
            master.payment = { ...master.payment, ...newPayment };
            saveSimPDHMaster(master);
            addSimAuditLog(userId, 'UPDATE_PAYMENT_INFO', 'MASTER_PDH', JSON.stringify(newPayment));
            resolve({
              success: true,
              data: master.payment as any,
              message: 'Informasi Pembayaran berhasil diperbarui.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getActivePOPeriod': {
            const periods = getSimPOPeriods();
            const active = periods[0] || DEFAULT_PO_PERIOD;
            const computedStatus = evaluateSimPOStatus(active);
            resolve({
              success: true,
              data: {
                ...active,
                status: computedStatus,
                isOpen: computedStatus === 'OPEN'
              } as any,
              message: 'Status Periode PO berhasil dievaluasi.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getAllPOPeriods': {
            const periods = getSimPOPeriods();
            const computed = periods.map((p) => ({
              ...p,
              computed_status: evaluateSimPOStatus(p)
            }));
            resolve({
              success: true,
              data: computed as any,
              message: 'Riwayat periode PO berhasil dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'savePOPeriod': {
            const userId = args[0];
            const poData: POPeriod = args[1];

            if (!poData.name || !poData.name.trim()) {
              resolve({ success: false, data: null, message: 'Nama periode PO wajib diisi.', timestamp: new Date().toISOString() });
              return;
            }

            if (poData.mode === 'OTOMATIS') {
              if (!poData.start_date || !poData.start_time || !poData.end_date || !poData.end_time) {
                resolve({ success: false, data: null, message: 'Mode OTOMATIS wajib mengisi Tanggal & Jam Mulai serta Selesai.', timestamp: new Date().toISOString() });
                return;
              }
              const startDT = new Date(`${poData.start_date}T${poData.start_time}:00`);
              const endDT = new Date(`${poData.end_date}T${poData.end_time}:00`);
              if (endDT <= startDT) {
                resolve({ success: false, data: null, message: 'Tanggal/jam selesai harus setelah tanggal/jam mulai.', timestamp: new Date().toISOString() });
                return;
              }
            }

            const periods = getSimPOPeriods();
            const periodId = poData.period_id || `PO-${Date.now().toString(36).toUpperCase()}`;
            const now = new Date().toISOString();

            const idx = periods.findIndex((p) => p.period_id === periodId);
            const payload: POPeriod = {
              ...poData,
              period_id: periodId,
              updated_at: now
            };

            if (idx >= 0) {
              periods[idx] = payload;
              addSimAuditLog(userId, 'UPDATE_PO', 'PO_PERIOD', `ID: ${periodId}, Name: ${poData.name}`);
            } else {
              payload.created_at = now;
              periods.unshift(payload);
              addSimAuditLog(userId, 'CREATE_PO', 'PO_PERIOD', `ID: ${periodId}, Name: ${poData.name}`);
            }

            saveSimPOPeriods(periods);
            resolve({
              success: true,
              data: payload as any,
              message: `Periode PO ${poData.name} berhasil disimpan.`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'togglePOStatus': {
            const userId = args[0];
            const periodId = args[1];
            const targetStatus: 'OPEN' | 'CLOSED' = args[2];

            const periods = getSimPOPeriods();
            const idx = periods.findIndex((p) => p.period_id === periodId);

            if (idx < 0) {
              resolve({ success: false, data: null, message: 'Periode PO tidak ditemukan.', timestamp: new Date().toISOString() });
              return;
            }

            const prevStatus = periods[idx].status;
            periods[idx].status = targetStatus;
            periods[idx].manual_override = true;
            periods[idx].updated_at = new Date().toISOString();

            saveSimPOPeriods(periods);

            const actionName = targetStatus === 'OPEN' ? 'OPEN_PO' : 'CLOSE_PO';
            addSimAuditLog(userId, actionName, 'PO_PERIOD', `ID: ${periodId}, Previous: ${prevStatus}, New: ${targetStatus}, Manual Override Active`);

            resolve({
              success: true,
              data: periods[idx] as any,
              message: `Periode PO berhasil di-override menjadi ${targetStatus}.`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'validatePOAccess': {
            const periods = getSimPOPeriods();
            const active = periods[0] || DEFAULT_PO_PERIOD;
            const status = evaluateSimPOStatus(active);

            if (status !== 'OPEN') {
              resolve({
                success: false,
                data: null,
                message: 'Pembuatan pesanan ditolak: Pre-Order (PO) saat ini sedang ditutup.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            resolve({
              success: true,
              data: active as any,
              message: 'Akses Pre-Order valid.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'createOrder': {
            const userId = args[0];
            const payload = args[1];

            // 1. PO Access Check
            const poPeriods = getSimPOPeriods();
            const activePO = poPeriods[0] || DEFAULT_PO_PERIOD;
            if (evaluateSimPOStatus(activePO) !== 'OPEN') {
              resolve({
                success: false,
                data: null,
                message: 'Pembuatan pesanan ditolak: Pre-Order (PO) saat ini sedang ditutup.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            // 2. Buyer Data Validation
            if (!payload || !payload.buyerName || !payload.buyerNim || !payload.buyerClass || !payload.buyerWhatsapp) {
              resolve({ success: false, data: null, message: 'Data pemesan (Nama, NIM, Kelas, WhatsApp) wajib diisi.', timestamp: new Date().toISOString() });
              return;
            }

            const classRegex = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;
            const buyerClassClean = String(payload.buyerClass).trim().toUpperCase();
            if (!classRegex.test(buyerClassClean)) {
              resolve({
                success: false,
                data: null,
                message: 'Format Kelas pemesan tidak valid! Contoh format valid: 01MJSP001, 01MJSM001, 01MJSE001.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
              resolve({ success: false, data: null, message: 'Pesanan harus berisi minimal 1 item/anggota.', timestamp: new Date().toISOString() });
              return;
            }

            // 2b. Server-Side Anti-Duplication Check
            const nimsToCheck = [String(payload.buyerNim).trim()];
            payload.items.forEach((itm: any) => {
              if (itm.nim) nimsToCheck.push(String(itm.nim).trim());
            });

            // Check duplicate NIMs within same form submission
            const seenInPayload = new Set<string>();
            for (const cNim of nimsToCheck) {
              if (seenInPayload.has(cNim.toLowerCase())) {
                resolve({
                  success: false,
                  data: null,
                  message: `NIM ${cNim} terdaftar duplikat dalam pengisian pesanan ini.`,
                  timestamp: new Date().toISOString()
                });
                return;
              }
              seenInPayload.add(cNim.toLowerCase());
            }

            // Check duplicate NIMs against existing active orders
            const existingOrders = getSimOrders();
            const activeNimSet = new Set<string>();

            existingOrders.forEach((ord: any) => {
              if (ord.status === 'DIBATALKAN') return;
              if (ord.buyer_nim) activeNimSet.add(String(ord.buyer_nim).trim().toLowerCase());
              (ord.items || []).forEach((it: any) => {
                if (it.nim) activeNimSet.add(String(it.nim).trim().toLowerCase());
              });
            });

            for (const cNim of nimsToCheck) {
              if (activeNimSet.has(cNim.toLowerCase())) {
                resolve({
                  success: false,
                  data: null,
                  message: `NIM ${cNim} sudah terdaftar dalam pesanan PDH aktif.`,
                  timestamp: new Date().toISOString()
                });
                return;
              }
            }

            // 3. Size & Pricing Calculation Server-Side
            const master = getSimPDHMaster();
            const basePrice = master.pricing.price || 185000;
            const activeSizesMap: Record<string, number> = {};
            master.sizes.forEach((s) => {
              if (s.status === 'ACTIVE') activeSizesMap[s.size_code.toUpperCase()] = s.extra_fee || 0;
            });

            let calculatedTotal = 0;
            let totalQty = 0;
            const processedItems: any[] = [];

            for (let i = 0; i < payload.items.length; i++) {
              const itm = payload.items[i];
              const itmName = String(itm.fullName || payload.buyerName).trim();
              const itmNim = String(itm.nim || payload.buyerNim).trim();
              const itmClass = String(itm.className || buyerClassClean).trim().toUpperCase();
              const sizeCode = String(itm.sizeCode || 'M').trim().toUpperCase();
              const qty = Math.max(1, parseInt(itm.quantity || 1, 10));

              if (!classRegex.test(itmClass)) {
                resolve({
                  success: false,
                  data: null,
                  message: `Format kelas tidak valid untuk anggota ${itmName} (${itmClass}). Contoh: 01MJSP001`,
                  timestamp: new Date().toISOString()
                });
                return;
              }

              if (activeSizesMap[sizeCode] === undefined) {
                resolve({
                  success: false,
                  data: null,
                  message: `Ukuran ${sizeCode} tidak tersedia atau nonaktif.`,
                  timestamp: new Date().toISOString()
                });
                return;
              }

              const extra = activeSizesMap[sizeCode];
              const unitPrice = basePrice + extra;
              const subtotal = unitPrice * qty;

              calculatedTotal += subtotal;
              totalQty += qty;

              processedItems.push({
                item_id: `ITM-${Date.now().toString(36).toUpperCase()}-${i}`,
                order_id: '',
                size_code: sizeCode,
                custom_name: String(itm.customName || itmName).trim(),
                quantity: qty,
                unit_price: unitPrice,
                subtotal: subtotal,
                student_name: itmName,
                nim: itmNim,
                class_name: itmClass
              });
            }

            // 4. Generate Order ID
            const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
            const randNum = Math.floor(1000 + Math.random() * 9000);
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const orderNum = `PDH-${dateStr}-${randNum}`;
            const now = new Date().toISOString();

            processedItems.forEach((it) => (it.order_id = orderId));

            const newOrder = {
              order_id: orderId,
              order_number: orderNum,
              user_id: userId,
              order_type: payload.orderType || 'PRIBADI',
              status: 'PENDING_PAYMENT',
              payment_status: 'UNPAID',
              total_amount: calculatedTotal,
              buyer_name: payload.buyerName.trim(),
              buyer_nim: payload.buyerNim.trim(),
              buyer_class: buyerClassClean,
              buyer_whatsapp: payload.buyerWhatsapp.trim(),
              item_count: totalQty,
              items: processedItems,
              created_at: now
            };

            const allOrders = getSimOrders();
            allOrders.unshift(newOrder);
            saveSimOrders(allOrders);

            addSimAuditLog(userId, 'CREATE_ORDER', 'ORDER', `Order ID: ${orderId}, Num: ${orderNum}, Total: Rp ${calculatedTotal.toLocaleString('id-ID')}`);

            addSimNotification(
              payload.buyerNim.trim(),
              orderId,
              'ORDER_CREATED',
              'Pesanan Berhasil Dibuat',
              `Pesanan ${orderNum} berhasil dibuat. Silakan lakukan pembayaran senilai Rp ${calculatedTotal.toLocaleString('id-ID')} dan unggah bukti transfer.`,
              true
            );

            if (payload.orderType === 'KOLEKTIF' && processedItems.length > 0) {
              processedItems.forEach((itm: any) => {
                if (itm.nim && String(itm.nim).toLowerCase() !== String(payload.buyerNim).trim().toLowerCase()) {
                  addSimNotification(
                    itm.nim,
                    orderId,
                    'ORDER_CREATED',
                    'Pesanan Kolektif Dibuat',
                    `Anda didaftarkan dalam pesanan kolektif ${orderNum} oleh ${payload.buyerName}.`,
                    false
                  );
                }
              });
            }

            resolve({
              success: true,
              data: {
                order_id: orderId,
                order_number: orderNum,
                total_amount: calculatedTotal,
                item_count: totalQty,
                status: 'PENDING_PAYMENT'
              } as any,
              message: `Pesanan PDH berhasil dibuat dengan Nomor Order: ${orderNum}`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getStudentOrders': {
            const userId = args[0];
            const existingOrders = getSimOrders();
            const userOrders = existingOrders.filter((o: any) => o.user_id === userId);

            resolve({
              success: true,
              data: userOrders as any,
              message: 'Daftar pesanan mahasiswa berhasil dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'uploadPaymentProof': {
            const userId = args[0];
            const orderId = args[1];
            const method = args[2] || 'TRANSFER';
            const fileBase64 = args[3];
            const fileName = args[4] || 'bukti_pembayaran.jpg';
            const mimeType = args[5] || 'image/jpeg';

            if (!fileBase64) {
              resolve({
                success: false,
                data: null,
                message: 'File bukti pembayaran wajib diunggah.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const ext = fileName.split('.').pop()?.toLowerCase() || '';
            const allowedExts = ['jpg', 'jpeg', 'png', 'pdf'];
            if (ext && !allowedExts.includes(ext)) {
              resolve({
                success: false,
                data: null,
                message: 'Format file tidak diperbolehkan. Hanya file JPG, JPEG, PNG, dan PDF yang diperbolehkan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const orders = getSimOrders();
            const idx = orders.findIndex((o: any) => o.order_id === orderId);

            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'Pesanan tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const now = new Date().toISOString();
            const fileId = `DRV-PROOF-${Date.now()}`;

            orders[idx].payment_method = method;
            orders[idx].payment_status = 'MENUNGGU APPROVAL';
            orders[idx].payment_proof_file_id = fileId;
            orders[idx].payment_proof_url = fileBase64.startsWith('data:') ? fileBase64 : `data:${mimeType};base64,${fileBase64}`;
            orders[idx].payment_uploaded_at = now;
            orders[idx].payment_rejection_reason = '';

            saveSimOrders(orders);
            addSimAuditLog(userId, 'UPLOAD_PAYMENT_PROOF', 'ORDER', `Order ID: ${orderId}, Method: ${method}, File: ${fileName}`);

            if (orders[idx].buyer_nim) {
              addSimNotification(
                orders[idx].buyer_nim,
                orders[idx].order_id,
                'PAYMENT_SUBMITTED',
                'Bukti Pembayaran Terkirim',
                `Bukti pembayaran untuk pesanan ${orders[idx].order_number} berhasil dikirim. Menunggu verifikasi dari Panitia.`,
                false
              );
            }

            resolve({
              success: true,
              data: orders[idx] as any,
              message: 'Bukti pembayaran berhasil diunggah. Status: MENUNGGU APPROVAL',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getAllPayments': {
            const orders = getSimOrders();

            resolve({
              success: true,
              data: orders as any,
              message: 'Daftar pembayaran berhasil dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'approvePayment': {
            const userId = args[0];
            const orderId = args[1];

            // 1. Role Validation
            const users = getSimUsers();
            const panitiaUser = users.find((u: any) => u.user_id === userId || u.username === userId);
            if (!panitiaUser || panitiaUser.role !== 'PANITIA') {
              resolve({
                success: false,
                data: null,
                message: 'Akses ditolak: Hanya Panitia yang berhak menyetujui pembayaran.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            // 2. Order ID Validation
            if (!orderId) {
              resolve({
                success: false,
                data: null,
                message: 'Order ID tidak valid.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const orders = getSimOrders();
            const idx = orders.findIndex((o: any) => o.order_id === orderId || o.order_number === orderId);

            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'Pesanan tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            // 3. Double Approval Prevention
            const currentOrder = orders[idx];
            if (currentOrder.payment_status === 'LUNAS' || currentOrder.payment_status === 'PAID') {
              resolve({
                success: false,
                data: null,
                message: 'Pembayaran pesanan ini sudah LUNAS / disetujui sebelumnya.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            // 4. Update Database Record
            const now = new Date().toISOString();
            const panitiaName = panitiaUser.name || panitiaUser.username || userId;

            orders[idx].payment_status = 'LUNAS';
            orders[idx].status = 'PEMBAYARAN LUNAS';
            orders[idx].payment_approved_at = now;
            orders[idx].payment_approved_by = panitiaName;
            orders[idx].updated_at = now;

            saveSimOrders(orders);
            addSimAuditLog(userId, 'APPROVE_PAYMENT', 'ORDER', `Order ID: ${orderId}, Status: LUNAS, Approved By: ${panitiaName}`);

            if (orders[idx].buyer_nim) {
              addSimNotification(
                orders[idx].buyer_nim,
                orders[idx].order_id,
                'PAYMENT_APPROVED',
                'Pembayaran Lunas & Disetujui',
                `Selamat! Pembayaran untuk pesanan ${orders[idx].order_number} telah diverifikasi LUNAS oleh Panitia.`,
                true
              );
            }

            resolve({
              success: true,
              data: orders[idx] as any,
              message: 'Pembayaran berhasil disetujui.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'rejectPayment': {
            const userId = args[0];
            const orderId = args[1];
            const reason = args[2];

            if (!reason || !String(reason).trim()) {
              resolve({
                success: false,
                data: null,
                message: 'Alasan penolakan wajib diisi oleh Panitia.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const orders = getSimOrders();
            const idx = orders.findIndex((o: any) => o.order_id === orderId);

            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'Pesanan tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            orders[idx].payment_status = 'DITOLAK';
            orders[idx].payment_rejection_reason = String(reason).trim();

            saveSimOrders(orders);
            addSimAuditLog(userId, 'REJECT_PAYMENT', 'ORDER', `Order ID: ${orderId}, Reason: ${reason}`);

            if (orders[idx].buyer_nim) {
              addSimNotification(
                orders[idx].buyer_nim,
                orders[idx].order_id,
                'PAYMENT_REJECTED',
                'Pembayaran Ditolak',
                `Pembayaran untuk pesanan ${orders[idx].order_number} ditolak oleh Panitia. Alasan: ${reason}. Silakan unggah ulang bukti transfer valid.`,
                true
              );
            }

            resolve({
              success: true,
              data: orders[idx] as any,
              message: `Pembayaran ditolak. Alasan: ${reason}`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getAllOrdersPanitia': {
            const orders = getSimOrders();

            resolve({
              success: true,
              data: orders as any,
              message: 'Daftar seluruh pesanan berhasil dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'updateOrderDetails': {
            const userId = args[0];
            const orderId = args[1];
            const payload = args[2];

            const classRegex = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;
            const buyerClassClean = String(payload.buyer_class || '').trim().toUpperCase();

            if (!classRegex.test(buyerClassClean)) {
              resolve({
                success: false,
                data: null,
                message: 'Format kelas pemesan tidak valid! Contoh: 01MJSP001',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const master = getSimPDHMaster();
            const basePrice = master.pricing.price || 185000;
            const activeSizesMap: Record<string, number> = {};
            master.sizes.forEach((s) => {
              if (s.status === 'ACTIVE') activeSizesMap[s.size_code.toUpperCase()] = s.extra_fee || 0;
            });

            const updatedItems = payload.items || [];
            let calculatedTotal = 0;
            let totalQty = 0;

            for (let i = 0; i < updatedItems.length; i++) {
              const itm = updatedItems[i];
              const itmClass = String(itm.class_name || buyerClassClean).trim().toUpperCase();
              const sizeCode = String(itm.size_code || 'M').trim().toUpperCase();
              const qty = Math.max(1, parseInt(itm.quantity || 1, 10));

              if (!classRegex.test(itmClass)) {
                resolve({
                  success: false,
                  data: null,
                  message: `Format kelas anggota ${itm.student_name || i + 1} tidak valid.`,
                  timestamp: new Date().toISOString()
                });
                return;
              }

              const extra = activeSizesMap[sizeCode] !== undefined ? activeSizesMap[sizeCode] : 0;
              const unitPrice = basePrice + extra;
              const subtotal = unitPrice * qty;

              calculatedTotal += subtotal;
              totalQty += qty;

              itm.unit_price = unitPrice;
              itm.subtotal = subtotal;
              itm.class_name = itmClass;
              itm.size_code = sizeCode;
            }

            const orders = getSimOrders();
            const idx = orders.findIndex((o: any) => o.order_id === orderId);

            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'Pesanan tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const beforeOrder = { ...orders[idx] };
            const now = new Date().toISOString();

            orders[idx].buyer_name = String(payload.buyer_name).trim();
            orders[idx].buyer_nim = String(payload.buyer_nim).trim();
            orders[idx].buyer_class = buyerClassClean;
            orders[idx].buyer_whatsapp = String(payload.buyer_whatsapp || '').trim();
            orders[idx].notes = String(payload.notes || '').trim();
            orders[idx].items = updatedItems;
            orders[idx].total_amount = calculatedTotal;
            orders[idx].item_count = totalQty;
            orders[idx].updated_at = now;

            saveSimOrders(orders);
            addSimAuditLog(userId, 'EDIT_ORDER', 'ORDER', `Order ID: ${orderId}, Buyer: ${payload.buyer_name}, Total: Rp ${calculatedTotal.toLocaleString('id-ID')}`);

            resolve({
              success: true,
              data: orders[idx] as any,
              message: 'Data pesanan berhasil diperbarui dan disimpan ke database.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'cancelOrder': {
            const userId = args[0];
            const orderId = args[1];
            const cancelReason = args[2];

            if (!cancelReason || !String(cancelReason).trim()) {
              resolve({
                success: false,
                data: null,
                message: 'Alasan pembatalan pesanan wajib diisi oleh Panitia.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const orders = getSimOrders();
            const idx = orders.findIndex((o: any) => o.order_id === orderId);

            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'Pesanan tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const now = new Date().toISOString();
            orders[idx].status = 'DIBATALKAN';
            orders[idx].cancel_reason = String(cancelReason).trim();
            orders[idx].updated_at = now;

            saveSimOrders(orders);
            addSimAuditLog(userId, 'CANCEL_ORDER', 'ORDER', `Order ID: ${orderId}, Reason: ${cancelReason}`);

            resolve({
              success: true,
              data: orders[idx] as any,
              message: 'Pesanan berhasil dibatalkan. Record tetap tersimpan di database.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'updateOrderStatus': {
            const userId = args[0];
            const orderId = args[1];
            const newStatus = args[2];

            const orders = getSimOrders();
            const idx = orders.findIndex((o: any) => o.order_id === orderId);

            if (idx < 0) {
              resolve({
                success: false,
                data: null,
                message: 'Pesanan tidak ditemukan.',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const now = new Date().toISOString();
            orders[idx].status = newStatus;
            orders[idx].updated_at = now;

            saveSimOrders(orders);
            addSimAuditLog(userId, 'UPDATE_ORDER_STATUS', 'ORDER', `Order ID: ${orderId}, New Status: ${newStatus}`);

            resolve({
              success: true,
              data: orders[idx] as any,
              message: `Status pesanan diperbarui menjadi ${newStatus}.`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'importStudents': {
            const panitiaUserId = args[0];
            const filename = String(args[1] || 'import_mahasiswa.xlsx');
            const studentRows = Array.isArray(args[2]) ? args[2] : [];
            const confirmSave = Boolean(args[3]);

            const classRegex = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            const existingUsers = getSimUsers();
            const existingNIMs = new Set(existingUsers.map((u: any) => String(u.nim || u.username || '').toLowerCase()).filter(Boolean));
            const existingEmails = new Set(existingUsers.map((u: any) => String(u.email || '').toLowerCase()).filter(Boolean));

            const fileNIMs = new Set<string>();
            const fileEmails = new Set<string>();

            const errors: Array<{ row: number; nim?: string; name?: string; message: string }> = [];
            const validData: Array<{ nim: string; name: string; className: string; email: string; phone: string }> = [];

            studentRows.forEach((row: any, idx: number) => {
              const rowNum = idx + 2; // Row 1 is header
              const nim = String(row.nim || row.NIM || '').trim();
              const name = String(row.name || row.Nama || row.nama || '').trim();
              const className = String(row.className || row.Kelas || row.kelas || '').trim().toUpperCase();
              const email = String(row.email || row.Email || '').trim().toLowerCase();
              const phone = String(row.phone || row.phoneNo || row['No WhatsApp'] || row['No. WhatsApp'] || row['No HP'] || '').trim();

              const rowErrors: string[] = [];

              if (!nim) {
                rowErrors.push('NIM wajib diisi');
              } else {
                if (fileNIMs.has(nim.toLowerCase())) {
                  rowErrors.push(`NIM '${nim}' terdeteksi duplikat pada file import`);
                } else {
                  fileNIMs.add(nim.toLowerCase());
                }
                if (existingNIMs.has(nim.toLowerCase())) {
                  rowErrors.push(`NIM '${nim}' sudah terdaftar di database existing`);
                }
              }

              if (!name) {
                rowErrors.push('Nama Mahasiswa wajib diisi');
              }

              if (!className) {
                rowErrors.push('Kelas wajib diisi');
              } else if (!classRegex.test(className)) {
                rowErrors.push(`Format Kelas '${className}' tidak valid. Harus berformat ##MJSP###, ##MJSM###, atau ##MJSE### (Contoh: 01MJSP001)`);
              }

              if (!email) {
                rowErrors.push('Email wajib diisi');
              } else if (!emailRegex.test(email)) {
                rowErrors.push(`Format Email '${email}' tidak valid`);
              } else {
                if (fileEmails.has(email)) {
                  rowErrors.push(`Email '${email}' terdeteksi duplikat pada file import`);
                } else {
                  fileEmails.add(email);
                }
                if (existingEmails.has(email)) {
                  rowErrors.push(`Email '${email}' sudah digunakan akun lain di database`);
                }
              }

              if (rowErrors.length > 0) {
                errors.push({
                  row: rowNum,
                  nim: nim || '-',
                  name: name || '-',
                  message: rowErrors.join('; ')
                });
              } else {
                validData.push({
                  nim,
                  name,
                  className,
                  email,
                  phone: phone || '-'
                });
              }
            });

            let importedCount = 0;
            if (confirmSave && validData.length > 0) {
              const now = new Date().toISOString();
              const newUsers = validData.map((item) => ({
                user_id: `USR-MHS-${item.nim}`,
                username: item.nim,
                nim: item.nim,
                name: item.name,
                class_name: item.className,
                email: item.email,
                phone: item.phone,
                password_hash: hashSimPassword('123456'),
                role: 'MAHASISWA',
                status: 'TERVERIFIKASI',
                created_at: now,
                updated_at: now
              }));

              const updatedUsers = [...existingUsers, ...newUsers];
              localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
              importedCount = newUsers.length;

              addSimAuditLog(
                panitiaUserId,
                'IMPORT_STUDENTS',
                'USER',
                `File: ${filename}, Total File: ${studentRows.length}, Berhasil: ${importedCount}, Gagal: ${errors.length}`
              );
            }

            resolve({
              success: true,
              data: {
                totalRows: studentRows.length,
                validRowsCount: validData.length,
                invalidRowsCount: errors.length,
                errors,
                validData,
                importedCount
              } as any,
              message: confirmSave
                ? `Berhasil mengimport ${importedCount} data mahasiswa ke database.`
                : `Analisis file import selesai: ${validData.length} valid, ${errors.length} invalid.`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'importCollectiveMembers': {
            const panitiaUserId = args[0];
            const filename = String(args[1] || 'import_anggota_kolektif.xlsx');
            const memberRows = Array.isArray(args[2]) ? args[2] : [];
            const confirmSave = Boolean(args[3]);

            const classRegex = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;
            const orders = getSimOrders();
            const masterPDH = getSimPDHMaster();
            const activeSizeCodes = new Set(
              (masterPDH.sizes || []).filter((s: any) => s.status === 'ACTIVE').map((s: any) => String(s.size_code).toUpperCase())
            );

            // Existing registered NIMs in any order item
            const registeredOrderNIMs = new Map<string, string>(); // nim -> order_number
            orders.forEach((o: any) => {
              (o.items || []).forEach((itm: any) => {
                if (itm.nim) {
                  registeredOrderNIMs.set(String(itm.nim).toLowerCase(), o.order_number);
                }
              });
            });

            // Tracking duplicate NIMs per order in file
            const fileOrderNIMs = new Map<string, Set<string>>();

            const errors: Array<{ row: number; nim?: string; name?: string; message: string }> = [];
            const validData: Array<{ orderNumber: string; nim: string; name: string; className: string; sizeCode: string }> = [];

            memberRows.forEach((row: any, idx: number) => {
              const rowNum = idx + 2;
              const orderNumber = String(row.orderNumber || row['No Pesanan'] || row['No. Pesanan'] || row.no_pesanan || '').trim();
              const nim = String(row.nim || row.NIM || '').trim();
              const name = String(row.name || row.Nama || row.nama || '').trim();
              const className = String(row.className || row.Kelas || row.kelas || '').trim().toUpperCase();
              const sizeCode = String(row.sizeCode || row.Ukuran || row.ukuran || '').trim().toUpperCase();

              const rowErrors: string[] = [];

              if (!orderNumber) {
                rowErrors.push('No Pesanan wajib diisi');
              } else {
                const targetOrder = orders.find((o: any) => String(o.order_number).toUpperCase() === orderNumber.toUpperCase());
                if (!targetOrder) {
                  rowErrors.push(`No Pesanan '${orderNumber}' tidak ditemukan di database`);
                } else if (targetOrder.order_type !== 'KOLEKTIF') {
                  rowErrors.push(`Pesanan '${orderNumber}' tipe-nya bukan KOLEKTIF`);
                }
              }

              if (!nim) {
                rowErrors.push('NIM wajib diisi');
              } else {
                if (orderNumber) {
                  if (!fileOrderNIMs.has(orderNumber)) {
                    fileOrderNIMs.set(orderNumber, new Set());
                  }
                  const orderNimSet = fileOrderNIMs.get(orderNumber)!;
                  if (orderNimSet.has(nim.toLowerCase())) {
                    rowErrors.push(`NIM '${nim}' terdeteksi duplikat untuk pesanan ${orderNumber} di file import`);
                  } else {
                    orderNimSet.add(nim.toLowerCase());
                  }
                }

                if (registeredOrderNIMs.has(nim.toLowerCase())) {
                  const existingOrderNum = registeredOrderNIMs.get(nim.toLowerCase());
                  rowErrors.push(`NIM '${nim}' sudah terdaftar sebagai anggota pada pesanan ${existingOrderNum}`);
                }
              }

              if (!name) {
                rowErrors.push('Nama wajib diisi');
              }

              if (!className) {
                rowErrors.push('Kelas wajib diisi');
              } else if (!classRegex.test(className)) {
                rowErrors.push(`Format Kelas '${className}' tidak valid (Gunakan format ##MJSP###, ##MJSM###, ##MJSE###)`);
              }

              if (!sizeCode) {
                rowErrors.push('Ukuran wajib diisi');
              } else if (!activeSizeCodes.has(sizeCode)) {
                const validSizesStr = Array.from(activeSizeCodes).join(', ');
                rowErrors.push(`Ukuran '${sizeCode}' tidak valid/tidak aktif di Master PDH. Pilihan aktif: ${validSizesStr}`);
              }

              if (rowErrors.length > 0) {
                errors.push({
                  row: rowNum,
                  nim: nim || '-',
                  name: name || '-',
                  message: rowErrors.join('; ')
                });
              } else {
                validData.push({
                  orderNumber,
                  nim,
                  name,
                  className,
                  sizeCode
                });
              }
            });

            let importedCount = 0;
            if (confirmSave && validData.length > 0) {
              const basePrice = masterPDH.pricing?.price || 185000;
              const sizeMap = new Map((masterPDH.sizes || []).map((s: any) => [String(s.size_code).toUpperCase(), s]));

              // Group valid items by orderNumber
              const itemsByOrder = new Map<string, typeof validData>();
              validData.forEach((item) => {
                const key = item.orderNumber.toUpperCase();
                if (!itemsByOrder.has(key)) itemsByOrder.set(key, []);
                itemsByOrder.get(key)!.push(item);
              });

              itemsByOrder.forEach((newMembers, ordNum) => {
                const orderIdx = orders.findIndex((o: any) => String(o.order_number).toUpperCase() === ordNum);
                if (orderIdx >= 0) {
                  const targetOrd = orders[orderIdx];
                  const existingItems = targetOrd.items || [];

                  const addedItems = newMembers.map((m) => {
                    const sizeObj = sizeMap.get(m.sizeCode);
                    const extraFee = sizeObj ? Number(sizeObj.extra_fee || 0) : 0;

                    return {
                      item_id: `ITM-${targetOrd.order_id}-${m.nim}`,
                      student_name: m.name,
                      nim: m.nim,
                      student_class: m.className,
                      size_code: m.sizeCode,
                      custom_name: m.name,
                      extra_fee: extraFee
                    };
                  });

                  const updatedItems = [...existingItems, ...addedItems];
                  const totalQty = updatedItems.length;
                  const totalExtraFees = updatedItems.reduce((acc: number, itm: any) => acc + (Number(itm.extra_fee) || 0), 0);
                  const newTotalAmount = (basePrice * totalQty) + totalExtraFees;

                  targetOrd.items = updatedItems;
                  targetOrd.quantity = totalQty;
                  targetOrd.extra_fees = totalExtraFees;
                  targetOrd.total_amount = newTotalAmount;
                  targetOrd.updated_at = new Date().toISOString();

                  importedCount += addedItems.length;
                }
              });

              saveSimOrders(orders);

              addSimAuditLog(
                panitiaUserId,
                'IMPORT_COLLECTIVE_MEMBERS',
                'ORDER_ITEM',
                `File: ${filename}, Total File: ${memberRows.length}, Berhasil: ${importedCount}, Gagal: ${errors.length}`
              );
            }

            resolve({
              success: true,
              data: {
                totalRows: memberRows.length,
                validRowsCount: validData.length,
                invalidRowsCount: errors.length,
                errors,
                validData,
                importedCount
              } as any,
              message: confirmSave
                ? `Berhasil mengimport ${importedCount} anggota pesanan kolektif ke database.`
                : `Analisis file import selesai: ${validData.length} valid, ${errors.length} invalid.`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'logExportData': {
            const panitiaUserId = args[0];
            const exportType = String(args[1] || 'ALL');
            const rowCount = Number(args[2] || 0);

            addSimAuditLog(
              panitiaUserId,
              'EXPORT_DATA',
              'DATABASE',
              `Jenis Export: ${exportType.toUpperCase()}, Jumlah Data: ${rowCount} baris`
            );

            resolve({
              success: true,
              data: null,
              message: `Audit log export ${exportType} berhasil dicatat.`,
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getStudentNotifications': {
            const userIdOrNim = String(args[0] || '').trim();
            const notifs = getSimNotifications();
            const users = getSimUsers();
            const currentUser = users.find((u: any) => u.user_id === userIdOrNim || u.username === userIdOrNim || u.nim === userIdOrNim);
            const targetNim = currentUser?.nim || currentUser?.username || userIdOrNim;

            const myNotifs = notifs.filter(
              (n: any) =>
                String(n.nim).toLowerCase() === String(targetNim).toLowerCase() ||
                String(n.nim).toLowerCase() === String(userIdOrNim).toLowerCase()
            );

            resolve({
              success: true,
              data: myNotifs as any,
              message: 'Notifikasi berhasil dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'markNotificationAsRead': {
            const userIdOrNim = String(args[0] || '').trim();
            const notifId = String(args[1] || '').trim();

            const notifs = getSimNotifications();
            const idx = notifs.findIndex((n: any) => n.notification_id === notifId);

            if (idx >= 0) {
              notifs[idx].read_status = true;
              saveSimNotifications(notifs);
            }

            resolve({
              success: true,
              data: null,
              message: 'Notifikasi ditandai sebagai dibaca.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'markAllNotificationsAsRead': {
            const userIdOrNim = String(args[0] || '').trim();
            const users = getSimUsers();
            const currentUser = users.find((u: any) => u.user_id === userIdOrNim || u.username === userIdOrNim || u.nim === userIdOrNim);
            const targetNim = currentUser?.nim || currentUser?.username || userIdOrNim;

            const notifs = getSimNotifications();
            notifs.forEach((n: any) => {
              if (
                String(n.nim).toLowerCase() === String(targetNim).toLowerCase() ||
                String(n.nim).toLowerCase() === String(userIdOrNim).toLowerCase()
              ) {
                n.read_status = true;
              }
            });

            saveSimNotifications(notifs);

            resolve({
              success: true,
              data: null,
              message: 'Semua notifikasi ditandai telah dibaca.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getPanitiaAlerts': {
            const panitiaUserId = args[0];
            const orders = getSimOrders();

            const pendingPaymentsCount = orders.filter((o: any) => o.payment_status === 'MENUNGGU APPROVAL').length;
            const pendingOrdersCount = orders.filter((o: any) => o.status === 'PENDING_PAYMENT').length;
            const productionActiveCount = orders.filter((o: any) => o.production_status === 'Sedang Diproduksi').length;
            const readyPickupCount = orders.filter((o: any) => o.pickup_status === 'Siap Diambil').length;

            const alertsList = [
              { id: 'ALT-01', title: 'Pembayaran Menunggu Approval', count: pendingPaymentsCount, type: 'PAYMENT', message: `${pendingPaymentsCount} bukti transfer menunggu verifikasi.` },
              { id: 'ALT-02', title: 'Pesanan Menunggu Pembayaran', count: pendingOrdersCount, type: 'ORDER', message: `${pendingOrdersCount} pesanan belum dibayar.` },
              { id: 'ALT-03', title: 'Progres Produksi Aktif', count: productionActiveCount, type: 'PRODUCTION', message: `${productionActiveCount} pesanan sedang dikerjakan vendor.` },
              { id: 'ALT-04', title: 'Pesanan Siap Diambil', count: readyPickupCount, type: 'PICKUP', message: `${readyPickupCount} pesanan siap diserahkan.` }
            ];

            resolve({
              success: true,
              data: {
                pendingPaymentsCount,
                pendingOrdersCount,
                productionActiveCount,
                readyPickupCount,
                alertsList
              } as any,
              message: 'Panitia alerts dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }

          case 'getAllStudentsPanitia': {
            const users = getSimUsers();
            const students = users.filter((u: any) => u.role === 'MAHASISWA' || u.nim || u.class_name);
            resolve({
              success: true,
              data: students as any,
              message: 'Daftar data mahasiswa berhasil dimuat.',
              timestamp: new Date().toISOString()
            });
            break;
          }




          default:
            resolve({
              success: true,
              data: null,
              message: `Fungsi '${funcName}' berhasil dipanggil di backend GAS.`,
              timestamp: new Date().toISOString()
            });
        }
      } catch (e: any) {
        resolve({
          success: false,
          data: null,
          message: e.message || 'Simulation error',
          timestamp: new Date().toISOString()
        });
      }
    }, 200);
  });
}
