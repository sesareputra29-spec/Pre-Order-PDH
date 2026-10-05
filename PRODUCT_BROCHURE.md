# BROSUR PRODUK KOMERSIAL (PRODUCT BROCHURE)
## PDH CAMPUS ORDER — Sistem Manajemen Pemesanan PDH & Seragam Himpunan Mahasiswa

---

### 1. RINGKASAN PRODUK (OVERVIEW)
**PDH Campus Order** adalah solusi platform digital terintegrasi yang dirancang khusus untuk Program Studi, Jurusan, dan Himpunan Mahasiswa di perguruan tinggi. Aplikasi ini mengotomatiskan seluruh alur pengadaan Pakaian Dinas Harian (PDH) dan seragam angkatan—mulai dari pendaftaran mahasiswa, pemilihan size chart interaktif, pemesanan mandiri & kolektif per kelas, verifikasi transfer pembayaran, pelacakan progres konveksi real-time, hingga pencetakan Surat Perintah Kerja (SPK) konveksi format PDF standar industri.

---

### 2. MASALAH YANG KAMI SELESAIKAN (PROBLEM & PAIN POINTS)
- **Rekapitulasi Manual yang Rentan Salah**: Pencatatan ukuran baju dan bordir nama dada melalui spreadsheet terpisah sering kali menyebabkan salah jahit atau selisih data.
- **Konfirmasi Pembayaran yang Berceceran**: Bukti transfer yang dikirim via WhatsApp sering hilang, sulit dicocokkan dengan mutasi rekening, dan rawan bukti transfer palsu.
- **Transparansi Progres Konveksi Rendah**: Mahasiswa sering bertanya-tanya kapan baju selesai diproduksi karena minimnya akses informasi status pabrik.
- **Ketergantungan Biaya Langganan (SaaS Vendor Lock-in)**: Kampus sering terbebani biaya langganan bulanan (*monthly subscription*) yang membebani kas himpunan mahasiswa.

---

### 3. KEUNGGULAN UTAMA (KEY BENEFITS)
1. **Model Beli Putus (One-Time Purchase)**: Tanpa biaya langganan bulanan dari vendor. Sistem menjadi hak pakai penuh milik Program Studi.
2. **Kedaulatan Data 100% (Client-Owned Data)**: Seluruh database tersimpan di Google Spreadsheet dan bukti bayar tersimpan di Google Drive milik Program Studi sendiri.
3. **Cetak Dokumen SPK Konveksi Sekali Klik**: Hasilkan lembar kerja manufaktur berformat PDF resmi lengkap dengan rincian size chart, bordir nama dada, dan rekapitulasi jumlah stel baju.
4. **Keamanan & Anti-Manipulasi (IDOR & RBAC)**: Hak akses mahasiswa dan panitia terpisah secara ketat, dilengkapi *Setup Lock* dan audit log append-only.
5. **Dukungan Pre-Order Mandiri & Kolektif**: Fleksibilitas pemesanan langsung oleh mahasiswa perorangan maupun dikoordinasikan oleh ketua kelas/angkatan.

---

### 4. ALUR KERJA SISTEM (WORKFLOW)
```
[1. REGISTRASI MAHASISWA] ──► [2. PILIH UKURAN & ORDER] ──► [3. UPLOAD BUKTI TRANSFER]
                                                                     │
                                                                     ▼
[6. CETAK SPK & DISTRIBUSI] ◄── [5. UPDATE PROGRES 100%] ◄── [4. PANITIA APPROVAL]
```

---

### 5. MODEL DEPLOYMENT & KEPEMILIKAN INFRASTRUKTUR
- **Infrastruktur Produksi Milik Klien**: Aplikasi dipasang pada akun Vercel, Google Cloud, dan Resend milik Program Studi Anda.
- **Instalasi Ditangani Penuh oleh Vendor**: Tim teknis vendor melakukan konfigurasi, deployment, dan pengujian penerimaan sistem hingga siap digunakan (*Turnkey Installation*).
- **Kerahasiaan Kode Sumber**: Kode sumber dikelola secara privat oleh vendor untuk menjamin stabilitas arsitektur dan perlindungan hak cipta perangkat lunak.

---

### 6. INFORMASI PEMESANAN & PENAWARAN
Untuk konsultasi pengadaan sistem dan penjadwalan demo, hubungi tim perwakilan kami melalui saluran komunikasi resmi kampus Anda.
