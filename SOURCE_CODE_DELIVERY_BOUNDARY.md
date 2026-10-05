# BATASAN DISTRIBUSI KODE SUMBER (SOURCE CODE DELIVERY BOUNDARY)
## PDH Campus Order — Model Jual-Putus (Client-Owned Infrastructure)

Dokumen ini menegaskan secara formal batasan serah terima sistem dalam model komersial jual-putus, serta menjelaskan perbedaan mendasar antara **Deployment Produksi** dan **Transfer Kode Sumber**.

---

### 1. DEPLOYMENT PRODUKSI VS TRANSFER KODE SUMBER

- **Deployment Produksi (Yang Dilakukan)**:
  Proses pemasangan artefak build aplikasi terkompilasi agar berjalan secara fungsional di atas infrastruktur serverless milik Klien. Klien menerima sistem yang aktif dan siap dipakai.
- **Transfer Kode Sumber (Yang TIDAK Dilakukan)**:
  Pengalihan hak milik intelektual dan penyerahan file kode sumber mentah beserta repositori pengembangannya. Model jual-putus PDH Campus Order **BUKAN** merupakan transaksi transfer kode sumber.

---

### 2. RINCIAN BATASAN SERAH TERIMA

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│       YANG TIDAK DITERIMA KLIEN      │         YANG DITERIMA KLIEN          │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ ❌ File mentah source code (.ts)     │ ✅ URL Aplikasi Produksi Live        │
│ ❌ File mentah source code (.tsx)    │ ✅ Akun Admin Panitia Utama          │
│ ❌ Akses Private Git Repository      │ ✅ Dokumentasi Penggunaan Sistem     │
│ ❌ Riwayat Commit & Git History      │ ✅ Kepemilikan Database Sheets 100%  │
│ ❌ Repositori Deployment Vendor      │ ✅ Kepemilikan Storage Drive 100%    │
│ ❌ Konfigurasi Internal CI/CD Vendor │ ✅ Dokumentasi Konfigurasi Infra     │
│ ❌ Kredensial & Secret Tim Vendor    │ ✅ Laporan Berita Acara Instalasi    │
│ ❌ Environment Development Internal  │ ✅ Laporan Hasil Acceptance Test     │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

### 3. KEBIJAKAN INTEGRITAS KEKAYAAN INTELEKTUAL VENDOR
1. **Hak Cipta & Source Code Proprietary**: Seluruh arsitektur kode sumber, modul logika bisnis, dan desain komponen antarmuka tetap merupakan hak cipta eksklusif Vendor.
2. **Ketiadaan Akses Branch & Repository**: Klien tidak diberikan hak akses *read*, *write*, ataupun *clone* terhadap repositori internal Vendor.
3. **Kemandirian Penggunaan Klien**: Pembatasan penyerahan kode sumber mentah ini tidak mengurangi hak, fungsi, ataupun kebebasan Klien dalam mengoperasikan sistem di Program Studinya secara penuh dan permanen.
