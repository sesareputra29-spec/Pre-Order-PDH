# PDH CAMPUS ORDER — MASTER RELEASE INFORMATION

---

### INFORMASI PRODUK
- **Nama Aplikasi**: PDH Campus Order
- **Versi**: 1.0.0 (Master Production Release)
- **Kategori**: Multi-Tenant Campus Pre-Order, Payment Verification & Apparel Manufacturing ERP
- **Model Distribusi**: Jual-Putus / Self-Hosted per Program Studi & Himpunan Mahasiswa
- **Status Rilis**: `MASTER RELEASE (READY FOR PRODUCTION)`

---

### ARSITEKTUR SISTEM
- **Pola Arsitektur**: Single-Page Application (SPA) + Serverless Backend API Architecture
- **Frontend Layer**: 
  - Framework: React 19 (TypeScript)
  - Build Tool: Vite
  - Styling: Tailwind CSS v4 (Design Constitution Anti-Slop, Mobile & Desktop Responsive)
  - Icons: Lucide React
  - Client Routing & State: Local State + Centralized Typed API Client (`apiClient.ts`)
- **Backend Layer**:
  - Runtime: Node.js (TypeScript with `tsx`)
  - Server Framework: Express.js (mounted with Vite middlewares in dev, Serverless Handler for Vercel)
  - Security Middlewares: JWT Authentication, Multi-Tenant Resolution (`requireTenant`), Role-Based Access Control (`requirePanitia`, `requireMahasiswa`), Audit Trail Logging, Rate Limiter
- **Database (Persistence Layer)**:
  - Source of Truth: Google Sheets API v4
  - Model: 12 Tables per Tenant (`Users`, `Students`, `Orders`, `OrderMembers`, `Payments`, `PaymentProofs`, `ProductionProgress`, `Notifications`, `AuditLogs`, `Configs`, `Periods`, `Tokens`)
  - Performance: Cache Synchronization Layer dengan In-Memory TTL & Automatic Cache Invalidation
- **File & Media Storage**:
  - Storage Engine: Google Drive API v3
  - Struktur Folder: `[Prodi Root] / Manajemen / [DESAIN_PDH | PEMBAYARAN | PROGRESS_PRODUKSI]`
  - Metadata: Disimpan sebagai `drive_file_id` dan `file_url` (tanpa binary blob di database)
- **Transactional Email Dispatcher**:
  - Engine: Resend API v2 (Server-Side Dispatcher)
  - Fitur: Verifikasi akun registrasi mahasiswa (`sendVerificationEmail`) & reset password tautan token (`sendPasswordResetEmail`)
  - Keamanan: `RESEND_API_KEY` terproteksi 100% di server-side (tanpa prefix `VITE_`)
- **Cloud Hosting & Deployment Target**:
  - Target: Vercel Serverless Platform (`vercel.json` rewrite routing ke `server.ts` & static SPA assets)
  - Port Dev: 3000

---

### FITUR UTAMA & BOUNDARY
1. **Multi-Tenant Isolation**: Setiap Program Studi terisolasi total menggunakan spreadsheet dan root folder Drive mandiri.
2. **Initial Admin Security (FASE J1-A)**:
   - Inisialisasi aman akun Panitia pertama kali via form setup.
   - Setup Lock otomatis terpasang setelah akun pertama aktif.
   - Password dienkripsi menggunakan cryptographic hashing (SHA-256 + Salt).
3. **Student Account Security**:
   - Registrasi mahasiswa dengan status awal `PENDING_VERIFICATION`.
   - Pencegahan login sebelum verifikasi token email.
   - Reset password berbasis single-use cryptographic token.
4. **Pemesanan PDH (Mandiri & Kolektif)**:
   - Form pemesanan mandiri & kolektif per kelas.
   - Validasi size chart, nama dada, dan kalkulasi total otomatis.
5. **Pembayaran & Verifikasi**:
   - Multi-metode (Transfer Bank BCA, Mandiri, BRI, QRIS, Tunai).
   - Upload bukti bayar ke Google Drive.
   - Verifikasi approval / rejection dilindungi RBAC khusus Panitia.
6. **Pelacakan Produksi & SPK Konveksi**:
   - Pemantauan progres vendor konveksi (0% - 100%) & dokumentasi foto.
   - Cetak SPK Konveksi dan Laporan Rekapitulasi PDF Server-Side.
7. **Notifikasi & Audit Trail**:
   - Notifikasi in-app otomatis saat status pesanan/pembayaran berubah.
   - Pencatatan aktivitas kritis append-only dengan sanitasi kredensial otomatis (`[REDACTED]`).

---

### STATUS PENGUJIAN & VERIFIKASI

| Kategori Pengujian | Cakupan Pengujian | Status |
| :--- | :--- | :---: |
| **Initial Admin Suite** | 12 Pengujian Keamanan Setup Awal & Setup Lock | `✅ PASS` |
| **Final Acceptance Suite** | 15 Kategori Pengujian Produksi End-to-End | `✅ PASS` |
| **Authentication Suite** | 20 Pengujian Verifikasi Akun, Email & Reset Password | `✅ PASS` |
| **Fase 2 - 9 Regression** | 171 Pengujian Regresi Lengkap Seluruh Modul Backend | `✅ PASS` |
| **Cache Synchronization** | 9 Pengujian Multi-Instance Serverless & TTL Consistency | `✅ PASS` |
| **Static Code Analysis** | TypeScript Linting (`tsc --noEmit`) | `✅ 0 Error` |
| **Production Build** | Full-Stack Bundle Compilation (`npm run build`) | `✅ Success` |

---

### KELAYAKAN MASTER RELEASE

**Verdict**: `MASTER RELEASE READY FOR PRODUCTION DISTRIBUTION` 🚀
Aplikasi ini telah memenuhi seluruh kriteria kelayakan produksi, keamanan enterprise, isolasi data akademik, dan siap diserahterimakan kepada Program Studi pembeli.
