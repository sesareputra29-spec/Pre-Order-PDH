# BATASAN PRODUK & KESEPAKATAN KOMERSIAL (IP & COMMERCIAL BOUNDARY)
## PDH Campus Order — Master Release v1.0.0

Dokumen ini menjelaskan batas teknis produk (*technical product boundary*) dan prinsip-prinsip dasar yang menjadi acuan dalam penyusunan perjanjian komersial/kontrak antara **Vendor** dan **Klien (Program Studi / Himpunan Mahasiswa)**.

---

### 1. MATRIKS BATASAN TEKNIS PRODUK

| Aspek Produk | Status Batasan Teknis | Keterangan & Batas Operasional |
| :--- | :---: | :--- |
| **Nama Produk** | `PDH Campus Order` | Sistem manajemen pemesanan PDH & seragam himpunan multi-tenant. |
| **Model Distribusi** | `Jual-Putus` | Pengadaan lisensi penggunaan sistem tanpa biaya langganan bulanan dari vendor. |
| **Infrastruktur Produksi** | `Client-Owned` | Seluruh akun Vercel, Google Cloud, Google Sheets, Google Drive, dan Resend dimiliki Klien. |
| **Metode Instalasi** | `Vendor-Installed` | Deployment dan konfigurasi awal dilakukan oleh tim Vendor. |
| **Kode Sumber (Source Code)** | `Vendor Private` | Kode sumber mentah dan repositori Git tetap menjadi hak kekayaan intelektual Vendor. |
| **Data & Transaksi** | `Client-Owned` | 100% data mahasiswa, pesanan, dan keuangan berada di Google Spreadsheet milik Klien. |
| **Pemeliharaan (Maintenance)** | `Perjanjian Terpisah` | Pemeliharaan sistem berkala diatur melalui kontrak *Service Level Agreement (SLA)* terpisah. |
| **Pengembangan Kustom (Custom Dev)**| `Perjanjian Terpisah` | Penambahan fitur baru di luar Master Release v1.0.0 diatur melalui kontrak pengembangan baru. |
| **Dukungan Teknis (Support)** | `Sesuai Paket Kontrak`| Bantuan teknis masa garansi serah terima diberikan sesuai lingkup paket yang disepakati. |

---

### 2. PRINSIP KEDAULATAN DATA KLIEN
1. **Zero Vendor Data Access**: Vendor tidak memiliki akses permanen ke database Google Sheets atau Google Drive Klien setelah proses instalasi dan serah terima selesai.
2. **Kemandirian Operasional**: Klien dapat mengelola seluruh pre-order, mengubah harga, membuka/menutup gelombang PO, memverifikasi pembayaran, dan mencetak laporan SPK tanpa bergantung pada kehadiran Vendor.
3. **Penyimpanan Berkas Langsung**: Bukti transfer pembayaran mahasiswa terunggah langsung dari browser ke Google Drive milik Program Studi.

---

### 3. CATATAN KLAUSUL HUKUM & KONTRAK
Ketentuan yang tercantum dalam dokumen ini merupakan batasan teknis dari perangkat lunak Master Release v1.0.0. Seluruh aspek hak, kewajiban hukum, garansi operasional, dan durasi dukungan teknis wajib dituangkan secara formal dalam **Surat Perjanjian Kerja Sama / Kontrak Pengadaan Perangkat Lunak** yang ditandatangani oleh pimpinan berwenang dari kedua belah pihak.
