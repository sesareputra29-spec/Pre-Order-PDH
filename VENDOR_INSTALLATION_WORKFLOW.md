# PANDUAN KERJA INSTALASI VENDOR (VENDOR INSTALLATION WORKFLOW)
## Model: Client-Owned Infrastructure + Vendor Installation (Jual-Putus)
### Sistem PDH Campus Order — Master Release v1.0.0

Dokumen ini merupakan standar operasional prosedur (SOP) resmi bagi Tim Vendor dalam melakukan deployment dan instalasi sistem **PDH Campus Order** pada infrastruktur milik Klien (Program Studi / Himpunan Mahasiswa).

---

### PRINSIP DASAR & MODEL BISNIS
1. **Model Jual-Putus**: Klien membeli hak pakai sistem operasional penuh yang berjalan di atas infrastruktur cloud milik Klien.
2. **Kedaulatan Data Klien**: Seluruh database (Google Sheets), media berkas (Google Drive), dan serverless hosting (Vercel) dimiliki dan dikontrol penuh oleh Klien.
3. **Kerahasiaan Source Code (Private IP)**: Source code, private repository Git, dan arsitektur internal adalah milik eksklusif Vendor dan **TIDAK diserahkan** kepada Klien.
4. **Keamanan Kredensial**: Vendor hanya mengakses infrastruktur Klien melalui mekanisme delegasi resmi (*Mode A*) atau sesi remote terpandu (*Mode B*).

---

### FASE 1 — PRE-INSTALLATION (VALIDASI DATA AWAL)
Sebelum memulai instalasi, Vendor wajib memastikan formulir `INSTALLATION_INPUT_TEMPLATE.md` dan checklist `CLIENT_REQUIREMENTS_CHECKLIST.md` telah diisi lengkap oleh Klien:
1. **Validasi Identitas Prodi**:
   - Nama Perguruan Tinggi, Fakultas, Nama Prodi, dan Kode Prodi terverifikasi valid.
2. **Validasi Kesiapan Akun Klien**:
   - Akun Vercel Klien aktif.
   - Project GCP aktif dengan Google Sheets API v4 & Google Drive API v3 aktif.
   - File JSON Service Account GCP telah dibuat.
   - 1 Spreadsheet kosong telah dibuat dan dibagikan ke Service Account sebagai **Editor**.
   - 1 Folder Google Drive utama telah dibuat dan dibagikan ke Service Account sebagai **Editor**.
   - Akun Resend aktif dengan API Key dan konfigurasi pengirim valid.
3. **Pemeriksaan Kerahasiaan Vendor**:
   - Pastikan tidak ada kredensial internal vendor yang tertinggal dalam konfigurasi.

---

### FASE 2 — ACCESS & SECURITY PROTOCOL
1. **Mode A (Standar Delegasi Kolaborasi)**:
   - Klien mengundang akun Vendor sebagai *Member / Collaborator* pada Proyek Vercel.
   - **DILARANG KERAS**: Vendor tidak boleh meminta kata sandi (password) akun personal Vercel atau Google milik Klien.
2. **Mode B (Assisted Remote Session)**:
   - Jika Klien memilih tidak memberikan akses kolaborator, deployment dilakukan melalui sesi panggilan remote (Google Meet / Zoom / AnyDesk) di mana Klien menginput environment variables di layarnya sendiri dengan panduan Vendor.
3. **Zero Secret in Repository**:
   - Seluruh kredensial produksi Klien diinjeksikan langsung ke menu **Vercel Environment Variables** dan dilarang keras dicatat/dikomit ke dalam repositori Git atau dokumen publik.

---

### FASE 3 — VERCEL PROJECT CONFIGURATION
1. **Koneksi Project**:
   - Buat / hubungkan Proyek Vercel baru pada akun Klien ke build pipeline Master Release v1.0.0.
   - Framework Preset: `Vite` (Build Command: `npm run build`, Output Directory: `dist`).
