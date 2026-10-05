# KEBIJAKAN BATASAN AKSES VENDOR (VENDOR ACCESS POLICY)
## PDH Campus Order — Model Jual-Putus

Dokumen ini mengikat Tim Vendor secara legal dan teknis terkait batasan wewenang dan hak akses terhadap infrastruktur serta data milik Klien (Program Studi / Himpunan Mahasiswa).

---

### 1. WEWENANG YANG DIIZINKAN (VENDOR BOLEH)

Dalam rangka proses instalasi, deployment, dan dukungan teknis serah terima, Vendor berhak:
1. **Melakukan Deployment Aplikasi**: Memasang paket Master Release v1.0.0 ke platform hosting serverless Vercel milik Klien.
2. **Melakukan Konfigurasi Environment**: Membantu memasukkan parameter konfigurasi pada Vercel Environment Variables sesuai data dari Klien.
3. **Melakukan Pengujian (Testing)**: Menjalankan smoke test, uji konektivitas API Google Sheets/Drive, uji pengiriman email Resend, dan verifikasi alur bisnis.
4. **Melakukan Troubleshooting**: Mendiagnosis kendala teknis jaringan, izin API Google Cloud, atau kegagalan build selama sesi instalasi.
5. **Menggunakan Akses Delegasi Resmi**: Menggunakan peran kolaborator proyek Vercel yang diberikan Klien selama jangka waktu proses instalasi berlangsung.

---

### 2. LARANGAN KERAS (VENDOR TIDAK BOLEH)

Demi menjaga kedaulatan data dan keamanan Klien, Vendor **DILARANG KERAS**:
1. **Meminta Kata Sandi Akun Klien**: Vendor tidak boleh meminta password akun personal Vercel, Google, atau Resend milik Klien jika fitur delegasi peran (*Collaboration/Team Invite*) atau sesi remote terpandu (*Mode B*) tersedia.
2. **Menyimpan Kredensial Klien di Repositori**: Vendor dilarang menyimpan API Key, Service Account JSON Key, Private Key, atau JWT Secret milik Klien ke dalam Git repository, commit history, atau catatan internal vendor.
3. **Memasukkan Kredensial Klien ke Source Code**: Vendor dilarang melakukan hardcode nilai-nilai konfigurasi Klien ke dalam file kode sumber aplikasi.
4. **Membocorkan atau Membagikan Data Mahasiswa**: Vendor dilarang mengunduh, mengekspor, menyalin, atau membagikan database biodata mahasiswa, NIM, nomor WhatsApp, atau rekapan pembayaran kepada pihak ketiga mana pun.
5. **Menyerahkan Source Code / Repositori Privat**: Sesuai model lisensi jual-putus aplikasi, hak cipta dan kepemilikan kode sumber (*Intellectual Property*) tetap berada pada Vendor. Vendor dilarang menyerahkan source code repository Git mentah kepada Klien.
6. **Mengekspos Secret ke Frontend**: Vendor dilarang memindahkan atau mengonfigurasi variabel rahasia dengan prefix `VITE_` yang dapat dibaca publik melalui browser.
7. **Menggunakan Infrastruktur Klien untuk Pihak Lain**: Vendor dilarang menggunakan Spreadsheet ID, Drive Root ID, atau Service Account milik Klien untuk keperluan instalasi Program Studi lain (*Zero Cross-Tenant Misuse*).

---

### 3. PENCABUTAN AKSES PASCA-INSTALASI

Setelah proses instalasi selesai dan dokumen `INSTALLATION_COMPLETION_REPORT_TEMPLATE.md` ditandatangani bersama:
- Vendor wajib keluar (*Leave Project*) dari kolaborasi Vercel Klien.
- Klien berhak mencabut hak akses kolaborator Vendor pada dashboard Vercel.
- Seluruh pengoperasian sistem dan basis data beralih 100% di bawah kendali mandiri Administrator Panitia Program Studi.
