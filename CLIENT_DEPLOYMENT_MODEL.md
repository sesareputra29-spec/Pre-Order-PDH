# MODEL DEPLOYMENT KLIEN (CLIENT DEPLOYMENT MODEL)
## PDH Campus Order — Standar Instalasi & Akses Komersial

Dokumen ini mendefinisikan dua mode instalasi resmi yang digunakan oleh Vendor dalam memasang sistem **PDH Campus Order** pada infrastruktur milik Klien.

---

### MODE A — CLIENT COLLABORATOR ACCESS (METODE STANDAR / DIREKOMENDASIKAN)

Mode A adalah metode deployment utama yang paling aman, cepat, dan efisien bagi Klien yang memiliki staf IT atau familiar dengan pengelolaan dashboard cloud.

- **Mekanisme Kerja**:
  1. Klien membuat akun Vercel dan menyiapkan project baru.
  2. Klien mengundang akun Vendor sebagai *Collaborator / Team Member* pada project Vercel bersangkutan.
  3. Vendor mengonfigurasikan parameter build, framework preset, dan *Environment Variables* sesuai data formulir instalasi Klien.
  4. Vendor mengeksekusi deployment awal dan memverifikasi *Health Check* `/api/health`.
  5. Setelah pengujian selesai dan Berita Acara Serah Terima ditandatangani, Klien mencabut peran kolaborator Vendor (*Access Revocation*).
- **Protokol Keamanan Mutlak**:
  - **DILARANG KERAS**: Vendor **TIDAK AKAN PERNAH** meminta kata sandi (*password*) akun personal Vercel atau Google milik Klien.
  - Seluruh kredensial produksi langsung diinput ke dalam Vercel Environment Variables terenkripsi.

---

### MODE B — ASSISTED INSTALLATION (SESI REMOTE TERPANDU)

Mode B digunakan jika Klien tidak memiliki staf teknis, tidak ingin memberikan akses kolaborator, atau memiliki kebijakan internal yang melarang penambahan pihak luar ke akun Vercel.

- **Mekanisme Kerja**:
  1. Klien tetap menjadi pemilik sah seluruh akun Vercel, Google Cloud, Sheets, Drive, dan Resend.
  2. Vendor memandu proses deployment melalui sesi panggilan remote interaktif (Google Meet / Zoom / Microsoft Teams / AnyDesk).
  3. Klien memasukkan sendiri nilai environment variables dan private key di layar komputernya sendiri di bawah arahan langsung dari Engineer Vendor.
  4. Vendor memandu eksekusi build dan memverifikasi kesehatan sistem bersama Klien.
- **Protokol Keamanan**:
  - Vendor tidak mencatat, menyalin, atau menyimpan kredensial Klien di luar sesi remote.
  - Sesi diakhiri segera setelah verifikasi fungsional dan serah terima tuntas.

---

### MATRIKS PERBANDINGAN MODE INSTALASI

| Parameter Evaluasi | Mode A (Collaborator Access) | Mode B (Assisted Remote) |
| :--- | :---: | :---: |
| **Rekomendasi Vendor** | `STANDAR (Direkomendasikan)` | `ALTERNATIF (Didukung)` |
| **Kebutuhan Waktu** | Cepat (15 - 30 Menit) | Terjadwal (45 - 60 Menit) |
| **Keterlibatan Klien** | Mengisi Form & Invite Kolaborator | Interaktif di Depan Layar |
| **Penyerahan Password** | **TIDAK (DILARANG)** | **TIDAK PERNAH** |
| **Pencabutan Akses** | Hapus Kolaborator Pasca Selesai | Otomatis Saat Sesi Berakhir |
