# SPESIFIKASI INFRASTRUKTUR KLIEN (CLIENT INFRASTRUCTURE SPECIFICATION)
## Model: Client-Owned Infrastructure + Vendor Installation
### Sistem PDH Campus Order — Master Release v1.0.0

Dokumen ini mendefinisikan secara teknis dan operasional seluruh infrastruktur yang **WAJIB dimiliki dan disiapkan oleh Klien (Program Studi / Himpunan Mahasiswa pembeli)** sebelum proses instalasi dan serah terima sistem oleh Vendor.

---

### 1. VERCEL (SERVERLESS CLOUD HOSTING)

Aplikasi PDH Campus Order menggunakan arsitektur Single-Page Application (React 19 Vite) dan Serverless Backend API (Express.js) yang di-deploy ke Vercel.

- **Kepemilikan Akun**: Akun Vercel wajib dimiliki dan dikontrol penuh oleh Klien (menggunakan email institusi atau akun resmi himpunan/prodi).
- **Proyek Vercel**: 1 Proyek Vercel baru (Framework preset: `Vite` / `Other`, Node.js 18.x / 20.x).
- **Custom Domain (Opsional/Direkomendasikan)**: Domain atau subdomain institusi (misal: `pdh.prodi-kampus.ac.id`) yang diarahkan via CNAME/A Record ke Vercel.
- **Model Akses Deployment**:
  - **Mode A (Standar - Direkomendasikan)**: Klien mengundang Vendor sebagai *Team Member / Collaborator* pada Proyek Vercel, atau Klien memasukkan *Environment Variables* secara mandiri dengan panduan Vendor. **PENTING: Kata sandi (password) akun Vercel Klien TIDAK BOLEH diberikan kepada Vendor.**
  - **Mode B (Assisted Installation via Remote Session)**: Instalasi dilakukan melalui sesi remote terpandu (misal: Zoom/Google Meet/AnyDesk) di mana Klien menginput kredensial sensitif di layarnya sendiri.

---

### 2. GOOGLE CLOUD PLATFORM (GCP & SERVICE ACCOUNT)

Google Cloud Platform digunakan sebagai penyedia otentikasi API ke Google Sheets dan Google Drive.

- **Google Cloud Project**: 1 GCP Project aktif atas nama Klien (dapat menggunakan Google Cloud Free Tier).
- **APIs yang Wajib Diaktifkan**:
  1. **Google Sheets API v4**: Untuk pertukaran data relasional dan transaksi database.
  2. **Google Drive API v3**: Untuk manajemen folder dan penyimpanan berkas bukti bayar/desain.
- **Service Account**:
  - Dibuat pada menu **IAM & Admin > Service Accounts** (Contoh: `pdh-service-account@project-id.iam.gserviceaccount.com`).
  - Dibuatkan 1 buah **JSON Key** baru yang diunduh secara aman.
- **Data Kredensial yang Diambil dari JSON Key**:
  - `GOOGLE_PROJECT_ID`: ID Project GCP Klien.
  - `GOOGLE_CLIENT_EMAIL`: Email Service Account GCP.
  - `GOOGLE_PRIVATE_KEY`: RSA Private Key Service Account (format PEM dengan `\n`).
- **Tingkat Hak Akses (Permissions)**:
  - Service Account **TIDAK memerlukan peran Project Owner/Editor di GCP**.
  - Service Account hanya membutuhkan izin **Editor** yang dibagikan secara spesifik pada Google Spreadsheet dan Folder Google Drive milik Klien.

---

### 3. GOOGLE SHEETS (DATABASE UTAMA)

Google Sheets berfungsi sebagai *Persistence Layer / Source of Truth* database transaksi multi-tenant.

