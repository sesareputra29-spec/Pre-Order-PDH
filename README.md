# PDH CAMPUS ORDER — MASTER RELEASE

Sistem Multi-Tenant Manajemen Pre-Order (PO) Pakaian Dinas Harian (PDH) & Baju Himpunan Kampus.

---

### 1. APA ITU PDH CAMPUS ORDER
**PDH Campus Order** adalah platform manajemen digital siap pakai yang dirancang khusus untuk Himpunan Mahasiswa dan Panitia Pengadaan PDH Program Studi di perguruan tinggi. Aplikasi ini mengotomatiskan seluruh siklus pemesanan baju himpunan: dari registrasi mahasiswa, pemilihan size chart, pemesanan mandiri & kolektif per kelas, verifikasi transfer pembayaran, upload bukti ke Google Drive, pemantauan progres konveksi, hingga cetak SPK Konveksi dan distribusi baju.

---

### 2. FUNGSI UTAMA
- **Portal Mahasiswa**:
  - Registrasi akun dengan verifikasi email otomatis.
  - Pemesanan mandiri atau kolektif per kelas (koordinator).
  - Panduan Size Chart interaktif dan kustomisasi bordir nama dada.
  - Multi-metode pembayaran (Transfer Bank BCA/Mandiri/BRI, QRIS, Tunai).
  - Pelacakan pesanan publik (Lacak NIM) dan timeline progres produksi vendor konveksi (0% - 100%).
- **Back Office Panitia**:
  - Dashboard statistik keuangan & status order real-time.
  - Verifikasi dan approval bukti transfer pembayaran mahasiswa.
  - Pengelolaan Master PDH (Spesifikasi bahan, harga, varian ukuran, foto mockup).
  - Manajemen periode Pre-Order (Buka / Tutup PO).
  - Pembaruan progres produksi masal (Bulk Update) dan upload foto dokumentasi pabrik.
  - Ekspor laporan rekapitulasi data pesanan dan generate PDF SPK Konveksi Server-Side.
  - Audit Trail riwayat aktivitas append-only dengan sanitasi kredensial otomatis.

---

### 3. ARSITEKTUR SISTEM
```
┌─────────────────────────────────────────────────────────────┐
│                    REACT 19 SPA (VITE)                     │
│      Tailwind CSS v4 • Lucide React • Centralized API       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON API
┌──────────────────────────────▼──────────────────────────────┐
│             EXPRESS BACKEND (NODE.JS / VERCEL)              │
│  JWT Auth • RBAC • Multi-Tenant Resolution • Rate Limiter   │
└───────┬──────────────────────┬──────────────────────┬───────┘
        │                      │                      │
┌───────▼────────┐     ┌───────▼────────┐     ┌───────▼───────┐
│ GOOGLE SHEETS  │     │  GOOGLE DRIVE  │     │  RESEND API   │
│ Persistence DB │     │ Storage Berkas │     │ Email Service │
│   (12 Tabel)   │     │ (Bukti & Foto) │     │ (Verifikasi)  │
└────────────────┘     └────────────────┘     └───────────────┘
```

---

### 4. PERSYARATAN DEPLOYMENT
Sebelum melakukan deployment, pastikan Program Studi telah menyiapkan:
1. **Google Cloud Platform Project**:
   - Akun Service Account dengan file JSON credentials (atau Private Key).
   - Google Sheets API v4 aktif.
   - Google Drive API v3 aktif.
2. **Google Spreadsheet & Drive Folder**:
   - 1 Spreadsheet kosong yang dibagikan (*shared*) ke email Service Account dengan peran **Editor**.
   - 1 Folder Google Drive utama yang dibagikan ke email Service Account dengan peran **Editor**.
