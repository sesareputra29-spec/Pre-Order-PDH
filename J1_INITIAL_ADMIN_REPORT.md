# LAPORAN FASE J1-A: INITIAL ADMIN SECURITY
## Sistem Multi-Tenant Pre-Order PO PDH & Baju Himpunan Kampus

---

### 1. PERUBAHAN
1. **`UserService` & `AuthService` Layer**:
   - Menambahkan method `hasActiveAdmin(tenantId: string)` untuk memeriksa apakah tenant memiliki akun dengan `role === 'PANITIA' && status === 'ACTIVE'`.
   - Menambahkan method `setupInitialAdmin(tenantId: string, payload)` untuk mendaftarkan akun Panitia pertama kali pada tenant baru dengan validasi password, cryptographic hashing, dan aktivasi langsung (`ACTIVE`).
   - Menerapkan **Setup Lock Mechanism**: Penolakan tegas (`403/400`) jika tenant sudah memiliki akun Panitia aktif.
2. **Setup Routing (`setupRoutes.ts`)**:
   - Dibuat controller endpoint `/api/setup` dengan resolusi tenant otomatis.
   - Endpoint `GET /api/setup/status` untuk pengecekan status inisialisasi admin prodi.
   - Endpoint `POST /api/setup/admin` untuk registrasi aman administrator pertama.
3. **Master API Router (`apiRouter.ts`)**:
   - Memasang `apiRouter.use('/setup', setupRouter)`.
4. **Audit Service (`auditService.ts`)**:
   - Menambahkan action type `'INITIAL_ADMIN_SETUP'` ke dalam union `AuditAction`.
5. **Frontend Flow (`LoginView.tsx` & `apiClient.ts`)**:
   - Menambahkan deteksi otomatis kebutuhan setup awal pada saat view dimuat.
   - Menyediakan form **Inisialisasi Administrator Panitia** (`setup_admin`) yang hanya tampil jika tenant belum memiliki Panitia aktif.
   - Mengalihkan otomatis ke login setelah setup berhasil.

---

### 2. ENDPOINT BARU

| Method | Endpoint | Auth | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/setup/status` | Public (Scoped by Tenant) | Mengembalikan status apakah tenant membutuhkan initial setup (`has_active_admin`, `is_setup_needed`). |
| `POST` | `/api/setup/admin` | Public (Scoped by Tenant, Locked post-setup) | Mendaftarkan administrator PANITIA pertama kali untuk tenant yang belum memiliki Panitia aktif. |

---

### 3. FLOW INITIAL SETUP

```
[Tenant Fresh / Baru Dibuka]
           │
           ▼
[GET /api/setup/status] ──► has_active_admin = false, is_setup_needed = true
           │
           ▼
[Form Setup Administrator Panitia] ──► Nama, Email, Password, Konfirmasi Password
           │
           ▼
[POST /api/setup/admin] ──► 1. Validasi Input (Min. 6 Karakter, Format Email)
                            2. Cryptographic Password Hashing (SHA-256 with Salt)
                            3. Buat User: Role=PANITIA, Status=ACTIVE
                            4. Catat Audit Trail: INITIAL_ADMIN_SETUP
                            5. Setup Lock Terpasang (has_active_admin = true)
           │
           ▼
