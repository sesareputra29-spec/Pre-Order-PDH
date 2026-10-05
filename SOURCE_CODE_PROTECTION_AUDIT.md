# LAPORAN AUDIT PERLINDUNGAN KODE SUMBER & HAK KEKAYAAN INTELEKTUAL (SOURCE CODE PROTECTION AUDIT)
## Sistem PDH Campus Order — Master Release v1.0.0

---

### 1. EXECUTIVE SUMMARY

Audit ini dilakukan secara mendalam untuk memvalidasi bahwa model distribusi **Client-Owned Infrastructure + Vendor Installation + Private Source Code** dapat dioperasikan secara aman. Audit berfokus pada potensi kebocoran kode sumber (.ts, .tsx, arsitektur internal), keterpaparan berkas source maps, kebocoran kredensial sensitif di browser client, serta isolasi repositori private milik Vendor saat aplikasi di-deploy pada akun Vercel milik Klien.

**Hasil Audit Utama**:
- **Source Code Exposure**: `PASS` (Browser client hanya menerima asset terkompilasi & terminifikasi di `dist/assets/`, kode backend `.ts` diproses murni di serverless runtime).
- **Secret Exposure**: `PASS` (Kredensial seperti `GOOGLE_PRIVATE_KEY`, `RESEND_API_KEY`, dan `JWT_SECRET` terisolasi 100% di server-side dan tidak menggunakan prefix `VITE_`).
- **Source Map Exposure**: `PASS` (Vite production build secara default menonaktifkan source map `build.sourcemap: false`, sehingga kode asli tidak dapat direkonstruksi melalui browser DevTools).
- **Vercel Deployment Model**: `PASS` (Deployment dapat dilakukan melalui mekanisme delegasi akses kolaborasi atau CLI tanpa memberikan akses repositori Git kepada Klien).
- **Status Kelayakan Akhir**: **`PASS`** (Model aman untuk dilanjutkan ke tahap operasional J3-D).

---

### 2. SOURCE CODE EXPOSURE AUDIT

| Objek Pemeriksaan | Jalur Distribusi | Hasil Audit | Bukti & Analisis Teknis |
| :--- | :---: | :---: | :--- |
| **Frontend Components (`.tsx`)** | Browser Client | `PASS` | Seluruh komponen React di `/src/components` dikompilasi, di-tree-shake, dan diminifikasi menjadi bundle JavaScript produksi (`dist/assets/index-*.js`). File mentah `.tsx` tidak disajikan ke publik. |
| **Backend Services (`/src/server/*.ts`)** | Serverless Runtime | `PASS` | Service layer Express/Node.js dieksekusi secara terisolasi di balik Vercel Serverless Function (`api/index.ts`). File `.ts` server tidak dapat diunduh langsung melalui web browser. |
| **Test Suites (`src/server/test*.ts`)** | Internal Repo | `PASS` | Script pengujian otomatis hanya dijalankan saat tahap CI/test lokal dan tidak diikutsertakan dalam endpoint publik. |
| **Development Config (`vite.config.ts`, `tsconfig.json`)** | Build Pipeline | `PASS` | File konfigurasi build hanya digunakan saat proses kompilasi dan tidak dipublikasikan ke static web root. |

---

### 3. BROWSER EXPOSURE AUDIT

- **Pemeriksaan DevTools**: Pada tab *Sources* atau *Network* browser, hanya terdapat:
  - `index.html`
  - `assets/index-[hash].js` (Minified JS)
  - `assets/index-[hash].css` (Compiled Tailwind CSS)
  - Static favicon & icons.
- **Pemeriksaan Directory Traversal**: Konfigurasi `vercel.json` menerapkan rewrite `/(.*)` secara eksklusif ke `dist/index.html` dan `/api/(.*)` ke serverless function, sehingga upaya mengakses file internal (misal: `/src/server/config/env.ts` atau `/package.json`) otomatis dialihkan ke Single Page Application tanpa mengekspos isi berkas.

---

### 4. SERVER EXPOSURE & ERROR HANDLING AUDIT

- **Error Stack Trace Masking**: Seluruh router API (`authRoutes.ts`, `orderRoutes.ts`, `paymentRoutes.ts`, dll.) menggunakan helper standar `sendApiError(res, statusCode, errorCode, message)` yang mengembalikan pesan terstruktur berbahasa Indonesia tanpa membocorkan internal file path atau server stack trace.
- **Health Check Sanitization**: Endpoint `/api/health` hanya mengembalikan status operational boolean (`database: "CONNECTED"`, `drive_storage: "CONNECTED"`, `email_service: "CONNECTED"`) tanpa mencantumkan path direktori server atau private key.

