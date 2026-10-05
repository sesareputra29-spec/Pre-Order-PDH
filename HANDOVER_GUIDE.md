# DOKUMEN HANDOVER & PANDUAN DEPLOYMENT MANDIRI
## PDH Campus Order System - Multi-Tenant Pre-Order PO PDH & Baju Himpunan

---

### 1. GAMBARAN SISTEM

**PDH Campus Order** adalah sistem aplikasi web *Full-Stack Multi-Tenant* yang dirancang khusus untuk memfasilitasi proses Pre-Order (PO) Pakaian Dinas Harian (PDH), baju himpunan, dan kemeja angkatan bagi Program Studi / Himpunan Mahasiswa di Perguruan Tinggi.

Aplikasi ini mendukung:
- **Dua Jenis Pemesanan**: Pesanan Mandiri (Mahasiswa Individu) dan Pesanan Kolektif (Koordinator Kelas/Angkatan).
- **Isolasi Multi-Tenant**: Setiap Program Studi (Prodi) memiliki database Google Spreadsheet, Google Drive Root Folder, dan konfigurasi independen.
- **Autentikasi Berbasis Token & Email Verification**: Verifikasi pendaftaran mahasiswa baru dan fitur Lupa Password via Resend Email Dispatcher.
- **Workflow Verifikasi Pembayaran**: Verifikasi multi-step oleh Panitia dengan pencegahan idempotensi (anti bukti transfer ganda).
- **Pelacakan Produksi & Pickup**: Pelacakan persentase progres konveksi lengkap dengan dokumentasi foto dan status pengambilan.
- **Export & Laporan**: Laporan PDF Server-Side, Rekapitulasi Ukuran Konveksi, dan Export Excel/CSV.

---

### 2. ARSITEKTUR SISTEM

Sistem dibangun dengan arsitektur **Serverless & Sheet-Backed Persistence** tanpa dependensi ke database SQL/NoSQL eksternal yang berbayar.

- **Frontend**: React 18 + Vite + Tailwind CSS (SPA)
- **Backend API**: Node.js + Express (Serverless Function entry point via `server.ts`)
- **Deployment Platform**: Vercel Serverless Functions
- **Database Persistence**: Google Sheets API v4 (Google Spreadsheet per Prodi)
- **File & Media Storage**: Google Drive API v3 (Google Drive Folder per Prodi)
- **Transaksional Email**: Resend API (Transaksional Email Dispatcher)
- **Cache Layer**: In-Memory Sync dengan TTL (Time-To-Live) otomatis untuk konsistensi multi-instance serverless.

---

### 3. PERSYARATAN DOKUMEN & KEBUTUHAN AKUN (PREREQUISITES)

Sebelum melakukan provisioning dan deployment instance Prodi baru, siapkan akun-akun berikut:

1. **Google Account (Perguruan Tinggi / Prodi)**: Digunakan untuk Google Cloud Console, Google Sheets, dan Google Drive.
2. **Akun Vercel**: Digunakan untuk hosting backend serverless dan frontend SPA.
3. **Akun Resend**: Digunakan untuk mengirimkan email verifikasi pendaftaran dan reset password.
4. **Node.js (v18+) & Git**: Untuk mengelola repository dan menjalankan verifikasi lokal jika diperlukan.

---

### 4. GOOGLE CLOUD SETUP GUIDE

Ikuti langkah-langkah berikut untuk mengonfigurasi proyek Google Cloud dan Service Account:

#### 1. Membuat Google Cloud Project
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Login dengan akun Google Prodi.
3. Klik dropdown project di bagian atas, lalu klik **New Project**.
4. Isi nama project, contoh: `pdh-campus-order-[nama-prodi]`.
5. Klik **Create**.

#### 2. Mengaktifkan Google Sheets API
1. Pilih project yang baru dibuat.
2. Buka menu **APIs & Services** > **Library**.
3. Cari **Google Sheets API**.
4. Klik **Enable**.

#### 3. Mengaktifkan Google Drive API
1. Di Library API yang sama, cari **Google Drive API**.
2. Klik **Enable**.

