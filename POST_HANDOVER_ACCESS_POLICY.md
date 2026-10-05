# KEBIJAKAN AKSES PASCA SERAH TERIMA (POST-HANDOVER ACCESS POLICY)
## PDH Campus Order — Standard Operating Procedure

Dokumen ini mendefinisikan prosedur pelepasan hak akses dan perlindungan keamanan data setelah proses instalasi dan penerimaan sistem (*System Acceptance*) selesai dilaksanakan.

---

### 1. ALUR PENUTUPAN AKSES PASCA SERAH TERIMA

```
[1. PENYERAHAN URL LIVE] ──► [2. VERIFIKASI KLIEN] ──► [3. PENANDATANGANAN BERITA ACARA]
                                                                  │
                                                                  ▼
[6. REPO PRIVATE AMAN] ◄── [5. PENGHAPUSAN KREDENSIAL] ◄── [4. PENCABUTAN AKSES VENDOR]
```

---

### 2. PROTOKOL LANGKAH PASCA SERAH TERIMA

1. **Penyerahan URL Produksi**: Vendor menyerahkan URL aplikasi live yang telah terverifikasi kepada Ketua Panitia / Admin Utama Prodi.
2. **Verifikasi Fungsi oleh Klien**: Klien melakukan login Panitia, memeriksa status Back Office, dan memastikan seluruh modul berfungsi normal.
3. **Penandatanganan Berita Acara**: Klien dan Vendor menandatangani dokumen Berita Acara Penyelesaian Instalasi (`INSTALLATION_COMPLETION_REPORT_TEMPLATE.md`).
4. **Pencatatan Status Selesai**: Vendor mencatat status deployment sebagai `COMPLETED / HANDED OVER`.
5. **Pencabutan Akses Kolaborator (Access Revocation)**:
   - Klien menghapus akun Vendor dari daftar *Collaborators / Team Members* pada proyek Vercel Klien.
   - Hak akses teknis Vendor ke lingkungan live Klien berakhir secara resmi.
6. **Penghapusan Kredensial Klien di Sisi Vendor**:
   - Vendor dilarang menyimpan salinan Service Account JSON Key, Private Key, atau Resend API Key milik Klien pada komputer lokal maupun media penyimpanan vendor.
7. **Perlindungan Kode Sumber Vendor**:
   - Seluruh kode sumber, skrip build, dan repositori pengembang tetap berada 100% pada *Private Repository* internal Vendor.
