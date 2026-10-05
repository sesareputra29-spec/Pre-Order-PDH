# CHECKLIST PRAKTIS INSTALASI VENDOR (VENDOR INSTALLATION CHECKLIST)
## PDH Campus Order — Master Release v1.0.0

Checklist ini wajib digunakan oleh Engineer Vendor pada setiap sesi instalasi deployment sistem untuk Program Studi baru.

---

### A. CLIENT READINESS
- [ ] Formulir `INSTALLATION_INPUT_TEMPLATE.md` telah diisi lengkap oleh Klien
- [ ] Identitas Universitas, Fakultas, Program Studi, dan Kode Prodi terverifikasi
- [ ] Domain / Subdomain Klien telah disiapkan (jika menggunakan custom domain)

### B. VERCEL CONFIGURATION
- [ ] Akun Vercel Klien telah aktif dan memiliki izin deployment
- [ ] Project Vercel baru telah dibuat dengan preset `Vite`
- [ ] Build Command diatur ke `npm run build` dan Output Directory ke `dist`
- [ ] Framework rewrites `vercel.json` aktif melayani `/api/*` dan `/*`

### C. GOOGLE CLOUD PLATFORM
- [ ] Project GCP Klien aktif
- [ ] Google Sheets API v4 telah diaktifkan (*Enabled*)
- [ ] Google Drive API v3 telah diaktifkan (*Enabled*)
- [ ] Service Account telah dibuat dan JSON Key telah diunduh
- [ ] Email Service Account dan Private Key terverifikasi valid

### D. GOOGLE SHEETS PERSISTENCE
- [ ] 1 File Spreadsheet kosong telah dibuat di Google Drive Klien
- [ ] Spreadsheet telah dibagikan ke Service Account sebagai **Editor**
- [ ] Spreadsheet ID telah disalin dan dimasukkan ke konfigurasi
- [ ] Cold-start dijalankan dan seluruh 12 lembar kerja terbentuk otomatis:
  - [ ] `Users`
  - [ ] `Students`
  - [ ] `Orders`
  - [ ] `OrderMembers`
  - [ ] `Payments`
  - [ ] `PaymentProofs`
  - [ ] `ProductionProgress`
  - [ ] `Notifications`
  - [ ] `AuditLogs`
  - [ ] `Configs`
  - [ ] `Periods`
  - [ ] `Tokens`

### E. GOOGLE DRIVE STORAGE
- [ ] 1 Root Folder utama telah dibuat di Google Drive Klien
- [ ] Root Folder telah dibagikan ke Service Account sebagai **Editor**
- [ ] Folder Root ID telah disalin dan dimasukkan ke konfigurasi
- [ ] Struktur subfolder `DESAIN_PDH`, `PEMBAYARAN`, `PROGRESS_PRODUKSI` ter-resolve otomatis
- [ ] Uji stream upload berkas ke Google Drive berhasil tanpa error

### F. RESEND EMAIL SERVICE
- [ ] Akun Resend Klien aktif dengan API Key yang valid
- [ ] `EMAIL_FROM` dan `APP_BASE_URL` terkonfigurasi dengan domain produksi
- [ ] Uji pengiriman email verifikasi registrasi mahasiswa berhasil
- [ ] Uji pengiriman email reset password berhasil
- [ ] Verifikasi `RESEND_API_KEY` terisolasi murni di server-side (tidak bocor ke browser)

### G. ENVIRONMENT VARIABLES INJECTION
- [ ] `JWT_SECRET` (Min. 32 karakter acak terpasang)
- [ ] `GOOGLE_PROJECT_ID` terpasang
- [ ] `GOOGLE_CLIENT_EMAIL` terpasang
- [ ] `GOOGLE_PRIVATE_KEY` terpasang (format multiline `\n` valid)
- [ ] `RESEND_API_KEY` terpasang
- [ ] `EMAIL_FROM` terpasang
- [ ] `APP_BASE_URL` terpasang sesuai URL live
- [ ] `DEFAULT_TENANT_ID` terpasang (`TENANT-001`)
- [ ] Variabel `TENANT_001_*` (Nama Kampus, Fakultas, Prodi, Kode, Spreadsheet ID, Drive Root ID) lengkap
- [ ] Zero hardcoded secret pada repository / dokumen publik

### H. INITIAL ADMIN & SETUP LOCK
- [ ] URL aplikasi dibuka, form *Inisialisasi Administrator Panitia* tampil otomatis
- [ ] Klien memasukkan Nama Lengkap, Email Resmi, dan Kata Sandi Panitia pertama
- [ ] Akun Panitia pertama berhasil dibuat dengan status `ACTIVE` dan role `PANITIA`
- [ ] Setup Lock aktif: percobaan pendaftaran admin kedua ditolak (`403 Forbidden`)

### I. FUNCTIONAL ACCEPTANCE SMOKE TEST
- [ ] Endpoint `/api/health` mengembalikan respon `200 OK`
- [ ] Panitia berhasil login dan mengakses Back Office
- [ ] Registrasi mahasiswa baru $\rightarrow$ `PENDING_VERIFICATION` (login diblokir)
- [ ] Verifikasi akun via token email $\rightarrow$ status `ACTIVE` $\rightarrow$ login mahasiswa sukses
- [ ] Mahasiswa berhasil membuat pesanan PDH mandiri / kolektif
- [ ] Mahasiswa berhasil membuat pembayaran & mengunggah bukti bayar ke Drive
- [ ] Panitia berhasil meninjau bukti bayar dan menyetujui pembayaran (`LUNAS`)
- [ ] Panitia berhasil memperbarui progres produksi konveksi & upload foto dokumentasi
- [ ] Timeline pelacakan pesanan publik mahasiswa memperbarui status real-time
- [ ] Panitia berhasil mencetak / men-generate dokumen PDF SPK Konveksi Server-Side

### J. SECURITY & RBAC AUDIT
- [ ] Mahasiswa dilarang keras menyetujui pembayaran (RBAC Enforced)
- [ ] Mahasiswa dilarang mengakses atau mengubah pesanan mahasiswa lain (Anti-IDOR)
- [ ] Password hash dan token rahasia tersanitasi dari respon API (`[REDACTED]`)
- [ ] Log audit mencatat seluruh aktivitas transaksi pada sheet `AuditLogs`

### K. HANDOVER & SIGN-OFF
- [ ] URL produksi aktif diserahkan ke Klien
- [ ] Dokumen panduan operasional `HANDOVER_GUIDE.md` diserahkan
- [ ] Laporan penyelesaian instalasi `INSTALLATION_COMPLETION_REPORT_TEMPLATE.md` ditandatangani bersama
- [ ] Akses kolaborasi/delegasi Vendor ditutup/dicabut secara resmi
