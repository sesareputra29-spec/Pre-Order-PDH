# LEMBAR VERIFIKASI KEAMANAN KODE SUMBER (SOURCE CODE RELEASE CHECKLIST)
## PDH Campus Order — Pre-Deployment & Release Checklist

Checklist ini wajib diverifikasi oleh Engineer Vendor sebelum melakukan deployment pada akun infrastruktur Program Studi baru.

---

### TABEL CHECKLIST PERLINDUNGAN KODE SUMBER & KREDENSIAL

| No | Item Pemeriksaan Keamanan | Status | Catatan Verifikasi |
| :---: | :--- | :---: | :--- |
| 1 | **Repository Tetap Private** | `[x] PASS` | Repositori Git berstatus Private dan hanya dapat diakses oleh tim Vendor. |
| 2 | **Zero Secret di Repository** | `[x] PASS` | Repositori bersih dari file `.env`, service account key, atau token rahasia. |
| 3 | **Zero Client Credential di Source Code** | `[x] PASS` | Tidak ada hardcoded Google Private Key, Resend Key, atau Spreadsheet ID Klien di kode. |
| 4 | **Production Build Succeeded** | `[x] PASS` | `npm run build` sukses menghasilkan direktori `dist/` terkompilasi. |
| 5 | **Frontend Client Bebas Secret** | `[x] PASS` | Tidak ada variabel sensitif yang menggunakan prefix `VITE_` di browser bundle. |
| 6 | **Source Map Production Non-Aktif** | `[x] PASS` | `build.sourcemap: false` aktif; tidak ada file `.map` di `dist/assets/`. |
| 7 | **API Endpoint Tidak Membocorkan Source** | `[x] PASS` | Endpoint mengembalikan response JSON data murni tanpa melayani file mentah `.ts`/`.tsx`. |
| 8 | **Error Response Bebas Stack Trace** | `[x] PASS` | Respon error backend diformat aman melalui helper `sendApiError`. |
| 9 | **Berkas `.env` Tidak Masuk Release** | `[x] PASS` | File `.env` masuk dalam `.gitignore` dan diinjeksikan via Vercel Environment Variables. |
| 10 | **Google Private Key Terisolasi di Server** | `[x] PASS` | `GOOGLE_PRIVATE_KEY` hanya dibaca oleh `GoogleAuthService` di backend Node.js. |
| 11 | **Resend API Key Terisolasi di Server** | `[x] PASS` | `RESEND_API_KEY` hanya dibaca oleh `EmailService` di backend Node.js. |
| 12 | **JWT Secret Terisolasi di Server** | `[x] PASS` | `JWT_SECRET` hanya digunakan di backend untuk penandatanganan dan verifikasi token. |
| 13 | **Klien Tidak Diberi Akses Repository** | `[x] PASS` | Klien tidak diundang ke repositori GitHub / GitLab Vendor. |
| 14 | **Klien Tidak Diberi Source Code Mentah** | `[x] PASS` | Penyerahan murni berupa URL aplikasi aktif dan hak akses Back Office Panitia. |
| 15 | **Deployment Production Live Berhasil** | `[x] PASS` | Endpoint `/api/health` mengembalikan `200 OK` (Healthy) pada domain Klien. |
| 16 | **Final Security Acceptance PASS** | `[x] PASS` | Seluruh 15 kategori acceptance test dan initial admin setup terverifikasi aman. |

---

### KELAYAKAN DISTRIBUSI
- **Total Item**: 16 / 16 PASS
- **Status Akhir**: **RELEASE APPROVED FOR DEPLOYMENT** 🚀
