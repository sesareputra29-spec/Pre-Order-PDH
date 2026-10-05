# LIFECYCLE PROVISIONING & ISOLASI INSTANCE KLIEN (CLIENT INSTANCE PROVISIONING)
## PDH Campus Order — Standar Distribusi Komersial

Dokumen ini mendefinisikan seluruh tahapan siklus hidup (*lifecycle*) deployment sistem dari pesanan awal hingga masa garansi, serta standar isolasi data antar-klien (*Client Instance Isolation*).

---

### 1. LIFECYCLE PIPELINE PROVISIONING KOMERSIAL

```
[1. CLIENT ORDER] ──► [2. CLIENT PROVISIONING] ──► [3. INFRA VALIDATION] ──► [4. VENDOR DEPLOY]
                                                                                   │
                                                                                   ▼
[8. WARRANTY/SLA] ◄── [7. ACCESS REVOKE] ◄── [6. HANDOVER/SIGN-OFF] ◄── [5. INITIALIZATION & TEST]
```

#### DETAIL TAHAPAN SIKLUS HIDUP:

| Tahap | PIC | Input Dokumen/Data | Aktivitas Utama | Output Tahapan | Status Checkpoint |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1. Client Order** | Sales & Klien | Surat Pesanan / MoU Kontrak | Finalisasi kesepakatan pengadaan sistem PDH Campus Order model jual-putus. | Kontrak Kerja Sama & Invoice | `CP-01: ORDER CONFIRMED` |
| **2. Client Provisioning** | Klien | `CLIENT_REQUIREMENTS_CHECKLIST.md` | Klien menyiapkan akun Vercel, GCP, Spreadsheet, Drive Folder, dan Resend. | Resource Cloud Klien Aktif | `CP-02: INFRA READY` |
| **3. Infra Validation** | Vendor | `INSTALLATION_INPUT_TEMPLATE.md` | Vendor memeriksa kelengkapan data, Service Account permission, dan API status. | Validasi Data Siap Deploy | `CP-03: DATA VALIDATED` |
| **4. Vendor Deployment** | Vendor | Master Release v1.0.0 Bundle | Menghubungkan project Vercel, inject environment variables, dan trigger build. | Deployment URL Terbit | `CP-04: DEPLOY LIVE` |
| **5. Initialization & Test** | Vendor & Klien | URL Produksi Live | Cold-start Google Sheets (12 tabel), initial admin setup, dan smoke test fungsional. | Acceptance Suite 100% PASS | `CP-05: TEST PASSED` |
| **6. Handover & Sign-Off** | Vendor & Klien | `INSTALLATION_COMPLETION_REPORT` | Penyerahan URL live, panduan operasional, dan penandatanganan Berita Acara. | Berita Acara Bertandatangan | `CP-06: HANDOVER COMPLETE` |
| **7. Access Revocation** | Klien | Vercel Dashboard Settings | Klien mencabut role kolaborator Vendor pada project Vercel. | Akses Vendor Tertutup | `CP-07: ACCESS REVOKED` |
| **8. Warranty / SLA** | Support Vendor | Dokumen Kontrak / Garansi | Masa pemeliharaan dan perbaikan bug existing sesuai paket kesepakatan. | Laporan Dukungan Teknis | `CP-08: WARRANTY ACTIVE` |

---

### 2. STANDAR ISOLASI DATA ANTAR-KLIEN (CLIENT INSTANCE ISOLATION)

Setiap Program Studi pembeli dialokasikan instance yang berdiri sendiri (*self-contained & isolated*) dengan parameter identifikasi tunggal:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      PROFIL ISOLASI INSTANCE KLIEN                      │
├─────────────────────────┬───────────────────────────────────────────────┤
│ CLIENT_ID               │ ID unik Klien (Contoh: CLI-2026-UNIV-01)      │
│ TENANT_ID               │ ID Tenant aplikasi (Default: TENANT-001)      │
│ VERCEL PROJECT          │ Proyek Vercel mandiri milik akun Klien        │
│ GCP PROJECT             │ Project Google Cloud mandiri milik Klien      │
│ GOOGLE SPREADSHEET      │ 1 File Spreadsheet database khusus Klien      │
│ GOOGLE DRIVE ROOT       │ 1 Folder Google Drive storage khusus Klien    │
│ RESEND CONFIGURATION    │ API Key & Domain pengirim resmi Klien         │
│ DOMAIN URL              │ Domain kustom Klien (misal: pdh.prodi.ac.id)  │
└─────────────────────────┴───────────────────────────────────────────────┘
```

#### PRINSIP ISOLASI KETAT (ZERO CROSS-CLIENT CONTAMINATION):
1. **Pemisahan Database Total**: Tidak ada tabel atau baris data Klien A yang disimpan di Google Spreadsheet milik Klien B.
2. **Pemisahan Media Storage Total**: Bukti transfer atau desain Klien A tidak dapat diakses atau diunggah ke Google Drive Klien B.
3. **Pemisahan Kredensial Total**: Service account, Private Key, dan Resend API Key terisolasi pada environment project Vercel masing-masing Klien.
4. **Anti-Tenant Mismatch**: Sistem menolak akses jika token JWT Klien A digunakan pada endpoint deployment Klien B (`403 TENANT_MISMATCH`).
