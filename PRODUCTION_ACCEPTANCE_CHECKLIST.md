# LEMBAR PENERIMAAN PRODUKSI (PRODUCTION ACCEPTANCE CHECKLIST)
## PDH CAMPUS ORDER — GO-LIVE CRITERIA

Checklist final ini wajib dipenuhi 100% sebelum sistem **PDH Campus Order** Program Studi dinyatakan resmi **LIVE** dan dapat digunakan oleh seluruh mahasiswa dan panitia.

---

### TABEL KRITERIA GO-LIVE PRODUKSI

| No | Kriteria Penerimaan | Metode Verifikasi | Status | Catatan Validasi |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **Build & Compilation** | `npm run build` sukses tanpa error pada pipeline Vercel | `[ ] PASS` | Asset statis `dist/` dan serverless entrypoint siap. |
| **2** | **Health API Status** | Request ke `GET /api/health` mengembalikan `200 OK` | `[ ] PASS` | Diagnostic health status `PASS`. |
| **3** | **Database Persistence** | Data transaksi tetap utuh pasca cold restart di Google Sheets | `[ ] PASS` | 12 Sheet terisi dan konsisten. |
| **4** | **Google Drive Storage** | Upload bukti bayar & foto produksi tersimpan di Drive Klien | `[ ] PASS` | File ID terpetakan, tanpa blob di database. |
| **5** | **Email Dispatcher** | Email aktivasi & reset password terkirim via Resend | `[ ] PASS` | Tautan aktivasi menggunakan domain produksi live. |
| **6** | **Initial Admin Lock** | Admin pertama aktif dan endpoint setup terkunci permanen | `[ ] PASS` | Penolakan `403 Forbidden` pada request setup kedua. |
| **7** | **Mahasiswa Isolation** | Mahasiswa A tidak dapat melihat/mengakses data Mahasiswa B | `[ ] PASS` | Data pribadi, order, dan notifikasi terisolasi. |
| **8** | **Back-Office Protection** | Akses endpoint administratif dibatasi khusus peran `PANITIA` | `[ ] PASS` | Penolakan otorisasi pada token mahasiswa. |
| **9** | **Tenant Data Isolation** | Data Prodi A terisolasi total dari data Prodi B | `[ ] PASS` | Spreadsheet ID & Drive Folder ID terikat per tenant. |
| **10** | **Order Flow Accuracy** | Pemesanan mandiri & kolektif menghitung nominal secara akurat | `[ ] PASS` | Validasi size chart, nama dada, dan rekapitulasi. |
| **11** | **Payment Approval** | Verifikasi pembayaran & Idempotency anti-double submission | `[ ] PASS` | Status pesanan otomatis berubah menjadi `LUNAS`. |
| **12** | **Production Tracking** | Pembaruan progres konveksi (0% - 100%) dan dokumentasi foto | `[ ] PASS` | Timeline pelacakan pesanan publik terupdate. |
| **13** | **Reports & SPK PDF** | Ekspor rekapitulasi dan generate PDF SPK Konveksi Server-Side | `[ ] PASS` | Berkas biner PDF valid dan terformat rapi. |
| **14** | **Logout & Session** | Token revocation dan penghapusan sesi login di browser | `[ ] PASS` | Audit event `LOGOUT` tercatat di log aktivitas. |
| **15** | **Audit Trail Logging** | Seluruh aksi krusial tercatat append-only pada sheet `AuditLogs` | `[ ] PASS` | Riwayat aktivitas terlacak dengan timestamp & actor. |
| **16** | **Zero Secret Leakage** | Tidak ada API Key, Private Key, atau hash password di client | `[ ] PASS` | Response API bersih dan tersanitasi (`[REDACTED]`). |

---

### KESIMPULAN GO-LIVE

- **Total Kriteria**: 16 Kriteria Wajib
- **Kondisi Kelulusan**: Wajib 16 / 16 `PASS`
- **Pernyataan Sistem**: Sistem dinyatakan **RESMI LIVE** dan siap melayani pemesanan PDH kampus.
