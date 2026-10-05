# MODEL ALUR RELEASE & DEPLOYMENT (RELEASE DEPLOYMENT MODEL)
## PDH Campus Order — Master Release Distribution

Dokumen ini menjelaskan alur teknis proses rilis dari tahap pengembangan di lingkungan internal Vendor hingga aplikasi berjalan aktif di lingkungan produksi milik Klien.

---

### DIAGRAM ALUR RELEASE & DEPLOYMENT

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LINGKUNGAN VENDOR                             │
│                                                                         │
│  [1. DEVELOPMENT] ──► [2. PRIVATE REPO] ──► [3. VENDOR BUILD & TEST]    │
│  • Feature Code       • GitHub / GitLab      • npm run lint (PASS)      │
│  • Fixes & Refine     • Restricted Access    • npm run test:* (PASS)    │
│  • Architecture       • IP Protected         • Master Release Artifact  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        PROSES RELEASE / DEPLOY                          │
│                                                                         │
│                           [4. RELEASE PIPELINE]                         │
│                           • Mode A: Delegated Team Access               │
│                           • Mode B: Assisted Remote Session             │
│                           • Injeksi Env Vars Klien                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           LINGKUNGAN KLIEN                              │
│                                                                         │
│     [5. CLIENT VERCEL] ────────────────────────► [6. PRODUCTION LIVE]   │
│     • Akun Vercel Klien                          • URL: https://pdh...  │
│     • Google Sheets (DB Klien)                   • Initial Admin Setup  │
│     • Google Drive (Media Klien)                 • Mahasiswa & Panitia  │
│     • Resend API (Email Klien)                   • Kedaulatan Data 100% │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### PENJELASAN TAHAPAN & PEMBAGIAN PERAN

| Tahap | Nama Tahapan | Aktivitas Tim Vendor | Aset / Hak Milik Klien |
| :---: | :--- | :--- | :--- |
| **1** | **Development** | Mengembangkan arsitektur, fitur frontend, backend API, dan sistem keamanan multi-tenant. | Tidak terlibat (Lingkungan murni Vendor). |
| **2** | **Private Repository** | Mengelola branch kode, version control Git, dan memastikan repository berstatus *Private*. | Tidak terlibat (Klien tidak memiliki akses ke repo Git). |
| **3** | **Vendor Build & Test** | Menjalankan seluruh 12 test suite otomatis (`npm run test:*`), validasi linting (`tsc --noEmit`), dan kompilasi build produksi. | Memastikan paket yang akan dipasang berstatus *Master Release (Verified)*. |
| **4** | **Release Pipeline** | Menghubungkan paket rilis ke Proyek Vercel milik Klien dan membantu konfigurasi *Environment Variables*. | Klien menyediakan formulir data instalasi (`INSTALLATION_INPUT_TEMPLATE.md`). |
| **5** | **Client Vercel Deployment** | Menjalankan build serverless di atas akun Vercel Klien dan memverifikasi health check `/api/health`. | Klien memiliki project Vercel dan seluruh log runtime serverless. |
| **6** | **Production Live** | Mendampingi Klien melakukan *Initial Admin Setup* dan serah terima fungsional sistem. | Klien memiliki URL live, seluruh database Google Sheets, berkas Google Drive, dan akun admin Panitia. |

---

### KEAMANAN ARTEFAK PRODUKSI
1. **Pemisahan Logis**: Kode sumber tidak pernah dikirim dalam bentuk file zip atau repository publik kepada Klien.
2. **Kompilasi Sekali Jalan**: Vercel menjalankan `npm run build` yang hanya mengekspos hasil build terminifikasi (`dist/`) ke CDN publik.
3. **Stateless Backend**: Serverless function Node.js mengeksekusi request di runtime AWS Lambda / Vercel Edge terisolasi tanpa menyimpan state lokal.