2. **Injeksi Environment Variables (Production)**:
   - `JWT_SECRET`: Generate string acak aman minimal 32 karakter.
   - `GOOGLE_PROJECT_ID`: Sesuai data GCP Klien.
   - `GOOGLE_CLIENT_EMAIL`: Email Service Account Klien.
   - `GOOGLE_PRIVATE_KEY`: Private key RSA dari file JSON Klien (format `\n` tetap utuh).
   - `RESEND_API_KEY`: API Key Resend Klien.
   - `EMAIL_FROM`: Format `PDH <no-reply@domain-klien.ac.id>` atau default.
   - `APP_BASE_URL`: URL produksi (Contoh: `https://pdh.prodi-klien.ac.id` atau `https://project.vercel.app`).
   - `DEFAULT_TENANT_ID`: `TENANT-001`.
   - `TENANT_001_NAMA_UNIVERSITAS`: Sesuai data Klien.
   - `TENANT_001_NAMA_FAKULTAS`: Sesuai data Klien.
   - `TENANT_001_NAMA_PRODI`: Sesuai data Klien.
   - `TENANT_001_KODE_PRODI`: Sesuai data Klien.
   - `TENANT_001_SPREADSHEET_ID`: Spreadsheet ID Klien.
   - `TENANT_001_DRIVE_ROOT_ID`: Drive Root Folder ID Klien.
3. **Trigger Deploy**: Eksekusi deployment awal pada Vercel Dashboard.

---

### FASE 4 — GOOGLE CLOUD VALIDATION
1. **Verifikasi Service Account**:
   - Pastikan email Service Account berstatus aktif di GCP Console.
   - Pastikan Google Sheets API v4 & Google Drive API v3 berstatus *Enabled*.
2. **Verifikasi Izin I/O**:
   - Pastikan Service Account memiliki hak **Editor** langsung pada Spreadsheet dan Folder Drive Klien.

---

### FASE 5 — GOOGLE SHEETS COLD-START INITIALIZATION
1. **Eksekusi Cold Start**:
   - Buka endpoint `/api/health` pada deployment Vercel.
   - Backend Express otomatis menginisialisasi tabel database saat pertama kali diakses.
2. **Validasi 12 Tabel Database**:
   - Buka Google Spreadsheet Klien dan pastikan ke-12 lembar kerja terbentuk otomatis:
     `Users`, `Students`, `Orders`, `OrderMembers`, `Payments`, `PaymentProofs`, `ProductionProgress`, `Notifications`, `AuditLogs`, `Configs`, `Periods`, `Tokens`.
   - Pastikan baris pertama pada setiap sheet berisi header kolom yang lengkap.

---

### FASE 6 — GOOGLE DRIVE FOLDER STRUCTURE INITIALIZATION
1. **Validasi Root Folder**:
   - Pastikan Folder Root Klien dapat diakses melalui Drive API.
2. **Inisialisasi Subfolder**:
   - Sistem otomatis membuat subfolder terstruktur:
     - `[Nama Prodi] / DESAIN_PDH`
     - `[Nama Prodi] / PEMBAYARAN`
     - `[Nama Prodi] / PROGRESS_PRODUKSI`
3. **Uji Upload Berkas**:
   - Uji coba unggah berkas temporer untuk memastikan stream upload tersimpan di Drive Klien tanpa menyentuh disk lokal Vercel.

---

### FASE 7 — RESEND EMAIL DISPATCHER TEST
1. **Validasi Pengiriman**:
   - Uji kirim email verifikasi aktivasi akun pendaftaran.
   - Uji kirim email permintaan reset password.
2. **Verifikasi Tautan URL**:
   - Pastikan tautan di dalam email menggunakan `APP_BASE_URL` produksi Klien.
3. **Keamanan Kredensial**:
   - Pastikan `RESEND_API_KEY` tidak pernah terkirim ke browser (hanya berjalan di backend Node.js).

---

### FASE 8 — INITIAL ADMIN SETUP & SETUP LOCK
1. **Buka Portal Aplikasi**:
   - Akses URL produksi Klien di browser.
   - Pastikan sistem mendeteksi belum adanya admin aktif dan menampilkan form **Inisialisasi Administrator Panitia**.
2. **Input Kredensial oleh Klien**:
   - Klien (Ketua Panitia / Admin Prodi) memasukkan Nama Lengkap, Email Resmi, dan menentukan Password sendiri secara langsung di layar.
   - Klik **Selesaikan Setup & Buat Akun Panitia**.
