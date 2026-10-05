# BATASAN PENYERAHAN PRODUK & KODE SUMBER (CLIENT SOURCE CODE BOUNDARY)
## PDH Campus Order — Model Jual-Putus

Dokumen ini memperjelas rincian aset apa saja yang **DITERIMA** dan yang **TIDAK DITERIMA** oleh Klien (Program Studi / Himpunan Mahasiswa) dalam transaksi pengadaan sistem PDH Campus Order.

---

### 1. ASET YANG DITERIMA OLEH KLIEN (WHAT CLIENT RECEIVES)

Klien menerima secara penuh dan sah seluruh hal berikut:
1. **URL Aplikasi Produksi yang Aktif**: URL resmi (misal: `https://pdh.prodi-kampus.ac.id`) yang siap diakses oleh mahasiswa dan panitia.
2. **Aplikasi Siap Pakai (Production Application)**: Sistem fungsional lengkap mencakup Portal Mahasiswa, Back Office Panitia, Integrasi Google Sheets, Google Drive, Resend Email, dan Modul Cetak PDF SPK.
3. **Hak Penggunaan Sistem (Full Right-to-Use)**: Hak operasional tidak terbatas untuk mengelola pre-order PDH Program Studi pada infrastruktur milik Klien.
4. **Kepemilikan Infrastruktur & Data 100%**:
   - Akun dan Project Vercel Klien.
   - Google Spreadsheet database Klien (lengkap dengan 12 tabel otomatis).
   - Google Drive Folder Klien (berisi seluruh bukti bayar dan desain).
   - Akun Resend Klien.
5. **Akun Administrator Utama (Initial Admin)**: Akses Panitia utama yang dibuat sendiri oleh Klien saat inisialisasi awal.
6. **Dokumentasi Operasional Resmi**:
   - `HANDOVER_GUIDE.md`: Panduan lengkap pengoperasian Back Office bagi Panitia.
   - `README.md`: Gambaran umum sistem dan fitur.
   - `INSTALLATION_COMPLETION_REPORT_TEMPLATE.md`: Bukti Berita Acara Serah Terima.

---

### 2. ASET YANG TIDAK DITERIMA OLEH KLIEN (WHAT CLIENT DOES NOT RECEIVE)

Klien **TIDAK MENERIMA** dan Vendor **TIDAK MENYERAHKAN** hal-hal berikut:
1. **Private Git Repository**: Akses akun GitHub / GitLab repositori kode sumber milik Vendor.
2. **Source Code Mentah (`.ts`, `.tsx`, raw files)**: File kode sumber mentah pengembangan sistem.
3. **Development Branches & Git History**: Riwayat commit, pull request, atau branch eksperimental internal tim pengembang.
4. **Internal Test Suites**: Skrip unit testing dan automated regression testing (`test*.ts`).
5. **Internal Deployment & CI/CD Pipeline Vendor**: Konfigurasi internal otomasi pengembang Vendor.
6. **Kredensial Internal Tim Vendor**: Akun pengembang, API key vendor, atau kunci kriptografi internal Vendor.
7. **Aset Proprietary & Hak Cipta Perangkat Lunak**: Hak kepemilikan kode sumber dan hak cipta software tetap menjadi hak kekayaan intelektual Vendor.

---

### 3. KONSEKUENSI TEKNIS BAGI KLIEN
- Klien dapat menggunakan seluruh fitur aplikasi tanpa kendala dan tanpa batasan durasi.
- Jika Klien membutuhkan kustomisasi fitur baru di luar spesifikasi Master Release v1.0.0, hal tersebut diproses melalui kesepakatan pengembangan terpisah (*Custom Development Agreement*).