3. **Akun Resend**:
   - API Key dari [Resend.com](https://resend.com) untuk pengiriman email transaksi.
4. **Akun Vercel**:
   - Untuk deployment serverless web & API.
5. **Node.js**: Versi 18.x atau 20.x LTS.

---

### 5. INSTALASI LOKAL (DEVELOPMENT)

```bash
# 1. Clone repository
git clone <url-repository>
cd pdh-campus-order

# 2. Install dependencies
npm install

# 3. Salin environment template
cp .env.example .env

# 4. Konfigurasi kredensial pada file .env

# 5. Jalankan development server (port 3000)
npm run dev
```

---

### 6. ENVIRONMENT VARIABLES
Seluruh konfigurasi production dikelola via Environment Variables (lihat template `.env.example`):

| Variable | Keterangan | Wajib/Opsional |
| :--- | :--- | :---: |
| `JWT_SECRET` | Kunci rahasia acak minimal 32 karakter untuk penandatanganan token JWT | Wajib |
| `GOOGLE_PROJECT_ID` | Project ID Google Cloud | Wajib |
| `GOOGLE_CLIENT_EMAIL` | Email Service Account GCP | Wajib |
| `GOOGLE_PRIVATE_KEY` | Private Key Service Account GCP (`\n` format) | Wajib |
| `RESEND_API_KEY` | API Key dari Resend untuk pengiriman email | Wajib |
| `EMAIL_FROM` | Alamat email pengirim (Contoh: `PDH <no-reply@domain.ac.id>`) | Wajib |
| `APP_BASE_URL` | URL publik aplikasi (Contoh: `https://pdh.prodi.ac.id`) | Wajib |
| `DEFAULT_TENANT_ID` | ID Tenant utama (Default: `TENANT-001`) | Wajib |
| `TENANT_001_NAMA_PRODI` | Nama Program Studi | Wajib |
| `TENANT_001_KODE_PRODI` | Kode Singkatan Prodi (Contoh: `MJSP`) | Wajib |
| `TENANT_001_SPREADSHEET_ID`| ID Google Spreadsheet database tenant | Wajib |
| `TENANT_001_DRIVE_ROOT_ID` | ID Folder Google Drive root tenant | Wajib |

---

### 7. GOOGLE SHEETS SETUP
1. Buat spreadsheet baru di Google Sheets.
2. Salin Spreadsheet ID dari URL browser: `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`.
3. Klik tombol **Share (Bagikan)**, lalu masukkan email Service Account GCP (`xxx@xxx.iam.gserviceaccount.com`) sebagai **Editor**.
4. Saat pertama kali server dijalankan, sistem otomatis membuat seluruh 12 lembar kerja (*sheets*): `Users`, `Students`, `Orders`, `OrderMembers`, `Payments`, `PaymentProofs`, `ProductionProgress`, `Notifications`, `AuditLogs`, `Configs`, `Periods`, `Tokens`.

---

### 8. GOOGLE DRIVE SETUP
1. Buat folder baru di Google Drive (Contoh: `PDH_CAMPUS_2026`).
2. Salin Folder ID dari URL browser: `https://drive.google.com/drive/folders/<FOLDER_ID>`.
3. Bagikan folder ke email Service Account GCP sebagai **Editor**.
4. Sistem otomatis mengelola subfolder:
   - `DESAIN_PDH` (Mockup & panduan ukuran)
   - `PEMBAYARAN` (Bukti transfer per pesanan)
   - `PROGRESS_PRODUKSI` (Dokumentasi konveksi per pesanan)

---

### 9. RESEND EMAIL SETUP
1. Daftarkan akun di [Resend.com](https://resend.com) dan buat API Key baru.
2. Tambahkan domain resmi kampus (atau gunakan akun verified Resend).
3. Set `RESEND_API_KEY` dan `EMAIL_FROM` di environment variables.

---

### 10. VERCEL DEPLOYMENT
Aplikasi telah dilengkapi konfigurasi `vercel.json` untuk runtime serverless:
1. Hubungkan repository ke dashboard Vercel (**Import Git Repository**).
2. Masukkan seluruh environment variables dari daftar di atas pada menu **Settings > Environment Variables**.
3. Klik tombol **Deploy**.
4. Verifikasi deployment melalui endpoint health check: `https://<domain-anda>.vercel.app/api/health`.

---

### 11. INISIALISASI ADMINISTRATOR PANITIA (INITIAL ADMIN SETUP)
1. Setelah aplikasi ter-deploy pada tenant baru, buka halaman beranda.
2. Form **Inisialisasi Administrator Panitia** akan tampil otomatis.
3. Masukkan Nama Lengkap, Email, dan Kata Sandi Panitia pertama.
4. Klik **Selesaikan Setup & Buat Akun Panitia**.
5. Sistem otomatis mengunci endpoint setup (**Setup Lock**) dan mengarahkan ke login.
6. Login menggunakan email dan kata sandi baru untuk mulai mengelola pre-order.

---

### 12. PENGUJIAN OTOMATIS (TESTING)

```bash
# Jalankan seluruh suite pengujian
npm run test:initial-admin  # Pengujian keamanan akun initial admin (12/12)
npm run test:final          # Pengujian final acceptance suite (15/15)
npm run test:auth           # Pengujian otentikasi & email tokens (20/20)
npm run test:fase2          # Pengujian backend JWT & middleware (13/13)
npm run test:fase3          # Pengujian master PDH & sizes (20/20)
npm run test:fase4          # Pengujian pesanan & anggota kelas (22/22)
npm run test:fase5          # Pengujian pembayaran & approval (22/22)
npm run test:fase6          # Pengujian progres produksi (17/17)
npm run test:fase7          # Pengujian notifikasi & audit trail (29/29)
npm run test:fase8          # Pengujian laporan & PDF SPK konveksi (18/18)
npm run test:fase9          # Pengujian end-to-end workflow (16/16)
npm run test:cache          # Pengujian sinkronisasi cache serverless (9/9)

# Validasi linting dan build produksi
npm run lint                # TypeScript type checking
npm run build               # Vite build & bundle compilation
```

---

### 13. DOKUMEN PENDUKUNG
- `HANDOVER_GUIDE.md`: Panduan serah terima teknis untuk Administrator Prodi.
- `FINAL_PRODUCTION_ACCEPTANCE.md`: Laporan audit penerimaan sistem produksi.
- `J1_INITIAL_ADMIN_REPORT.md`: Laporan implementasi keamanan initial setup.
- `RELEASE_INFO.md`: Ringkasan spesifikasi teknis Master Release.
- `RELEASE_CHECKLIST.md`: Lembar verifikasi kelayakan deployment.

---

### LISENSI & KEPEMILIKAN
Aplikasi ini didistribusikan sebagai **Master Release Produk Jual-Putus**. Setiap Program Studi pembeli memiliki kedaulatan penuh atas database, penyimpanan berkas, dan konfigurasi server masing-masing.