3. **Verifikasi Setup Lock**:
   - Pastikan akun berstatus `ACTIVE` dan ber-role `PANITIA`.
   - Lakukan uji penetrasi dengan menembak kembali `POST /api/setup/admin`; pastikan sistem menolak dengan pesan error `403 Forbidden` / `SETUP_ALREADY_COMPLETED`.

---

### FASE 9 — PRODUCTION ACCEPTANCE SMOKE TEST
Vendor bersama Klien melakukan verifikasi fungsional akhir:
1. **Health Check**: `GET /api/health` mengembalikan status `200 OK`.
2. **Login Panitia**: Masuk ke Back Office dengan akun admin awal.
3. **Registrasi Mahasiswa**: Mahasiswa mendaftar $\rightarrow$ status `PENDING_VERIFICATION` (login diblokir) $\rightarrow$ aktivasi via token email $\rightarrow$ status `ACTIVE` $\rightarrow$ login sukses.
4. **Pemesanan PDH**: Mahasiswa membuat pesanan mandiri/kolektif dan memilih ukuran.
5. **Pembayaran & Upload Bukti**: Mahasiswa transfer dan upload bukti bayar ke Drive.
6. **Approval Pembayaran**: Panitia menyetujui pembayaran, status pesanan berubah menjadi `LUNAS`.
7. **Tracking Produksi**: Panitia update progres konveksi (misal 50% & upload foto). Mahasiswa melihat progres di timeline.
8. **Ekspor & Cetak SPK**: Panitia men-generate dokumen PDF SPK Konveksi Server-Side.
9. **Keamanan & RBAC**: Mahasiswa dilarang mengakses endpoint Panitia atau pesanan mahasiswa lain (Anti-IDOR).

---

### FASE 10 — HANDOVER & SIGN-OFF
1. **Penyerahan Resmi**:
   - Serahkan URL produksi aktif (`https://pdh.prodi-klien.ac.id`).
   - Serahkan dokumen panduan operasional Panitia (`HANDOVER_GUIDE.md`).
2. **Batasan Penyerahan (Strict Policy)**:
   - **TIDAK menyerahkan** source code repository atau private credentials Vendor.
   - Klien menandatangani formulir `INSTALLATION_COMPLETION_REPORT_TEMPLATE.md`.
3. **Pencabutan Akses**:
   - Vendor keluar dari role kolaborator Vercel Klien atau Klien mencabut akses delegasi instalasi.

---

### TABEL CHECKPOINT EKSEKUSI WORKFLOW

| Checkpoint | Status Target | Hasil yang Diharapkan | Bukti Verifikasi | PIC |
| :--- | :---: | :--- | :--- | :---: |
| **CP-01: Data Klien Lengkap** | `PASS` | Seluruh input template terisi valid | File input template terverifikasi | Vendor & Klien |
| **CP-02: Vercel Project Ready** | `PASS` | Project Vercel terhubung dan terkonfigurasi | Dashboard Vercel aktif | Vendor |
| **CP-03: GCP API & Service Account** | `PASS` | Sheets & Drive API aktif, JSON key valid | Console GCP status Enabled | Klien & Vendor |
| **CP-04: Google Sheets 12 Tables** | `PASS` | 12 Sheet terbentuk otomatis dengan header | Sheet `Users`, `Orders`, dll. terisi | Vendor |
| **CP-05: Google Drive Hierarchy** | `PASS` | Subfolder otomatis ter-resolve | Folder `PEMBAYARAN`, `DESAIN_PDH` | Vendor |
| **CP-06: Resend Email Flow** | `PASS` | Email verifikasi masuk ke inbox | Email inbox mahasiswa | Vendor & Klien |
| **CP-07: Initial Admin & Setup Lock** | `PASS` | Akun Panitia 1 aktif & setup terkunci | Endpoint setup returning 403 | Klien & Vendor |
| **CP-08: E2E Business Cycle** | `PASS` | Order $\rightarrow$ Payment $\rightarrow$ SPK PDF sukses | Transaksi tercatat di database | Klien & Vendor |
| **CP-09: Handover & Sign-Off** | `PASS` | URL diserahkan & laporan ditandatangani | Berita Acara Instalasi Selesai | Vendor & Klien |
