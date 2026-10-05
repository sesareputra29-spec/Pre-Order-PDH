# FORMULIR DATA INSTALASI SISTEM (INSTALLATION INPUT TEMPLATE)
## PDH Campus Order — Master Release v1.0.0

---

### PETUNJUK PENGISIAN UNTUK KLIEN:
1. Formulir ini digunakan oleh Tim Vendor untuk mengonfigurasikan sistem **PDH Campus Order** pada infrastruktur milik Program Studi / Himpunan Mahasiswa Anda.
2. Kolom bertanda **[SENSITIF]** merupakan kredensial rahasia. Jangan membagikannya melalui grup publik. Kirimkan formulir ini melalui saluran privat yang disepakati (atau input mandiri saat sesi instalasi remote terpandu).
3. **PENTING**: Vendor **TIDAK AKAN PERNAH** meminta kata sandi (password) akun Vercel, akun Google, ataupun akun Resend Anda.

---

### BAGIAN 1: IDENTITAS PROGRAM STUDI (TENANT UTAMA)

| Parameter | Nilai / Jawaban Klien | Contoh Pengisian |
| :--- | :--- | :--- |
| **Nama Perguruan Tinggi** | `[Isi Nama Kampus]` | Universitas Indonesia / Politeknik Negeri |
| **Nama Fakultas** | `[Isi Nama Fakultas]` | Fakultas Ekonomi dan Bisnis |
| **Nama Program Studi** | `[Isi Nama Prodi]` | Manajemen / Teknik Informatika |
| **Kode Singkatan Prodi** | `[Isi Kode Singkatan]` | MJSP / TISP / AKSP |
| **Domain / URL Aplikasi** | `[Isi Domain Aplikasi]` | https://pdh.prodi-kampus.ac.id |

---

### BAGIAN 2: GOOGLE CLOUD & SERVICE ACCOUNT

*Pastikan Service Account telah dibuat dan Google Sheets API serta Google Drive API telah diaktifkan di GCP Console.*

| Parameter | Nilai / Jawaban Klien | Keterangan |
| :--- | :--- | :--- |
| **Google Project ID** | `[Isi Project ID]` | Contoh: `pdh-campus-order-2026` |
| **Service Account Email** | `[Isi Email Service Account]` | Contoh: `pdh-service@project-id.iam.gserviceaccount.com` |
| **Private Key [SENSITIF]** | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----` | Disalin dari file JSON Key (`private_key`) |

---

### BAGIAN 3: GOOGLE SHEETS & GOOGLE DRIVE

*Pastikan Spreadsheet dan Folder Drive telah dibagikan ke Service Account Email di atas dengan peran **Editor**.*

| Parameter | Nilai / Jawaban Klien | Keterangan |
| :--- | :--- | :--- |
| **Google Spreadsheet ID** | `[Isi Spreadsheet ID]` | Diambil dari URL: `https://docs.google.com/spreadsheets/d/.../edit` |
| **Google Drive Root Folder ID** | `[Isi Folder ID]` | Diambil dari URL: `https://drive.google.com/drive/folders/...` |

---

### BAGIAN 4: RESEND EMAIL DISPATCHER

*Digunakan untuk pengiriman link verifikasi email dan reset password mahasiswa.*

| Parameter | Nilai / Jawaban Klien | Keterangan |
| :--- | :--- | :--- |
| **Resend API Key [SENSITIF]** | `re_1234567890_abcdef...` | Diambil dari menu **API Keys** di Resend.com |
| **Email Pengirim (EMAIL_FROM)** | `PDH Campus <no-reply@prodi-kampus.ac.id>` | Alamat email sender resmi |

---

### BAGIAN 5: KEAMANAN & PENANDATANGANAN TOKEN

| Parameter | Nilai / Jawaban Klien | Keterangan |
| :--- | :--- | :--- |
| **JWT Secret Key [SENSITIF]** | `[Isi minimal 32 karakter acak atau serahkan ke Vendor]` | Kunci penandatanganan sesi login (Contoh: string acak 32 karakter) |

---

### BAGIAN 6: ADMINISTRATOR UTAMA PRODI (INITIAL ADMIN)

*Data akun Panitia pertama yang akan memegang akses Back Office.*

| Parameter | Nilai / Jawaban Klien | Keterangan |
| :--- | :--- | :--- |
| **Nama Lengkap Panitia** | `[Isi Nama Lengkap]` | Contoh: `Ketua Panitia Pengadaan PDH` |
| **Email Resmi Panitia** | `[Isi Email Panitia]` | Contoh: `admin.pdh@prodi-kampus.ac.id` |
| **Password Awal Panitia** | *(Diisi mandiri oleh Klien di layar web saat setup)* | **TIDAK PERLU** ditulis di formulir ini demi keamanan |

---

### PERNYATAAN KLIEN:
Dengan mengisi formulir ini, Klien menyatakan bahwa seluruh resource infrastruktur di atas telah disiapkan, dimiliki secara sah oleh Klien, dan hak akses Editor untuk Service Account telah diaktifkan dengan benar.

**Nama Penanggung Jawab Klien**: _______________________  
**Jabatan / Peran**: _______________________  
**Tanggal**: _______________________  
