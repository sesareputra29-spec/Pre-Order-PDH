# MATRIKS FITUR PRODUK (PRODUCT FEATURE MATRIX)
## PDH Campus Order — Master Release v1.0.0

Matriks ini merinci seluruh modul, fitur bisnis, target pengguna, dan status ketersediaan dalam paket pengadaan **PDH Campus Order**.

---

### MATRIKS FITUR STANDAR & ADD-ON

| Modul Sistem | Fitur Bisnis Utama | Target Pengguna | Status Paket |
| :--- | :--- | :---: | :---: |
| **1. Otentikasi & Akun** | Registrasi akun mahasiswa, verifikasi token email, login JWT, dan reset password mandiri. | Mahasiswa & Panitia | `INCLUDED (Standar)` |
| **2. Manajemen Mahasiswa** | Master biodata mahasiswa prodi (NIM, Nama, Kelas, Email, No. WA). | Panitia | `INCLUDED (Standar)` |
| **3. Master Desain & Mockup**| Pengaturan spesifikasi bahan, foto mockup PDH, panduan ukuran (Size Chart), dan harga pokok. | Panitia | `INCLUDED (Standar)` |
| **4. Manajemen Periode PO** | Buka/tutup gelombang pemesanan (*Batch PO*) dan penetapan batas waktu pemesanan. | Panitia | `INCLUDED (Standar)` |
| **5. Pemesanan Mandiri** | Formulir pemesanan perorangan dengan pemilihan ukuran dan input bordir nama dada kustom. | Mahasiswa | `INCLUDED (Standar)` |
| **6. Pemesanan Kolektif** | Formulir pemesanan rombongan per kelas/angkatan yang dikelola oleh koordinator kelas. | Koordinator Kelas | `INCLUDED (Standar)` |
| **7. Multi-Metode Pembayaran**| Dukungan Transfer Bank (BCA, Mandiri, BRI, BNI), QRIS, dan Tunai. | Mahasiswa | `INCLUDED (Standar)` |
| **8. Verifikasi Pembayaran** | Unggah bukti transfer langsung ke Google Drive dan modul approval/rejection Panitia. | Panitia & Mahasiswa | `INCLUDED (Standar)` |
| **9. Pelacakan Produksi** | Pemantauan linimasa persentase pengerjaan konveksi (0% - 100%) dan estimasi selesai. | Mahasiswa & Panitia | `INCLUDED (Standar)` |
| **10. Dokumentasi Pabrik** | Unggah foto dokumentasi penjahitan, bordir, dan finishing dari vendor konveksi ke Drive. | Panitia | `INCLUDED (Standar)` |
| **11. Notifikasi Terintegrasi** | Notifikasi in-app otomatis saat status pesanan, pembayaran, atau produksi diperbarui. | Mahasiswa & Panitia | `INCLUDED (Standar)` |
| **12. Audit Trail Aktivitas** | Pencatatan riwayat transaksi dan aktivitas administratif append-only tanpa risiko manipulasi. | Panitia / Auditor | `INCLUDED (Standar)` |
| **13. Rekapitulasi Data** | Laporan statistik pesanan, total baju per ukuran, dan ringkasan keuangan masuk/keluar. | Panitia | `INCLUDED (Standar)` |
| **14. SPK Konveksi Server-Side**| Cetak dokumen Surat Perintah Kerja (SPK) berformat PDF resmi untuk diserahkan ke vendor jahit. | Panitia | `INCLUDED (Standar)` |
| **15. Manajemen Administrator** | Pengelolaan hak akses panitia dan penguncian akun admin utama (*Initial Admin Setup Lock*). | Panitia Utama | `INCLUDED (Standar)` |
| **16. Isolasi Data Multi-Tenant**| Pemisahan mutlak basis data dan file media per Program Studi (*Zero Data Mixing*). | Institusi Kampus | `INCLUDED (Standar)` |
| **17. Proteksi IDOR & RBAC** | Pembatasan hak akses berbasis peran dan pencegahan manipulasi URL transaksi mahasiswa lain. | Sistem / Keamanan | `INCLUDED (Standar)` |
| **18. Integrasi Payment Gateway**| Integrasi otomatisasi pembayaran via Midtrans / Xendit / DOKU. | Mahasiswa & Panitia | `ADD-ON (Opsional)` |
| **19. Integrasi SIAKAD Kampus** | Sinkronisasi data mahasiswa langsung ke database akademik universitas via API. | IT Universitas | `ADD-ON (Opsional)` |
| **20. Kustomisasi Desain UI** | Pengubahan tema antarmuka khusus sesuai pedoman identitas visual (*brand guide*) kampus. | Program Studi | `ADD-ON (Opsional)` |