#### 4. Membuat Service Account & Credentials
1. Buka menu **APIs & Services** > **Credentials**.
2. Klik **Create Credentials** > **Service Account**.
3. Isi Service Account Name, contoh: `pdh-service-account`.
4. Klik **Create and Continue**, pilih role **Editor**, lalu klik **Done**.
5. Klik pada Service Account yang baru dibuat.
6. Buka tab **Keys** > **Add Key** > **Create New Key**.
7. Pilih format **JSON**, lalu klik **Create**.
8. Simpan file JSON credentials dengan aman. File ini berisi:
   - `project_id` $\rightarrow$ `GOOGLE_PROJECT_ID`
   - `client_email` $\rightarrow$ `GOOGLE_CLIENT_EMAIL`
   - `private_key` $\rightarrow$ `GOOGLE_PRIVATE_KEY`

---

### 5. GOOGLE SHEETS SETUP

Setiap Prodi membutuhkan 1 Google Spreadsheet sebagai database utama.

#### Langkah Pembuatan & Konfigurasi Google Sheets:
1. Buka [Google Sheets](https://sheets.google.com/).
2. Buat Spreadsheet baru dengan judul, contoh: `PDH Campus Order Database - Prodi Manajemen`.
3. Dapatkan **Spreadsheet ID** dari URL browser:
   `https://docs.google.com/spreadsheets/d/`**`1SpreadsheetIdPDHCampusOrderDatabase2026`**`/edit`
4. **Berikan Akses ke Service Account**:
   - Klik tombol **Share** (Bagikan) di pojok kanan atas Spreadsheet.
   - Paste alamat email Service Account (`GOOGLE_CLIENT_EMAIL`), contoh:
     `pdh-service-account@pdh-campus-order-project.iam.gserviceaccount.com`
   - Set role menjadi **Editor**.
   - Hapus centang "Notify people", lalu klik **Share**.

#### Daftar Sheet / Tab yang Digunakan Aplikasi:
*Sistem secara otomatis akan membuat tab dan header berikut jika belum ada pada saat aplikasi pertama kali berjalan (Cold Start):*

1. **`Configs`**: Menyimpan profil universitas, fakultas, prodi, kontak WA, rekening bank, dan lokasi pickup.
2. **`Users`**: Menyimpan kredensial akun panitia, admin, dan mahasiswa (`username`, `password_hash`, `role`, `status`).
3. **`Students`**: Menyimpan data profil mahasiswa (`nim`, `nama_lengkap`, `kode_kelas`, `no_wa`).
4. **`PDHProducts`**: Menyimpan spesifikasi produk PDH dan harga dasar.
5. **`PDHSizes`**: Menyimpan variasi ukuran (S, M, L, XL, XXL) dan biaya tambahan (*surcharge*).
6. **`PDHImages`**: Menyimpan tautan foto desain PDH dan foto utama.
7. **`Periods`**: Menyimpan periode Pre-Order PO (`nama_periode`, `tanggal_mulai`, `tanggal_selesai`, `status`).
8. **`Orders`**: Menyimpan data pesanan utama (Mandiri/Kolektif, total qty, total nominal, status order/payment/produksi/pickup).
9. **`OrderMembers`**: Menyimpan rincian anggota dan ukuran pesanan kolektif.
10. **`Payments`**: Menyimpan transaksi pembayaran (`jumlah`, `metode`, `status`, `verified_by`).
11. **`PaymentProofs`**: Menyimpan referensi file bukti transfer di Google Drive.
12. **`ProductionProgress`**: Menyimpan riwayat progres konveksi (`percentage`, `production_status`, `notes`, `photo_url`).
13. **`Notifications`**: Menyimpan notifikasi terkirim untuk pengguna dan panitia.
14. **`AuditLogs`**: Menyimpan catatan riwayat aktivitas (*Append-Only Audit Trail*).
15. **`Tokens`**: Menyimpan token verifikasi email registrasi dan token reset password.

---

### 6. GOOGLE DRIVE SETUP

Google Drive digunakan untuk menyimpan aset media publik (foto desain PDH, foto sampel) dan media privat/bukti transaksi (bukti transfer pembayaran, foto dokumen produksi).

#### Langkah Konfigurasi Google Drive Folder:
1. Buka [Google Drive](https://drive.google.com/).
2. Buat **Root Folder** baru, contoh: `PDH Campus Order Storage - Prodi Manajemen`.
3. Dapatkan **Drive Root Folder ID** dari URL browser:
   `https://drive.google.com/drive/folders/`**`1DriveRootFolderPDH2026`**
4. **Berikan Akses ke Service Account**:
   - Klik kanan pada Root Folder > **Share** (Bagikan).
   - Masukkan alamat `GOOGLE_CLIENT_EMAIL`.
   - Set role menjadi **Editor**, lalu klik **Share**.

#### Struktur Folder Otomatis:
Saat file diunggah pertama kali, aplikasi akan membuat subfolder otomatis di dalam Root Folder:
- `/PDH_Images/`: Menyimpan foto desain PDH.
- `/Payment_Proofs/`: Menyimpan foto bukti pembayaran transfer bank/E-Wallet.
- `/Production_Photos/`: Menyimpan foto progres fisik produksi konveksi.

---

### 7. RESEND EMAIL DISPATCHER SETUP

Resend digunakan untuk mengirimkan email transaksional verifikasi pendaftaran mahasiswa dan token reset password.

#### Langkah Konfigurasi Resend:
1. Mendaftar akun di [Resend.com](https://resend.com/).
2. Buka menu **API Keys** > **Create API Key**.
3. Beri nama Key, contoh: `PDH Campus Order Production Key`, pilih permission **Full Access**.
4. Salin API Key yang dihasilkan $\rightarrow$ `RESEND_API_KEY`.
5. *(Opsional untuk Production)*: Di menu **Domains**, tambahkan domain resmi kampus/prodi (misal: `prodi-manajemen.ac.id`) dan tambahkan rekaman DNS TXT & MX yang diminta.
6. Set alamat email pengirim di environment variable `EMAIL_FROM`:
   - Jika domain belum diverifikasi (mode sandbox): `onboarding@resend.dev`
   - Jika domain sudah terverifikasi: `PDH Campus Order <no-reply@prodi-manajemen.ac.id>`

---

### 8. VERCEL DEPLOYMENT GUIDE

#### Langkah Deployment Aplikasi ke Vercel:
1. Push repository aplikasi ke akun GitHub/GitLab Prodi.
2. Login ke [Vercel Dashboard](https://vercel.com/) dan klik **Add New** > **Project**.
3. Import repository `pdh-campus-order`.
4. **Framework Preset**: Pilih **Vite**.
5. **Build Configuration**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
6. **Environment Variables**: Masukkan seluruh environment variable yang dibutuhkan (lihat bagian 9).
7. Klik **Deploy**.
8. Setelah deployment selesai, Vercel akan memberikan domain publik, contoh: `https://pdh-order.vercel.app`.
9. Update environment variable `APP_BASE_URL` dengan domain publik Vercel tersebut, lalu lakukan **Redeploy**.

---

### 9. ENVIRONMENT VARIABLES REFERENCE

Isikan environment variable berikut pada Vercel Dashboard (**Project Settings** > **Environment Variables**):

| Variable Name | Status | Deskripsi & Contoh Nilai |
| :--- | :--- | :--- |
| `JWT_SECRET` | **Required** | Secret key acak 32+ karakter untuk enkripsi token sesi JWT. |
| `GOOGLE_PROJECT_ID` | **Required** | Project ID dari Google Cloud Console. |
| `GOOGLE_CLIENT_EMAIL` | **Required** | Email Service Account Google Cloud. |
| `GOOGLE_PRIVATE_KEY` | **Required** | Private Key Service Account (Sertakan `\n` untuk karakter newline). |
| `RESEND_API_KEY` | **Required** | API Key dari Resend Dashboard (`re_...`). |
| `EMAIL_FROM` | **Required** | Alamat email pengirim (`PDH Order <no-reply@domain.ac.id>`). |
| `APP_BASE_URL` | **Required** | URL publik deployment Vercel (`https://pdh-order.vercel.app`). |
| `DEFAULT_TENANT_ID` | **Required** | ID Tenant default (`TENANT-001`). |
| `TENANT_001_NAMA_UNIVERSITAS` | **Required** | Nama Universitas untuk Tenant 1. |
| `TENANT_001_NAMA_FAKULTAS` | **Required** | Nama Fakultas untuk Tenant 1. |
| `TENANT_001_NAMA_PRODI` | **Required** | Nama Program Studi untuk Tenant 1. |
| `TENANT_001_KODE_PRODI` | **Required** | Kode Program Studi untuk Tenant 1 (contoh: `MJSP`). |
| `TENANT_001_SPREADSHEET_ID` | **Required** | Spreadsheet ID Google Sheets Tenant 1. |
| `TENANT_001_DRIVE_ROOT_ID` | **Required** | Root Folder ID Google Drive Tenant 1. |
| `TENANT_002_*` | Optional | Konfigurasi opsional untuk Prodi 2 pada instance multi-tenant. |
| `CACHE_TTL_*_MS` | Optional | Pengaturan milidetik TTL cache per modul (Default: 5000ms - 30000ms). |

---

### 10. TENANT / PRODI PROVISIONING GUIDE

Untuk menambahkan Program Studi baru ke dalam sistem instance yang sama:

1. Buat Google Spreadsheet baru untuk Prodi baru (dapatkan `SPREADSHEET_ID`).
2. Buat Google Drive Root Folder baru untuk Prodi baru (dapatkan `DRIVE_ROOT_ID`).
3. Bagikan Spreadsheet dan Root Folder tersebut ke email Service Account (`GOOGLE_CLIENT_EMAIL`) dengan role **Editor**.
4. Tambahkan konfigurasi di Vercel Environment Variables:
   - `TENANT_002_NAMA_UNIVERSITAS="Universitas Terbuka"`
   - `TENANT_002_NAMA_FAKULTAS="Fakultas Ekonomi"`
   - `TENANT_002_NAMA_PRODI="Akuntansi"`
   - `TENANT_002_KODE_PRODI="AKSP"`
   - `TENANT_002_SPREADSHEET_ID="1SpreadsheetIdAkuntansi2026"`
   - `TENANT_002_DRIVE_ROOT_ID="1DriveFolderAkuntansi2026"`
5. Lakukan **Redeploy** di Vercel Dashboard. Sistem akan otomatis mengenali `TENANT-002` dan mengisolasi seluruh datanya secara mandiri.

---

### 11. POST-DEPLOYMENT TEST CHECKLIST

Lakukan pengujian berikut setelah deployment selesai:

- [ ] **Frontend Accessibility**: Halaman utama dapat dibuka tanpa error console.
- [ ] **Health Check API**: Akses Endpoint `https://[app-url]/api/health` mengembalikan status `200 OK` dan `status: "PASS"`.
- [ ] **Google Sheets Integration**: Halaman Login/Katalog dapat memuat data default dari Spreadsheet.
- [ ] **Google Drive Integration**: Upload gambar desain PDH atau bukti pembayaran berhasil tersimpan di Google Drive.
- [ ] **Resend Email Integration**: Registrasi mahasiswa baru berhasil mengirimkan email verifikasi.
- [ ] **Pending Verification Guard**: Mahasiswa yang belum klik link verifikasi email **ditolak** saat login.
- [ ] **Account Verification**: Klik link verifikasi email berhasil mengubah status akun menjadi `ACTIVE`.
- [ ] **Verified Login**: Mahasiswa terverifikasi berhasil login dan masuk ke dashboard.
- [ ] **Order Creation**: Pembuatan pesanan Mandiri & Kolektif berhasil menerbitkan Nomor Pesanan.
- [ ] **Payment Submission**: Pengajuan pembayaran dan upload bukti transfer berhasil.
- [ ] **Panitia Approval Workflow**: Panitia dapat menyetujui/menolak pembayaran dan status pesanan ter-update otomatis.
- [ ] **Production Tracking**: Pembaruan progres produksi konveksi dan upload foto dokumentasi berhasil.
- [ ] **Report & Analytics**: Fitur unduh Laporan PDF Server-Side dan Rekapitulasi Ukuran berjalan lancar.

---

### 12. TROUBLESHOOTING GUIDE

| Gejala Masalah | Kemungkinan Penyebab | Langkah Pemeriksaan | Solusi |
| :--- | :--- | :--- | :--- |
| **Gagal membaca/menulis Google Sheets** | Service Account belum diberi akses Editor | Buka Google Sheets > Share | Pastikan `GOOGLE_CLIENT_EMAIL` di-share sebagai **Editor** pada Spreadsheet. |
| **Gagal upload file ke Google Drive** | Root Folder ID salah / Service Account tidak punya akses | Periksa `TENANT_001_DRIVE_ROOT_ID` | Pastikan Root Folder di-share sebagai **Editor** ke `GOOGLE_CLIENT_EMAIL`. |
| **Email verifikasi tidak terkirim** | `RESEND_API_KEY` invalid atau `EMAIL_FROM` belum diverifikasi | Cek Vercel Logs / Resend Dashboard | Gunakan `onboarding@resend.dev` jika domain resmi belum di-verify di Resend. |
| **Build Vercel Gagal** | TypeScript Error / Missing Env Var | Buka Vercel Deployment Logs | Jalankan `npm run lint` lokal dan pastikan seluruh required env var terisi di Vercel. |
| **API /api/* Mengembalikan 404** | Route Express / Vercel rewrite mismatch | Cek file `vercel.json` | Pastikan `vercel.json` mengarahkan rute `/api/(.*)` ke `server.ts`. |
| **Mahasiswa tidak menerima email verifikasi** | Masuk ke folder Spam / APP_BASE_URL salah | Cek folder Spam & env `APP_BASE_URL` | Pastikan `APP_BASE_URL` menggunakan skema `https://` tanpa trailing slash. |
| **Token Reset Password Invalid** | Instance Vercel restart / Cache Mismatch | Jalankan `npm run test:cache` | Sistem sudah mendukung auto-read dari Google Sheets tab `Tokens` secara persisten. |

---

### 13. BACKUP & RECOVERY PROCEDURES

1. **Google Spreadsheet Backup**:
   - Buka Google Spreadsheet > **File** > **Download** > **Microsoft Excel (.xlsx)** atau **CSV**.
   - Atau aktifkan fitur **Version History** pada Google Sheets untuk melakukan rollback data jika terjadi kesalahan input manual.
2. **Google Drive Backup**:
   - Buka Google Drive Root Folder > Download seluruh isi folder sebagai ZIP secara berkala.
3. **Source Code Repository**:
   - Pastikan seluruh kode disimpan pada Git Repository privat kampus/prodi.
4. **Environment Variables Backup**:
   - Simpan catatan nilai Environment Variables di Password Manager yang terenkripsi (misal: 1Password, Bitwarden).
   - **DILARANG** menyimpan kunci rahasia/private key dalam bentuk plaintext di dalam repository Git publik.

---

### 14. SECURITY HANDOVER REQUIREMENTS

- **Rahasiakan Credentials**: `JWT_SECRET`, `RESEND_API_KEY`, dan `GOOGLE_PRIVATE_KEY` **harus selalu dijaga kerahasiannya** dan hanya dipegang oleh IT Admin / Ketua Panitia.
- **Principle of Least Privilege**: Service Account hanya perlu diberikan akses **Editor** pada Spreadsheet dan Root Folder khusus aplikasi PDH, bukan seluruh Drive kampus.
- **Jangan Ubah Spreadsheet Public**: Jangan sekali-kali mengubah hak akses Google Spreadsheet menjadi "Public / Anyone with the link can edit" karena dapat membocorkan data pribadi mahasiswa.
- **Frontend Isolation**: Aplikasi tidak pernah menyimpan private key atau API secret pada kode React frontend (`VITE_`). Seluruh panggilan sensitif dilakukan via server-side proxy route Express.

---

### 15. CHECKLIST SERAH TERIMA (HANDOVER CHECKLIST)

- [x] Repository Source Code Lulus `npm run lint` (0 error).
- [x] Repository Source Code Lulus `npm run build`.
- [x] Seluruh Regression Test Suites Lulus 100% (`test:auth`, `test:fase2` - `test:fase9`, `test:cache`).
- [x] File `.env.example` telah diperbarui dengan placeholder yang aman.
- [x] Dokumen `HANDOVER_GUIDE.md` telah diserahkan kepada pihak Panitia / IT Prodi.
- [x] Akun Google Cloud, Vercel, dan Resend telah diserahterimakan kepada penanggung jawab Prodi.

---
*Dokumen ini dibuat secara otomatis sebagai panduan resmi serah terima sistem PDH Campus Order.*