[Redirect ke Login] ──► Login dengan Email/Username & Password Baru
```

---

### 4. SECURITY

- **Anti-Hardcoded Credentials**: Tidak ada kredensial bawaan default (`admin/admin123` dsb). Administrator menentukan kredensial aman sendiri saat inisialisasi.
- **Cryptographic Hashing**: Password di-hash menggunakan salt sebelum disimpan di Google Sheets / database.
- **Credential Redaction**: Plaintext password dan password hash 100% tersanitasi dari response API.
- **Setup Lock**: Setelah akun Panitia pertama dibuat, endpoint initial setup terkunci permanen. Upaya eksekusi kedua ditolak dengan pesan `"Setup awal Panitia sudah selesai untuk tenant ini."`.
- **Privilege Escalation Guard**: Mahasiswa atau pihak luar tidak dapat menggunakan endpoint ini untuk mengangkat akun menjadi Panitia.

---

### 5. TENANT ISOLATION

- Setup awal terikat secara mutlak pada tenant aktif melalui header `x-tenant-id` atau resolusi subdomain prodi.
- Pembuatan akun Panitia pada Tenant A (`TENANT-001`) tidak mempengaruhi atau membocorkan data ke Tenant B (`TENANT-002`).
- Percobaan manipulasi tenant / login lintas tenant ditolak secara konsisten.

---

### 6. AUDIT LOG

Setiap inisialisasi administrator tercatat secara persisten pada tab `AuditLogs` Google Sheets:
- **Action**: `INITIAL_ADMIN_SETUP`
- **Actor/User**: ID akun Panitia yang baru dibuat
- **Tenant ID**: ID tenant bersangkutan
- **Non-sensitive Details**: Nama dan email administrator prodi (tanpa mencatat password, hash, atau secret).

---

### 7. TEST RESULT (FASE J1-A AUTOMATED SUITE)

| No | Kasus Uji | Ekspektasi | Hasil |
| :---: | :--- | :--- | :---: |
| 1 | Deteksi Tenant Belum Setup | `hasActiveAdmin = false`, `isSetupNeeded = true` | `✅ PASS` |
| 2 | Pembuatan Initial Admin | Akun Panitia pertama berhasil dibuat | `✅ PASS` |
| 3 | Penyimpanan Password Hash | Password tersimpan sebagai cryptographic hash | `✅ PASS` |
| 4 | Ketiadaan Password Plaintext | Plaintext password tidak disimpan di database | `✅ PASS` |
| 5 | Role Akun | Role terdaftar sebagai `PANITIA` | `✅ PASS` |
| 6 | Status Akun | Status akun langsung `ACTIVE` | `✅ PASS` |
| 7 | Tenant Isolation | Admin Tenant B tidak bocor ke Tenant A | `✅ PASS` |
| 8 | Setup Lock | Percobaan setup kedua ditolak | `✅ PASS` |
| 9 | Login Panitia | Panitia dapat login dengan password yang dibuat | `✅ PASS` |
| 10 | Pencatatan Audit Trail | Event `INITIAL_ADMIN_SETUP` tercatat di log | `✅ PASS` |
| 11 | Sanitasi Response | Kredensial rahasia tidak bocor dalam response | `✅ PASS` |
| 12 | Penolakan Akses Lintas Tenant | Upaya login lintas tenant ditolak | `✅ PASS` |

**Total Test J1-A**: **12 / 12 PASS (100%)**

---

### 8. REGRESSION RESULT

| Test Suite | Deskripsi | Hasil |
| :--- | :--- | :---: |
| `npm run test:initial-admin` | FASE J1-A Initial Admin Security | `✅ 12/12 PASS` |
| `npm run test:final` | Final Production Acceptance Test Suite | `✅ 15/15 PASS` |
| `npm run test:auth` | Authentication Tokens & Email Dispatcher | `✅ 20/20 PASS` |
| `npm run test:fase2` | Core Backend & JWT Security | `✅ 13/13 PASS` |
| `npm run test:fase3` | Master PDH, Sizes & Images | `✅ 20/20 PASS` |
| `npm run test:fase4` | Orders & Members Management | `✅ 22/22 PASS` |
| `npm run test:fase5` | Payments & Proof Verification | `✅ 22/22 PASS` |
| `npm run test:fase6` | Production Progress & Tracking | `✅ 17/17 PASS` |
| `npm run test:fase7` | Notifications & Audit Trail | `✅ 29/29 PASS` |
| `npm run test:fase8` | Reports & Server-Side PDF | `✅ 18/18 PASS` |
| `npm run test:fase9` | End-to-End System Workflow | `✅ 16/16 PASS` |
| `npm run test:cache` | Cache Consistency & Multi-Instance | `✅ 9/9 PASS` |

---

### 9. LINT RESULT
- **Command**: `npm run lint` (`tsc --noEmit`)
- **Hasil**: `0 Error` (Clean TypeScript Compilation)

---

### 10. BUILD RESULT
- **Command**: `npm run build`
- **Hasil**: `Build Succeeded` (Vite SPA + Express Serverless Handler)

---

### 11. FINDING
- **Temuan**: Sebelumnya enum `AuditAction` belum menyertakan `'INITIAL_ADMIN_SETUP'`.
- **Solusi**: Action `'INITIAL_ADMIN_SETUP'` telah ditambahkan ke `AuditAction` union type di `src/server/services/auditService.ts`.

---

### 12. FINAL STATUS

**J1-A INITIAL ADMIN SECURITY = COMPLETED** 🚀
