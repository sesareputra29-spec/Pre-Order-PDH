# CHECKLIST DEPLOYMENT KOMERSIAL (COMMERCIAL DEPLOYMENT CHECKLIST)
## PDH Campus Order — Master Commercial Checklist

Checklist komersial dan teknis lengkap ini memandu seluruh proses delivery dari kesepakatan penjualan hingga masa garansi.

---

### A. SALES & ORDER CONFIRMATION
- [ ] Surat Pesanan / Kontrak Kerja Sama Pengadaan ditandatangani
- [ ] Identitas Program Studi, Fakultas, dan Universitas terkonfirmasi
- [ ] Formulir `INSTALLATION_INPUT_TEMPLATE.md` telah dikirimkan ke Klien

### B. CLIENT INFRASTRUCTURE PROVISIONING
- [ ] Klien telah menyiapkan akun Vercel
- [ ] Klien telah membuat project Google Cloud Platform
- [ ] Klien telah mengaktifkan Sheets API v4 & Drive API v3
- [ ] Klien telah membuat Service Account & mengunduh JSON Key
- [ ] Klien telah membuat 1 Google Spreadsheet kosong
- [ ] Klien telah membuat 1 Folder Google Drive utama
- [ ] Klien telah membagikan Spreadsheet & Drive Folder ke Service Account sebagai **Editor**
- [ ] Klien telah menyiapkan akun Resend dan API Key

### C. VERCEL CONFIGURATION
- [ ] Project Vercel baru dibuat pada akun Klien
- [ ] Framework preset `Vite` dan output directory `dist` terpasang
- [ ] Mode A (Invite Collaborator) atau Mode B (Remote Session) disepakati

### D. GOOGLE CLOUD VALIDATION
- [ ] `GOOGLE_PROJECT_ID` valid
- [ ] `GOOGLE_CLIENT_EMAIL` terverifikasi aktif
- [ ] `GOOGLE_PRIVATE_KEY` terformat dengan benar (multiline `\n`)

### E. GOOGLE SHEETS DATABASE INITIALIZATION
- [ ] Spreadsheet ID Klien terpasang di environment
- [ ] Cold-start dijalankan dan 12 tabel terbentuk otomatis lengkap dengan header
- [ ] Izin I/O baca-tulis Service Account terverifikasi sukses

### F. GOOGLE DRIVE STORAGE INITIALIZATION
- [ ] Drive Root Folder ID Klien terpasang di environment
- [ ] Subfolder `DESAIN_PDH`, `PEMBAYARAN`, `PROGRESS_PRODUKSI` terbentuk otomatis
- [ ] Uji stream upload berkas ke Google Drive berhasil

### G. RESEND EMAIL CONFIGURATION
- [ ] `RESEND_API_KEY` terpasang di backend serverless
- [ ] `EMAIL_FROM` dan `APP_BASE_URL` terkonfigurasi sesuai domain Klien
- [ ] Uji kirim email verifikasi aktivasi akun pendaftaran berhasil

### H. ENVIRONMENT VARIABLES AUDIT
- [ ] `JWT_SECRET` acak minimal 32 karakter terpasang
- [ ] `DEFAULT_TENANT_ID="TENANT-001"` terpasang
- [ ] Seluruh variabel `TENANT_001_*` terisi data Klien
- [ ] Zero secret di client-side (tidak ada prefix `VITE_` untuk secret)

### I. DEPLOYMENT EXECUTION
- [ ] Build produksi Vercel berhasil (`npm run build` PASS)
- [ ] Endpoint `GET /api/health` mengembalikan status `200 OK`
- [ ] Routing SPA dan API rewrites pada `vercel.json` berfungsi normal

### J. SECURITY & RBAC AUDIT
- [ ] Initial Admin Setup berhasil di layar Klien
- [ ] Setup Lock aktif: endpoint setup terkunci permanen (`403 Forbidden`)
- [ ] Password tersimpan dalam bentuk cryptographic hash (bukan plaintext)
- [ ] Proteksi IDOR dan isolasi data mahasiswa terverifikasi

### K. ACCEPTANCE TEST & VERIFIKASI FUNGSIONAL
- [ ] Login Panitia ke Back Office berhasil
- [ ] Registrasi mahasiswa $\rightarrow$ pending verification $\rightarrow$ verifikasi email $\rightarrow$ login sukses
- [ ] Pemesanan PDH mandiri/kolektif, pembayaran, dan upload bukti transfer sukses
- [ ] Approval pembayaran, update progres produksi, dan generate PDF SPK sukses

### L. HANDOVER & SIGN-OFF
- [ ] URL produksi resmi diserahkan ke Klien
- [ ] Panduan operasional `HANDOVER_GUIDE.md` diserahkan
- [ ] Berita Acara `INSTALLATION_COMPLETION_REPORT_TEMPLATE.md` ditandatangani kedua pihak
- [ ] Source code dan private repository dipastikan tetap aman di pihak Vendor

### M. ACCESS REVOCATION
- [ ] Klien mencabut role kolaborator Vendor pada akun Vercel
- [ ] Vendor memastikan tidak menyimpan kredensial Klien di luar sistem Klien

### N. WARRANTY STATUS
- [ ] Status masa garansi **[PERIODE GARANSI]** aktif
- [ ] Saluran dukungan teknis resmi (*Support Channel*) diinformasikan kepada Klien
