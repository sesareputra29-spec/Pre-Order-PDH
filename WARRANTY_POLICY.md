# KEBIJAKAN GARANSI SISTEM (WARRANTY POLICY)
## PDH CAMPUS ORDER — MASTER RELEASE v1.0.0

Kebijakan ini mengatur hak klaim garansi teknis paska-serah terima sistem bagi Program Studi pembeli.

---

### 1. KLASIFIKASI KENDALA TEKNIS

| Kategori Kendala | Definisi Operasional | Cakupan Garansi | Status Biaya |
| :--- | :--- | :---: | :---: |
| **A. Cacat Sistem (Bug)** | Fungsi standar Master Release v1.0.0 tidak bekerja sesuai spesifikasi (misal: gagal kalkulasi total, error generate PDF SPK). | `TERMASUK (COVERED)` | **Gratis (Rp 0)** |
| **B. Permintaan Fitur (Feature Request)** | Penambahan tombol, formulir baru, atau perubahan alur bisnis yang tidak ada di Master Release v1.0.0. | `TIDAK TERMASUK` | **Custom Development (Berbayar)** |
| **C. Kendala Infrastruktur Klien** | Penghapusan file spreadsheet secara tidak sengaja oleh Klien, penonaktifan Service Account di GCP Klien. | `TIDAK TERMASUK` | **Bantuan Terjadwal / Maintenance** |
| **D. Gangguan Pihak Ketiga (Third-Party Issue)**| Downtime server global Google Cloud, gangguan jaringan Vercel, atau pemblokiran domain oleh ISP kampus. | `TIDAK TERMASUK` | **Di Luar Kendali Vendor** |

---

### 2. KETENTUAN MASA GARANSI
- **Durasi Garansi**: **[PERIODE GARANSI]** terhitung sejak tanggal Berita Acara Serah Terima ditandatangani.
- **Target Waktu Respon (*SLA Response Time*)**:
  - Kendala Kritis (Sistem tidak bisa diakses / down total): Maksimal **[SLA TANGGAP KRITIS]** jam kerja.
  - Kendala Minor (Gangguan tampilan / kendala non-pemblokir transaksi): Maksimal **[SLA TANGGAP MINOR]** jam kerja.

---

### 3. PROSEDUR PENGAJUAN KLAIM GARANSI
1. PIC Klien mengirimkan laporan kendala melalui saluran dukungan teknis resmi Vendor dengan menyertakan screenshot error dan langkah terjadinya kendala (*steps to reproduce*).
2. Tim teknis Vendor melakukan verifikasi klasifikasi kendala.
3. Jika terbukti cacat sistem (*Bug*), Vendor segera merilis perbaikan tanpa membebankan biaya tambahan kepada Klien.
