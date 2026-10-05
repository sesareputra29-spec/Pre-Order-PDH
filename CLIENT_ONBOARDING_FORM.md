# FORMULIR ONBOARDING KLIEN (CLIENT ONBOARDING FORM)
## PDH CAMPUS ORDER — DATA PENGADAAN & INSTALASI

---

### PETUNJUK PENGISIAN:
Formulir ini diisi oleh PIC Program Studi pembeli untuk keperluan konfigurasi sistem PDH Campus Order.  
*PENTING: Demi keamanan, Vendor TIDAK AKAN PERNAH meminta kata sandi (password) akun Vercel, Google, maupun Resend Anda.*

---

### 1. DATA IDENTITAS PROGRAM STUDI

| Parameter Identitas | Data Program Studi (Diisi Klien) |
| :--- | :--- |
| **Nama Perguruan Tinggi / Universitas** | `[Isi Nama Universitas]` |
| **Nama Fakultas / Departemen** | `[Isi Nama Fakultas]` |
| **Nama Program Studi** | `[Isi Nama Program Studi]` |
| **Kode Singkatan Prodi (4 Karakter)** | `[Isi Kode Prodi, Contoh: MJSP / TISP / AKSP]` |
| **Nama Penanggung Jawab (PIC)** | `[Isi Nama PIC]` |
| **Jabatan PIC** | `[Ketua Panitia / Kaprodi / Pembina Himpunan]` |
| **Alamat Email Resmi PIC** | `[Isi Email PIC]` |
| **Nomor WhatsApp PIC** | `[Isi Nomor WhatsApp Aktif]` |

---

### 2. DATA INFRASTRUKTUR CLOUD MILIK KLIEN

| Resource Infrastruktur | Nilai Konfigurasi (Diisi Klien) | Keterangan |
| :--- | :--- | :--- |
| **Akun Vercel Klien** | `[Isi Username / Email Vercel]` | Untuk undangan kolaborasi Mode A |
| **Google Cloud Project ID** | `[Isi Project ID GCP]` | Diambil dari GCP Console |
| **Service Account Client Email** | `[xxx@xxx.iam.gserviceaccount.com]` | Email akun layanan GCP |
| **Google Spreadsheet ID** | `[Isi Spreadsheet ID]` | Dari URL Google Sheets kosong |
| **Google Drive Root Folder ID** | `[Isi Folder ID]` | Dari URL Folder Google Drive |
| **Email Pengirim Resend (EMAIL_FROM)**| `PDH [Prodi] <no-reply@domain.ac.id>` | Sesuai domain resmi kampus |
| **Domain Kustom (Jika Ada)** | `https://[pdh.prodi-kampus.ac.id]` | Kosongkan jika menggunakan domain default Vercel |

---

### 3. DATA KREDENSIAL SENSITIF *(KIRIM VIA SALURAN AMAN / PRIVATE)*
*Catatan: Parameter di bawah ini dapat diisi langsung saat sesi remote terpandu (Mode B) atau dikirim via file terenkripsi.*
- **Service Account Private Key**: Disalin dari file JSON Key (`private_key`).
- **Resend API Key**: Disalin dari dashboard Resend (`re_...`).
- **JWT Secret**: String acak minimal 32 karakter (atau digenerate otomatis oleh Vendor saat deploy).

---

### 4. DATA ADMINISTRATOR PANITIA PERTAMA (INITIAL ADMIN)

| Parameter Admin | Data Administrator Utama (Diisi Klien) |
| :--- | :--- |
| **Nama Lengkap Panitia** | `[Isi Nama Lengkap Ketua Panitia]` |
| **Email Resmi Panitia** | `[Isi Email Panitia]` |
| **Kata Sandi Panitia** | *(Diisi mandiri oleh Klien di layar web saat proses setup)* |

---

Tanggal Pengisian: [TANGGAL]  
Nama Terang PIC: ________________________________  
Tanda Tangan PIC: ________________________________  