---

### 5. SECRET EXPOSURE AUDIT

| Variabel Rahasia | Lingkungan Eksekusi | Terpapar ke Client? | Catatan Audit |
| :--- | :---: | :---: | :--- |
| `JWT_SECRET` | Server Node.js | `TIDAK (PASS)` | Digunakan untuk signing & verification token JWT. Tidak pernah dikirimkan ke client. |
| `GOOGLE_PRIVATE_KEY` | Server Node.js | `TIDAK (PASS)` | Digunakan murni oleh GoogleAuthService. Tidak ada prefix `VITE_`. |
| `GOOGLE_CLIENT_EMAIL`| Server Node.js | `TIDAK (PASS)` | Digunakan untuk Google API client token exchange. |
| `RESEND_API_KEY` | Server Node.js | `TIDAK (PASS)` | Pengiriman email dijalankan 100% di backend Express. |
| `TENANT_*_SPREADSHEET_ID` | Server Node.js | `TIDAK (PASS)` | Database query diproses di backend; client hanya menerima data JSON tersaring. |

---

### 6. SOURCE MAP AUDIT

- **Konfigurasi Vite**: `vite.config.ts` tidak mengaktifkan `build.sourcemap: true`.
- **Hasil Build Bundle**: Pada folder `dist/assets/`, tidak ditemukan file `.js.map` atau `.css.map`.
- **Mitigasi**: Browser DevTools tidak dapat merekonstruksi struktur folder asli, nama variabel lokal, maupun komentar kode internal pengembang.

---

### 7. REPOSITORY ACCESS AUDIT

- **Hak Akses Repositori Git**: Repositori GitHub/GitLab tetap berstatus **PRIVATE** dan berada 100% di bawah kendali Vendor.
- **Klien**: Tidak diberikan akses *Read/Write* ke repositori Git Vendor.
- **Pencegahan Ketergantungan**: Klien tidak memerlukan akses repositori untuk menjalankan aplikasi; aplikasi di-deploy langsung ke Vercel Project milik Klien oleh Vendor.

---

### 8. VERCEL DEPLOYMENT & BUILD ARTIFACT AUDIT

- **Mekanisme Deployment**:
  - **Mode A (Standar)**: Vendor diundang sebagai kolaborator proyek Vercel milik Klien untuk melakukan build dan menghubungkan pipeline release.
  - **Mode B (Assisted)**: Vendor memandu deployment via sesi remote interaktif.
- **Kemandirian Build**: Build serverless Vercel mengeksekusi `npm run build` yang memproduksi artefak statis `dist/` dan serverless entrypoint `api/index.ts` secara otomatis.

---

### 9. RISIKO YANG DITEMUKAN & SEVERITY ASSESSMENT

| ID Risiko | Deskripsi Potensi Risiko | Severity | Status Mitigasi |
| :---: | :--- | :---: | :---: |
| **R-01** | Potensi Klien meminta source code repository saat serah terima. | `LOW` | **MITIGATED**: Batasan produk telah diatur secara eksplisit dalam dokumen `CLIENT_SOURCE_CODE_BOUNDARY.md` dan perjanjian komersial jual-putus. |
| **R-02** | Potensi pengembang memasukkan variabel sensitif dengan prefix `VITE_`. | `HIGH` | **MITIGATED**: Audit membuktikan tidak ada secret dengan prefix `VITE_`. Seluruh secret diproses di backend Express. |
| **R-03** | Potensi regenerasi kode dari source maps jika diaktifkan. | `MEDIUM` | **MITIGATED**: Default `build.sourcemap` adalah `false`. Build terverifikasi bersih dari file `.map`. |

---

### 10. REKOMENDASI UNTUK OPERASIONAL VENDOR
1. Pertahankan repositori Git selalu dalam status *Private Repository*.
2. Jangan pernah menyertakan file `.env` yang memuat kredensial nyata ke dalam version control (*.gitignore enforced*).
3. Pastikan penandatanganan Berita Acara Penyelesaian Instalasi (`INSTALLATION_COMPLETION_REPORT_TEMPLATE.md`) dilakukan setelah pengujian selesai.

---

### 11. STATUS AKHIR AUDIT

# **STATUS: PASS (PROTECTED & READY)** 🚀
Model operasional terbukti aman, kode sumber Vendor terproteksi secara teknis, dan aplikasi siap dioperasikan pada infrastruktur Klien.
