# CHECKLIST KEBUTUHAN KLIEN (CLIENT REQUIREMENTS CHECKLIST)
## Model: Client-Owned Infrastructure + Vendor Installation

Checklist ini merinci pembagian tugas dan kebutuhan infrastruktur antara **Klien (Pembeli)** dan **Vendor** untuk proses instalasi sistem **PDH Campus Order**.

---

### TABEL STATUS KEBUTUHAN INFRASTRUKTUR

| No | Komponen / Tugas | Penanggung Jawab | Status Kategori | Keterangan |
| :---: | :--- | :---: | :---: | :--- |
| **1** | **AKUN & PROJECT VERCEL** | | | |
| 1.1 | Pendaftaran Akun Vercel Klien | Klien | `REQUIRED` | Menggunakan email resmi kampus/himpunan. |
| 1.2 | Pembuatan Project Baru di Vercel | Klien / Vendor | `VENDOR HANDLED` | Vendor membantu konfigurasi framework & preset. |
| 1.3 | Custom Domain Institusi (CNAME/A Record) | Klien | `OPTIONAL` | Jika ingin menggunakan domain sendiri (misal `pdh.prodi.ac.id`). |
| 1.4 | Penyerahan Password Akun Vercel | - | `NOT REQUIRED FROM CLIENT` | **DILARANG**: Password akun Vercel tidak boleh diberikan ke vendor. |
| **2** | **GOOGLE CLOUD & SERVICE ACCOUNT** | | | |
| 2.1 | Akun Google Cloud Platform (GCP) | Klien | `REQUIRED` | Dapat menggunakan akun Gmail/Google Workspace kampus. |
| 2.2 | Pembuatan GCP Project | Klien | `REQUIRED` | Project baru khusus sistem PDH prodi. |
| 2.3 | Aktivasi Google Sheets API v4 | Klien / Vendor | `REQUIRED` | Diaktifkan di GCP Console API Library. |
| 2.4 | Aktivasi Google Drive API v3 | Klien / Vendor | `REQUIRED` | Diaktifkan di GCP Console API Library. |
| 2.5 | Pembuatan Service Account & Unduh JSON Key | Klien | `REQUIRED` | Unduh file JSON Key dan ekstrak `client_email` & `private_key`. |
| **3** | **GOOGLE SHEETS (DATABASE)** | | | |
| 3.1 | Pembuatan 1 File Google Spreadsheet Kosong | Klien | `REQUIRED` | Dibuat di Google Drive akun Klien. |
| 3.2 | Memberikan Izin Editor ke Service Account | Klien | `REQUIRED` | Bagikan spreadsheet ke email Service Account sebagai **Editor**. |
| 3.3 | Pembuatan 12 Lembar Kerja / Sheet Database | Sistem | `NOT REQUIRED FROM CLIENT` | **Otomatis dibuat oleh backend** saat booting pertama. |
| **4** | **GOOGLE DRIVE (STORAGE BERKAS)** | | | |
| 4.1 | Pembuatan 1 Root Folder di Google Drive | Klien | `REQUIRED` | Folder penampung berkas utama. |
| 4.2 | Memberikan Izin Editor ke Service Account | Klien | `REQUIRED` | Bagikan folder utama ke email Service Account sebagai **Editor**. |
| 4.3 | Pembuatan Struktur Subfolder Produk & Pesanan | Sistem | `NOT REQUIRED FROM CLIENT` | **Otomatis dibuat oleh backend** secara dinamis. |
| **5** | **RESEND EMAIL SERVICE** | | | |
| 5.1 | Pendaftaran Akun di Resend.com | Klien | `REQUIRED` | Untuk pengiriman email verifikasi pendaftaran & reset password. |
| 5.2 | Generate API Key Resend | Klien | `REQUIRED` | Dibuat pada dashboard Resend. |
| 5.3 | Verifikasi Domain Kampus di Resend | Klien | `OPTIONAL` | Direkomendasikan untuk pengiriman email tanpa batas sandbox. |
| **6** | **DATA IDENTITAS PRODI (TENANT)** | | | |
| 6.1 | Nama Universitas, Fakultas, Prodi & Kode Prodi | Klien | `REQUIRED` | Diisi pada template form instalasi. |
| 6.2 | Konfigurasi Multi-Tenant (Prodi Kedua) | Klien | `OPTIONAL` | Hanya jika satu aplikasi digunakan bersama oleh 2 prodi. |
| **7** | **PROSES DEPLOYMENT & VERIFIKASI** | | | |
| 7.1 | Pemasangan Master Release Source Code | Vendor | `VENDOR HANDLED` | Vendor menyediakan paket Master Release v1.0.0. |
| 7.2 | Konfigurasi Environment Variables di Vercel | Vendor / Klien | `VENDOR HANDLED` | Dipandu pengisiannya sesuai data template instalasi. |
| 7.3 | Eksekusi Build & Deployment Serverless | Vendor / Klien | `VENDOR HANDLED` | Melalui integrasi Git atau Vercel CLI. |
| 7.4 | Verifikasi Health Check Endpoint (`/api/health`)| Vendor | `VENDOR HANDLED` | Memastikan status `200 OK` dan sistem sehat. |
| **8** | **INITIAL ADMIN SETUP & SERAH TERIMA** | | | |
| 8.1 | Pengisian Form Administrator Pertama | Klien | `REQUIRED` | Dilakukan langsung oleh Ketua Panitia/Admin Prodi di web app. |
| 8.2 | Verifikasi Setup Lock & Serah Terima Penuh | Klien & Vendor | `VENDOR HANDLED` | Memastikan hak akses Back Office aktif dan terkunci aman. |

---

### RINGKASAN PEMBAGIAN TUGAS

- **Tugas Utama Klien**:
  1. Menyiapkan akun Vercel, GCP, Google Sheets, Google Drive, dan Resend.
  2. Membagikan hak akses Editor Spreadsheet & Folder Drive ke Service Account.
  3. Mengisi formulir data instalasi (`INSTALLATION_INPUT_TEMPLATE.md`).
  4. Mendaftarkan akun Initial Admin Panitia pertama kali setelah web app online.

- **Tugas Utama Vendor**:
  1. Menyiapkan paket Master Release v1.0.0.
  2. Mengonfigurasikan environment variables dan parameter build di Vercel.
  3. Menjalankan deployment dan memastikan koneksi API / Database terhubung (*Health Check PASS*).
  4. Mendampingi sesi pengujian alur bisnis dan serah terima operasional.
