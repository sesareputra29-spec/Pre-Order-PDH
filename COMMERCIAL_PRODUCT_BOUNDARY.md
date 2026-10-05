# BATASAN PRODUK KOMERSIAL (COMMERCIAL PRODUCT BOUNDARY)
## PDH Campus Order — Model Jual-Putus (Client-Owned Infrastructure)

Dokumen ini mendefinisikan pembagian hak, kepemilikan aset, dan batasan produk komersial antara **Vendor** dan **Klien (Program Studi / Himpunan Mahasiswa Pembeli)**.

---

### 1. YANG DIBELI OLEH KLIEN (WHAT CLIENT PURCHASES)

Dalam transaksi pengadaan perangkat lunak PDH Campus Order, Klien memperoleh:
1. **Hak Penggunaan Aplikasi (Right-to-Use)**: Hak operasional tidak terbatas untuk menggunakan sistem PDH Campus Order pada Program Studi bersangkutan.
2. **Instalasi Produksi (Production Installation)**: Jasa pemasangan, konfigurasi, dan deployment sistem ke atas infrastruktur cloud milik Klien oleh Vendor.
3. **Konfigurasi Identitas Tenant**: Penyesuaian nama perguruan tinggi, fakultas, nama prodi, kode prodi, dan pengaturan periode pemesanan awal.
4. **Initial Deployment**: Pelaksanaan deployment awal ke platform Vercel Klien hingga status *Healthy* (`200 OK`).
5. **Initial Admin Setup**: Pendampingan pembuatan akun administrator Panitia pertama dengan mekanisme enkripsi dan penguncian (*Setup Lock*).
6. **Functional Verification**: Pengujian penerimaan fungsi menyeluruh (*smoke testing*) sebelum serah terima.
7. **Handover & Dokumentasi**: Penyerahan URL produksi aktif beserta dokumen panduan operasional pengguna (`HANDOVER_GUIDE.md`, `README.md`).

---

### 2. YANG TETAP MENJADI MILIK VENDOR (WHAT REMAINS VENDOR'S PROPERTY)

Aset-aset berikut tetap menjadi hak milik eksklusif dan hak kekayaan intelektual (*Intellectual Property*) Vendor:
1. **Source Code Aplikasi**: Seluruh kode sumber mentah frontend (`.tsx`, `.ts`), backend Express, modul bridge Google Sheets, dan utilitas pendukung.
2. **Private Git Repository**: Repositori kode sumber internal di GitHub / GitLab beserta seluruh riwayat commit (*commit history*) dan branch pengembangan.
3. **Build & Development Environment**: Lingkungan pengembangan internal, konfigurasi tooling internal, dan dependensi pengembang milik Vendor.
4. **Internal Deployment Tooling**: Otomasi pipeline rilis internal dan skrip deployment internal milik tim Vendor.
5. **Intellectual Property (IP)**: Hak cipta perangkat lunak, algoritma, arsitektur sistem, dan desain logika aplikasi.
6. **Framework Internal & Reusable Components**: Komponen generik, utility functions, dan arsitektur multi-tenant milik Vendor.

---

### 3. YANG MENJADI MILIK KLIEN (WHAT CLIENT OWNS & CONTROLS)

Klien memiliki dan mengendalikan secara penuh seluruh komponen data dan infrastruktur berikut:
1. **Akun & Project Vercel**: Akun Vercel Klien tempat aplikasi berjalan secara serverless.
2. **Google Cloud Platform Project**: Project GCP, kuota API, dan akun Service Account atas nama Klien.
3. **Google Spreadsheet (Database)**: File spreadsheet Google Sheets yang memuat seluruh 12 tabel data transaksi.
4. **Google Drive (File Storage)**: Folder Google Drive penampung seluruh berkas bukti pembayaran, desain PDH, dan foto progres produksi.
5. **Akun & Konfigurasi Resend**: Akun Resend, domain pengirim kampus, dan API Key Resend milik Klien.
6. **Data Mahasiswa & Transaksi (Kedaulatan Data)**: Seluruh data pribadi mahasiswa, NIM, nomor WhatsApp, riwayat pesanan, mutasi pembayaran, dan log audit prodi.
7. **Domain & Subdomain**: Domain institusi kampus (misal: `pdh.prodi-kampus.ac.id`) yang dikontrol penuh oleh Klien.

---

### 4. PRINSIP HUBUNGAN KOMERSIAL
- **Model Jual-Putus Bukan Transfer Kode Sumber**: Transaksi jual-putus memberikan hak penggunaan sistem siap pakai pada infrastruktur Klien, bukan pengalihan hak milik kode sumber (*source code transfer*).
- **Kemandirian Operasional Penuh**: Sistem beroperasi murni di atas infrastruktur Klien tanpa ketergantungan runtime ke server/infrastruktur milik Vendor (*Zero Vendor Runtime Dependency*).
