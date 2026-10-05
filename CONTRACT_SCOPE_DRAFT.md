# DRAFT KLAUSUL LINGKUP KONTRAK PENGADAAN PERANGKAT LUNAK (CONTRACT SCOPE DRAFT)
## SISTEM PDH CAMPUS ORDER — MODEL JUAL-PUTUS

---
**PERINGATAN PENTING:**  
`DRAFT — PERLU REVIEW HUKUM SEBELUM DIGUNAKAN SEBAGAI KONTRAK FINAL.`  
*Dokumen ini merupakan kerangka kerja teknis batasan kontrak dan bukan merupakan nasihat hukum formal.*
---

### PASAL 1: OBJEK PERJANJIAN & HAK PENGGUNAAN (RIGHT-TO-USE)
1. Pihak Pertama (Vendor) sepakat untuk menyediakan dan menginstalasikan perangkat lunak **PDH Campus Order Master Release v1.0.0** kepada Pihak Kedua (Klien).
2. Pihak Kedua memperoleh hak penggunaan sistem (*Perpetual Right-to-Use*) yang bersifat non-eksklusif khusus untuk kebutuhan operasional Program Studi yang ditunjuk.
3. Hak penggunaan ini tidak dapat dialihkan, disewakan kembali, atau dijual kepada pihak ketiga.

---

### PASAL 2: KEPEMILIKAN INFRASTRUKTUR & DATA
1. Seluruh infrastruktur cloud tempat sistem beroperasi (Vercel, Google Cloud, Google Sheets, Google Drive, dan Resend) adalah milik dan dikontrol 100% oleh Pihak Kedua.
2. Seluruh data identitas mahasiswa, transaksi pesanan, catatan pembayaran, dan berkas bukti transfer adalah hak milik mutlak Pihak Kedua (*Client-Owned Data*).
3. Pihak Pertama tidak memiliki hak kepemilikan atas data Pihak Kedua dan dilarang memanfaatkannya di luar kebutuhan teknis instalasi.

---

### PASAL 3: KEPEMILIKAN KODE SUMBER & HAK CIPTA VENDOR
1. Seluruh kode sumber (*source code* mentah `.ts`/`.tsx`), repositori Git privat, arsitektur logika, dan hak kekayaan intelektual (*Intellectual Property*) perangkat lunak tetap menjadi hak milik eksklusif Pihak Pertama.
2. Perjanjian jual-putus ini **BUKAN** merupakan pengalihan hak cipta atau transfer kode sumber.
3. Pihak Kedua dilarang merekayasa balik (*reverse engineering*), mendekompilasi, atau mengekstrak kode sumber aplikasi.

---

### PASAL 4: LINGKUP PEKERJAAN INSTALASI & ACCEPTANCE
1. Pihak Pertama bertanggung jawab melakukan konfigurasi *environment*, build produksi, dan deployment ke akun Vercel Pihak Kedua.
2. Pihak Kedua bersama Pihak Pertama melakukan pengujian fungsional (*User Acceptance Testing*) berdasarkan kriteria kelayakan sistem.
3. Hasil pengujian dituangkan dalam Berita Acara Penyelesaian Instalasi yang ditandatangani kedua belah pihak.

---

### PASAL 5: GARANSI & PEMELIHARAAN
1. Pihak Pertama memberikan garansi perbaikan cacat sistem (*Bug Fixes*) selama **[PERIODE GARANSI]** terhitung sejak penandatanganan Berita Acara.
2. Permintaan penambahan modul/fitur baru di luar spesifikasi Master Release v1.0.0 diatur melalui kesepakatan pengembangan kustom (*Custom Development*) terpisah.

---

### PASAL 6: KERAHASIAAN INFORMASI (CONFIDENTIALITY)
Kedua belah pihak sepakat menjaga kerahasiaan seluruh data kredensial, token akses, data pribadi mahasiswa, dan informasi komersial yang dipertukarkan selama masa pelaksanaan perjanjian.

---

### PASAL 7: PENGAKHIRAN KERJA SAMA (TERMINATION)
Pencabutan akses kolaborator teknis Pihak Pertama pasca-serah terima tidak membatalkan hak penggunaan sistem yang telah diperoleh Pihak Kedua secara sah.
