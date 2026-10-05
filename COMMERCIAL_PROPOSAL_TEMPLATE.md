# PROPOSAL PENAWARAN PENGADAAN PERANGKAT LUNAK (COMMERCIAL PROPOSAL TEMPLATE)
## SISTEM MANAJEMEN PEMESANAN PDH PROGRAM STUDI (PDH CAMPUS ORDER)

---

**Nomor Surat**: PRO/PDH/[TAHUN]/[NOMOR_SURAT]  
**Tanggal**: [TANGGAL]  
**Lampiran**: 1 (Satu) Berkas  
**Perihal**: Penawaran Pengadaan Sistem Informasi Pemesanan PDH & Seragam Himpunan

**Kepada Yth.**  
Pimpinan / Ketua Program Studi [NAMA_PRODI]  
Fakultas [NAMA_FAKULTAS] — [NAMA_UNIVERSITAS]  
Di Tempat  

---

### A. SURAT PENGANTAR PENAWARAN
Dengan hormat,  
Sehubungan dengan kebutuhan digitalisasi proses pengadaan Pakaian Dinas Harian (PDH) dan seragam mahasiswa di lingkungan Program Studi [NAMA_PRODI], perkenankan kami mengajukan penawaran pengadaan perangkat lunak **PDH Campus Order Master Release v1.0.0**. Solusi ini dirancang untuk mewujudkan pengelolaan pemesanan yang transparan, akurat, dan aman tanpa membebani kas organisasi dengan biaya langganan bulanan.

---

### B. LATAR BELAKANG
Pengelolaan pre-order seragam mahasiswa secara manual sering kali menemui kendala salah rekap ukuran, konfirmasi transfer yang terselip, dan ketiadaan dokumen manufaktur resmi ke pihak konveksi. PDH Campus Order hadir untuk mentransformasikan seluruh tahapan ini ke dalam satu ekosistem web modern.

---

### C. SOLUSI YANG DITAWARKAN
Sistem informasi berbasis web yang mencakup Portal Mahasiswa untuk pemesanan mandiri & kolektif, Back Office Panitia untuk verifikasi pembayaran dan monitoring konveksi, serta generator dokumen PDF Surat Perintah Kerja (SPK) Konveksi otomatis.

---

### D. RUANG LINGKUP PEKERJAAN (SCOPE OF WORK)
1. Penyediaan paket perangkat lunak **PDH Campus Order Master Release v1.0.0**.
2. Jasa konfigurasi dan deployment sistem ke atas infrastruktur cloud milik Program Studi.
3. Integrasi basis data ke Google Spreadsheet dan media penyimpanan ke Google Drive milik Program Studi.
4. Pengujian fungsi sistem (*User Acceptance Smoke Testing*).
5. Pendampingan inisialisasi akun Administrator Panitia pertama (*Initial Admin Setup*).
6. Penyerahan dokumentasi operasional dan serah terima sistem.

---

### E. FITUR UTAMA
- **Portal Mahasiswa**: Registrasi akun, verifikasi email, form pemesanan interaktif (pilihan ukuran, bordir nama dada), transfer bank/QRIS, upload bukti bayar, dan tracking linimasa produksi publik.
- **Back Office Panitia**: Dashboard keuangan, approval pembayaran, update progres pabrik konveksi & dokumentasi foto, laporan rekapitulasi ukuran, dan cetak SPK Konveksi PDF otomatis.

---

### F. MODEL DEPLOYMENT & KEDAULATAN DATA
Sistem mengusung model **Client-Owned Infrastructure + Vendor Installation (Jual-Putus)**:
- Seluruh basis data (Google Sheets) dan berkas media (Google Drive) berada 100% di bawah kendali Program Studi.
- Serverless web hosting berjalan di atas akun Vercel milik Program Studi.
- Vendor tidak memungut biaya langganan bulanan atau biaya per transaksi.

---

### G. KEBUTUHAN INFRASTRUKTUR KLIEN (PREREQUISITES)
Program Studi menyiapkan resource cloud berikut (dapat menggunakan paket gratis/free tier):
1. Akun Vercel (Hosting Serverless).
2. Akun Google Cloud Platform (Sheets API & Drive API).
3. 1 Google Spreadsheet kosong (Database).
4. 1 Folder Google Drive (Storage Berkas).
5. Akun Resend (Layanan Email Transaksional).

---

### H. ESTIMASI INVESTASI & HARGA
| Komponen Pengadaan | Rincian Layanan | Biaya Investasi |
| :--- | :--- | :---: |
| **Lisensi Hak Pakai PDH Campus Order** | Hak penggunaan permanen (*Perpetual Right-to-Use*) untuk 1 Program Studi. | `Rp [HARGA_LISENSI]` |
| **Jasa Instalasi & Deployment** | Setup infrastruktur, konfigurasi database Google Sheets, dan deployment Vercel. | `Rp [HARGA_INSTALASI]` |
| **Pelatihan & Serah Terima** | Pendampingan initial setup dan panduan operasional Panitia. | `INCLUDED` |
| **TOTAL INVESTASI** | **Sistem Siap Operasional Penuh** | **`Rp [TOTAL_HARGA]`** |

*Catatan: Biaya pihak ketiga (jika ada penggunaan di luar batas gratis kuota GCP/Resend) menjadi tanggung jawab Klien.*

---

### I. TIMELINE PELAKSANAAN
- **Hari ke-1**: Penyiapan infrastruktur cloud dan pengisian data oleh Klien (`INSTALLATION_INPUT_TEMPLATE.md`).
- **Hari ke-2**: Pelaksanaan deployment, konfigurasi environment, dan inisialisasi database oleh Vendor.
- **Hari ke-3**: Initial Admin Setup, verifikasi fungsional bersama, dan penandatanganan Berita Acara Serah Terima.

---

### J. GARANSI & DUKUNGAN TEKNIS
Vendor memberikan garansi perbaikan cacat sistem (*Bug Fixes*) selama **[PERIODE GARANSI]** terhitung sejak penandatanganan Berita Acara Serah Terima.

---

### K. BATASAN PRODUK
Pengadaan ini mencakup hak pakai sistem fungsional siap pakai. Kode sumber (*source code*) dan private repository tetap merupakan hak kekayaan intelektual milik Vendor.

---

### L. PENUTUP
Demikian proposal penawaran ini kami sampaikan. Kami siap membantu Program Studi [NAMA_PRODI] mewujudkan tata kelola pengadaan PDH yang modern dan profesional.

Hormat kami,  
**Tim Implementasi PDH Campus Order**  

<br><br>
____________________________________  
**( [NAMA_REPRESENTATIF_VENDOR] )**  
*Lead Technical Consultant*  
