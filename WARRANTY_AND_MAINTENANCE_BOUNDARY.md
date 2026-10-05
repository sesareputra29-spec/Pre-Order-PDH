# BATASAN GARANSI & PEMELIHARAAN (WARRANTY & MAINTENANCE BOUNDARY)
## PDH Campus Order — Service Level & Scope Definition

Dokumen ini mendefinisikan ruang lingkup dukungan teknis, cakupan garansi operasional, dan batasan pemeliharaan sistem paska-instalasi (*Post-Handover SLA*).

---

### 1. RUANG LINGKUP YANG TERMASUK DALAM GARANSI (INCLUDED IN WARRANTY)

Selama **[PERIODE GARANSI]** terhitung sejak penandatanganan Berita Acara Serah Terima, Vendor bertanggung jawab atas:
1. **Perbaikan Cacat Sistem (Bug Fixes)**: Penanganan kendala atau malafungsi pada fitur existing Master Release v1.0.0 yang tidak berjalan sesuai spesifikasi (misal: gagal kalkulasi total order, error approval pembayaran, dll.).
2. **Koreksi Kesalahan Instalasi Vendor**: Perbaikan terhadap kesalahan konfigurasi awal yang diakibatkan oleh kelalaian instalasi Tim Vendor.
3. **Dukungan Konfigurasi Awal**: Konsultasi bantuan teknis terkait pengaturan periode pemesanan pertama dan master harga PDH.
4. **Validasi Ulang Endpoint Sistem**: Bantuan verifikasi jika terjadi gangguan konektivitas antara backend Vercel dan Google Sheets/Drive Klien yang disebabkan oleh isu kompatibilitas internal aplikasi.

---

### 2. RUANG LINGKUP YANG TIDAK TERMASUK DALAM GARANSI (NOT AUTOMATICALLY INCLUDED)

Hal-hal berikut berada di luar cakupan garansi standar dan memerlukan kesepakatan pemeliharaan (*Maintenance Contract*) atau kontrak baru:
1. **Penambahan Fitur Baru (New Feature Requests)**: Penambahan modul, formulir baru, atau fitur analitik baru di luar Master Release v1.0.0.
2. **Perubahan Alur Bisnis (Workflow Changes)**: Modifikasi logika bisnis yang mengubah alur pemesanan atau persetujuan pembayaran yang sudah berjalan.
3. **Redesain Antarmuka (UI/UX Redesign)**: Pengubahan tema, tata letak, atau desain visual aplikasi.
4. **Perubahan Infrastruktur Klien**: Migrasi akun Vercel baru, perubahan kepemilikan Google Cloud, atau penghapusan spreadsheet/drive Klien secara sepihak.
5. **Perubahan Domain / DNS Klien**: Pengalihan nama domain baru atau kegagalan konfigurasi DNS internal institusi Klien.
6. **Perubahan Kebijakan Pihak Ketiga**: Perubahan limit kuota, harga, atau kebijakan API dari Google Cloud, Resend, atau Vercel.
7. **Migrasi Data Eksternal**: Pengimporan atau pembersihan data pesanan tahun-tahun sebelumnya dari sistem lama Klien.
8. **Integrasi Pihak Ketiga Baru**: Penambahan payment gateway eksternal (Midtrans, Xendit, dll.) atau integrasi ke Sistem Informasi Akademik (SIAKAD) kampus.

---

### 3. PROSEDUR KLAIM GARANSI
1. Klien melaporkan kendala melalui saluran dukungan teknis resmi (*Support Channel* Vendor).
2. Vendor melakukan identifikasi apakah kendala masuk dalam kategori *Bug Existing* (Gratis dalam garansi) atau *Change Request* (Berbayar).
3. Vendor menerbitkan perkiraan waktu penanganan (*Response & Resolution Time*) sesuai klasifikasi kendala.
