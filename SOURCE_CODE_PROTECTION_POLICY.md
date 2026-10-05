# KEBIJAKAN PERLINDUNGAN KODE SUMBER (SOURCE CODE PROTECTION POLICY)
## PDH Campus Order — Model Jual-Putus (Client-Owned Infrastructure)

Dokumen ini mendefinisikan pembagian hak milik intelektual (*Intellectual Property*), aset teknis, serta batasan kendali infrastruktur antara **Vendor** dan **Klien (Program Studi / Himpunan Mahasiswa)**.

---

### 1. HAK KEPEMILIKAN & KENDALI VENDOR (VENDOR OWNS / CONTROLS)

Pihak Vendor memiliki dan mengendalikan secara eksklusif seluruh aset berikut:
1. **Source Code Aplikasi**: Seluruh kode sumber frontend (`React 19 Vite`), backend (`Node.js Express`), modul database bridge Google Sheets, modul storage Google Drive, generator PDF SPK, dan utilitas keamanan.
2. **Private Git Repository**: Repositori kode sumber internal, branch pengembangan, riwayat commit (*commit history*), dan arsitektur repositori.
3. **Internal Development Environment**: Lingkungan pengembangan internal, dependensi build, dan tooling pengembang milik Vendor.
4. **Internal Test Infrastructure & Test Suites**: Seluruh skrip automated testing (`testFase*.ts`, `testInitialAdmin.ts`, `testSelfServiceInstallation.ts`, `testFinalProductionAcceptance.ts`).
5. **Release & Build Pipeline**: Prosedur pengemasan Master Release dan skrip build kompilasi sistem.
6. **Internal Vendor Credentials**: Akun internal pengembang, token autentikasi vendor, dan kunci rahasia internal tim pengembang.

---

### 2. HAK KEPEMILIKAN & KENDALI KLIEN (CLIENT OWNS / CONTROLS)

Pihak Klien memiliki dan mengendalikan secara penuh seluruh aset berikut:
1. **Akun & Proyek Vercel**: Akun Vercel resmi milik Klien tempat aplikasi live di-deploy.
2. **Google Cloud Platform Project**: Project GCP, Service Account, dan kuota API yang terdaftar atas nama Klien.
3. **Google Sheets Database**: Berkas Google Spreadsheet yang menjadi tempat penyimpanan seluruh data transaksi pemesanan, pengguna, dan konfigurasi prodi.
4. **Google Drive File Storage**: Folder Google Drive dan seluruh berkas bukti pembayaran, desain PDH, dan foto progres produksi.
5. **Akun & Konfigurasi Resend**: Akun Resend, domain pengirim resmi, dan API Key Resend milik Klien.
6. **Domain & Subdomain**: Domain institusi kampus (misal: `pdh.prodi.ac.id`) yang dikontrol penuh oleh IT Klien.
7. **Production Data (Kedaulatan Data)**: Seluruh data pribadi mahasiswa, NIM, nomor telepon, catatan pesanan, riwayat pembayaran, dan log audit prodi.
8. **Kredensial Produksi Klien**: Kunci `JWT_SECRET`, Service Account Private Key, dan Resend API Key yang tersimpan pada Environment Variables Vercel Klien.

---

### 3. BATASAN TEKNIS & LISENSI OPERASIONAL

- **Hak Penggunaan (Right to Use)**: Klien diberikan hak eksklusif dan permanen untuk menggunakan aplikasi yang terpasang pada infrastruktur Klien guna keperluan pengadaan PDH Program Studi.
- **Ketiadaan Hak Redistribusi Kode**: Klien tidak berhak mengekstrak, merekayasa balik (*reverse engineering*), menjual kembali, atau mendistribusikan kode sumber Vendor kepada pihak ketiga.
- **Ketiadaan Vendor Lock-in pada Data**: Karena database dan file storage berada di Google Sheets dan Google Drive milik Klien, Klien memiliki akses 100% terhadap seluruh data transaksinya kapan pun tanpa hambatan dari Vendor.