- **Kepemilikan File**: 1 Google Spreadsheet kosong yang dibuat di Google Drive akun Klien.
- **Spreadsheet ID**: Diambil dari URL browser: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`.
- **Hak Akses Service Account**: Spreadsheet wajib dibagikan (*shared*) ke email `GOOGLE_CLIENT_EMAIL` dengan peran **Editor**.
- **Pembuatan Lembar Kerja (12 Tabel Otomatis)**:
  - Klien **TIDAK PERLU** membuat tabel/sheet secara manual.
  - Saat backend aplikasi pertama kali booting (*cold start*), sistem otomatis membuat dan mengisi header kolom untuk 12 tabel berikut:
    1. `Users`: Master akun Panitia & Mahasiswa
    2. `Students`: Data biodata mahasiswa prodi
    3. `Orders`: Header pemesanan PDH mandiri & kolektif
    4. `OrderMembers`: Rincian anggota, ukuran, dan bordir nama dada
    5. `Payments`: Data transaksi pembayaran
    6. `PaymentProofs`: Metadata berkas bukti transfer di Google Drive
    7. `ProductionProgress`: Riwayat linimasa progres konveksi
    8. `Notifications`: Notifikasi in-app
    9. `AuditLogs`: Catatan riwayat aktivitas append-only
    10. `Configs`: Konfigurasi identitas prodi & master harga
    11. `Periods`: Periode buka/tutup pre-order
    12. `Tokens`: Token sekali pakai untuk aktivasi akun & reset password

---

### 4. GOOGLE DRIVE (FILE & MEDIA STORAGE)

Google Drive berfungsi sebagai penyimpanan berkas bukti pembayaran, mockup desain PDH, dan foto dokumentasi produksi.

- **Root Folder**: 1 Folder utama kosong dibuat di Google Drive Klien (Contoh nama folder: `PDH_PRODI_2026`).
- **Root Folder ID**: Diambil dari URL browser: `https://drive.google.com/drive/folders/<DRIVE_ROOT_ID>`.
- **Hak Akses Service Account**: Folder utama wajib dibagikan (*shared*) ke email `GOOGLE_CLIENT_EMAIL` dengan peran **Editor**.
- **Hierarki Folder Otomatis**:
  - Sistem secara otomatis membuat dan mengelola subfolder di dalam folder utama:
    - `[Nama Prodi] / DESAIN_PDH / [produk_id] / desain`
    - `[Nama Prodi] / PEMBAYARAN / [order_id]`
    - `[Nama Prodi] / PROGRESS_PRODUKSI / [order_id]`
  - Seluruh file diunggah langsung ke Google Drive via API stream tanpa membebani filesystem Vercel.

---

### 5. RESEND (TRANSACTIONAL EMAIL SERVICE)

Resend digunakan untuk mengirimkan email aktivasi pendaftaran mahasiswa dan tautan reset password.

- **Akun Resend**: 1 Akun di [Resend.com](https://resend.com) milik Klien.
- **API Key (`RESEND_API_KEY`)**: Dibuat dari menu **API Keys** di dashboard Resend.
- **Pengirim Email (`EMAIL_FROM`)**:
  - *Produksi*: Alamat email dengan domain resmi institusi yang telah diverifikasi DNS-nya di Resend (Contoh: `PDH Prodi <no-reply@prodi-kampus.ac.id>`).
  - *Development/Sandbox*: `onboarding@resend.dev` (hanya dapat mengirim ke email terdaftar di Resend).
- **Base URL Aplikasi (`APP_BASE_URL`)**:
  - Domain publik aplikasi (Contoh: `https://pdh.prodi-kampus.ac.id`).
  - Digunakan untuk menyusun tautan verifikasi `https://<APP_BASE_URL>/?verify_token=...` dan reset password `https://<APP_BASE_URL>/?reset_token=...`.

---

### 6. IDENTITAS TENANT (TENANT CONFIGURATION)

Data identitas Program Studi yang akan dipasang sebagai tenant utama (`TENANT-001`):

- `DEFAULT_TENANT_ID`: `TENANT-001`
- `TENANT_001_NAMA_UNIVERSITAS`: Nama lengkap universitas/institut/politeknik.
- `TENANT_001_NAMA_FAKULTAS`: Nama fakultas naungan prodi.
- `TENANT_001_NAMA_PRODI`: Nama program studi (Contoh: `Manajemen`, `Teknik Informatika`, `Akuntansi`).
- `TENANT_001_KODE_PRODI`: Singkatan kode identitas kelas/NIM (Contoh: `MJSP`, `TISP`, `AKSP`).
- `TENANT_001_SPREADSHEET_ID`: ID Google Spreadsheet database prodi.
- `TENANT_001_DRIVE_ROOT_ID`: ID Folder Google Drive root prodi.

---

### 7. ADMINISTRATOR AWAL (INITIAL ADMIN SETUP)

Data yang diperlukan untuk mendaftarkan akun Panitia pertama pasca-deployment:

- **Nama Lengkap Panitia**: Nama Ketua Panitia / Admin Utama Prodi (Contoh: `Ketua Panitia Pengadaan PDH`).
- **Email Resmi Panitia**: Email aktif untuk menerima notifikasi dan korespondensi.
- **Kata Sandi Panitia**: Minimal 6 karakter (disarankan kombinasi huruf, angka, dan simbol).
- **Alur Eksekusi**:
  - Pasca deploy, Klien membuka URL aplikasi.
  - Form **Inisialisasi Administrator Panitia** muncul otomatis karena belum ada akun aktif.
  - Klien menginput data admin awal dan menyelesaikan setup.
  - Sistem otomatis mengunci endpoint setup (**Setup Lock**) sehingga tidak dapat disalahgunakan pihak lain.
