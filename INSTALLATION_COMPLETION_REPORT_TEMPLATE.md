# BERITA ACARA PENYELESAIAN INSTALASI SISTEM (INSTALLATION COMPLETION REPORT)
## PDH CAMPUS ORDER — MASTER RELEASE v1.0.0

Laporan Berita Acara ini merupakan bukti resmi bahwa proses instalasi, pengujian fungsional, dan serah terima operasional sistem **PDH Campus Order** telah selesai dilaksanakan oleh Vendor pada infrastruktur Klien.

---

### 1. INFORMASI IDENTITAS INSTALASI

| Parameter | Data Hasil Instalasi |
| :--- | :--- |
| **Nama Program Studi (Klien)** | `[Nama Program Studi]` |
| **Fakultas / Departemen** | `[Nama Fakultas]` |
| **Perguruan Tinggi / Universitas** | `[Nama Universitas]` |
| **Kode Singkatan Prodi** | `[Kode Prodi, misal: MJSP / TISP]` |
| **Tenant ID** | `TENANT-001` |
| **URL Produksi Aplikasi (Live)** | `https://[domain-aplikasi-prodi].vercel.app` |
| **Tanggal Penyelesaian Instalasi** | `[Tanggal / Bulan / Tahun]` |
| **Engineer Pelaksana Vendor** | `[Nama Engineer Vendor]` |
| **Penanggung Jawab Klien (PIC)** | `[Nama PIC / Ketua Panitia Prodi]` |

---

### 2. REKAPITULASI STATUS INFRASTRUKTUR & DATABASE

| Komponen Infrastruktur | Status Uji | Keterangan Hasil Uji |
| :--- | :---: | :--- |
| **Vercel Serverless Hosting** | `[ ] PASS` | Deployment sukses, routing API `/api/*` & SPA aktif. |
| **Google Cloud Service Account** | `[ ] PASS` | Sheets API & Drive API terhubung dengan izin Editor. |
| **Google Sheets Database** | `[ ] PASS` | 12 Lembar kerja terinisialisasi otomatis & persisten. |
| **Google Drive File Storage** | `[ ] PASS` | Subfolder `PEMBAYARAN` & `DESAIN_PDH` aktif di Drive Klien. |
| **Resend Email Dispatcher** | `[ ] PASS` | Email verifikasi akun & reset password terkirim sukses. |
| **Initial Admin Setup** | `[ ] PASS` | Akun Panitia pertama aktif, Setup Lock terpasang permanen. |

---

### 3. REKAPITULASI HASIL SMOKE TEST & PENERIMAAN FUNGSIONAL

| Modul Pengujian | Status | Catatan Verifikasi Bersama |
| :--- | :---: | :--- |
| **Health Check API (`/api/health`)** | `[ ] PASS` | Status sistem `200 OK` (Healthy). |
| **Otentikasi & Login Panitia** | `[ ] PASS` | Masuk ke Back Office dashboard sukses. |
| **Registrasi Mahasiswa & Verifikasi Email** | `[ ] PASS` | Mahasiswa aktivasi via token email sukses. |
| **Pemesanan PDH Mandiri / Kolektif** | `[ ] PASS` | Validasi size chart, nama dada, & kalkulasi akurat. |
| **Pembayaran & Upload Bukti Transfer** | `[ ] PASS` | Bukti bayar tersimpan di Drive, notifikasi terbit. |
| **Approval Pembayaran & Status LUNAS** | `[ ] PASS` | Panitia approve pembayaran, status terupdate. |
| **Update Progres Produksi & Upload Foto** | `[ ] PASS` | Linimasa progres konveksi terupdate real-time. |
| **Cetak / Generate PDF SPK Konveksi** | `[ ] PASS` | Dokumen PDF manufaktur terformat rapi. |
| **Keamanan RBAC & Proteksi IDOR** | `[ ] PASS` | Mahasiswa diblokir dari aksi administratif. |

---

### 4. CATATAN & REKOMENDASI OPERASIONAL
1. Klien telah memeriksa langsung kelancaran operasional sistem melalui URL produksi yang tercantum.
2. Seluruh data transaksi, berkas bukti transfer, dan konfigurasi master PDH berada 100% di dalam Google Spreadsheet dan Google Drive milik Klien.
3. Klien disarankan melakukan backup berkala terhadap Google Spreadsheet database prodi.

---

### 5. PERNYATAAN SERAH TERIMA & TANDA TANGAN

Dengan menandatangani laporan ini, kedua belah pihak menyatakan bahwa instalasi sistem **PDH Campus Order** telah selesai dilaksanakan dengan baik, seluruh pengujian fungsional dinyatakan **LULUS (PASS)**, dan sistem siap dioperasikan secara mandiri oleh Program Studi.

<br>

| PIHAK VENDOR | PIHAK KLIEN (PROGRAM STUDI) |
| :---: | :---: |
| <br><br><br>___________________________________<br>**( Nama Engineer Vendor )**<br>Tim Implementasi Sistem | <br><br><br>___________________________________<br>**( Nama Penanggung Jawab Klien )**<br>Ketua Panitia / Admin Utama Prodi |
