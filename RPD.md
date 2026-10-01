# PRODUCT & REQUIREMENTS DEFINITION (RPD): REAL-TIME EVENT SCOREBOARD SYSTEM (SCORESYNC)
Document Version: 1.0.0
Status: APPROVED & RATIFIED FOR IMPLEMENTATION
Target Platform:
- Admin Controller: Web App Refined for Mobile Browser (Smartphone)
- Public Display: Web App Optimized for Laptop / Smart TV / Desktop (16:9 Screen)

---

## 1. Visi Produk & Ringkasan Eksekutif

**ScoreSync** (Sistem Real-Time Scoreboard & Game Management System) adalah platform papan skor digital dwilayar (*dual-screen decoupled engine*) yang memisahkan secara tegas antara:
1. **Remote Control (Sisi Admin - Mobile Device / Smartphone):** Konsol operator berlatensi rendah untuk memudahkan panitia/admin melakukan penginputan skor yang serba cepat via HP, kustomisasi aturan, kontrol timer, memicu efek suara, dan mengendalikan mode tampilan layar laptop secara jarak jauh.
2. **Papan Tampilan Utama (Sisi Display - Laptop / Monitor 16:9):** Antarmuka penayangan visual publik (*view-only*) yang responsif, rapi, dan dinamis, menampilkan visualisasi skor, matriks tabel per ronde, highlight statistik, hingga podium leaderboard tanpa perlu intervensi interaksi fisik di laptop.

Sistem beroperasi dengan sinkronisasi real-time berbasis event (< 300 ms latensi), eliminasi kebutuhan refresh manual, dan memastikan arsitektur tetap tangguh dan modular.

---

## 2. Peran Pengguna (User Roles) & Workflow

### 2.1. User Roles

1. **Admin / Controller (Smartphone):**
   - Mengelola data pemain (minimal 4–5 pemain, dinamis dapat ditambah).
   - Melakukan kustomisasi aturan skor & preset poin.
   - Menginput skor per pemain baik melalui tombol rekomendasi cepat (*one-click presets*) maupun input manual.
   - Mengendalikan mode tampilan layar Laptop secara remote (*Remote Display Switcher*).
   - Mengontrol timer/stopwatch pertandingan (Start, Pause, Reset).
   - Memicu sound effects (Victory, Minus Penalty, Bell Ronde) pada speaker laptop.
   - Membatalkan input skor terakhir (*Undo Last Score*).
   - Mengakhiri pertandingan (*Finish Game*) dan menyimpan seluruh log ke basis data cloud.

2. **Audience / Display (Laptop / Screen 16:9):**
   - Menampilkan data pertandingan yang tersinkronisasi secara real-time tanpa delay (< 300 ms).
   - Tidak memiliki tombol navigasi/interaksi (*strictly view-only*, dikendalikan penuh oleh Admin HP).
   - Memutar audio sound effects secara lokal berdasarkan instruksi remote admin.
   - Menampilkan status koneksi real-time (*Live/Reconnecting status indicator*).

### 2.2. Workflow Sistem

```text
[ Admin HP ] --- (Websocket Event / Live Sync) ---> [ Cloud Database / State Engine ]
     |                                                              |
     +--------- (Real-time Remote Display Switch) -----------------> [ Display Laptop ]
```

1. **Persiapan:** Admin membuka aplikasi via HP, mengonfigurasi pertandingan, nama pemain (min 4-5 pemain), warna, dan nilai poin kustom. Layar laptop membuka tautan display screen.
2. **Pelaksanaan:** Setiap kali Admin menekan tombol poin (+/-), input manual, atau mengganti mode filter tampilan di HP, tampilan Laptop seketika berubah secara otomatis tanpa butuh refresh.
3. **Penyelesaian:** Admin menekan "Akhiri Permainan" di HP. Sistem memproses akumulasi akhir, menampilkan layar podium pemenang di laptop beserta efek audio selebrasi, dan mengunci data ke cloud database.

---

## 3. Spesifikasi Kebutuhan Fungsional (Functional Requirements)

### 3.1. Modul Admin Controller (Akses HP / Mobile Browser)

- **FR-ADM-001 (Manajemen Pemain):**
  - Konfigurasi pemain dengan batas minimal 4 hingga 5 pemain, serta opsi penambahan pemain dinamis.
  - Kustomisasi nama pemain, kode warna aksen visual (HEX), dan simbol/avatar.
- **FR-ADM-002 (Input Skor Cepat / One-Click Presets):**
  - Tombol Rekomendasi Poin Plus: `+100`, `+150`, `+200`.
  - Tombol Rekomendasi Poin Minus: `-100`, `-200`.
  - Target sentuh mobile-friendly (minimal 48x48 px, haptic & active tap feedback).
- **FR-ADM-003 (Input Skor Manual):**
  - Textfield angka cepat untuk memasukkan nilai poin fleksibel (misal: `+35`, `-15`, `+75`).
- **FR-ADM-004 (Undo Last Score):**
  - Membatalkan mutasi skor terakhir secara instan jika terjadi kesalahan input oleh admin.
- **FR-ADM-005 (Remote Display Control / View Switcher):**
  - **Opsi Filter 1 (Skor Total):** Menampilkan skor kumulatif/total seluruh pemain dalam card grid.
  - **Opsi Filter 2 (Tabel Skor Detail):** Menampilkan matriks tabel breakdown skor per ronde untuk setiap pemain.
  - **Opsi Filter 3 (Highlight Stat Ronde):** Menampilkan statistik ronde berjalan (pemain dengan minus terbanyak vs plus terbanyak).
  - **Opsi Filter 4 (Papan Peringkat Sementara):** Menampilkan animasi leaderboard/podium terkini.
  - **Opsi Filter 5 (Akhiri Permainan):** Menghentikan pertandingan, memicu pop-up selebrasi pemenang di laptop, dan mengunci data ke cloud.
- **FR-ADM-006 (Timer / Stopwatch Match Control):**
  - Kontrol waktu terpusat: Start, Pause, Reset waktu pertandingan dari smartphone admin.
- **FR-ADM-007 (Sound Effect Trigger):**
  - Pemicu efek suara jarak jauh ke laptop: Victory Fanfare, Minus Penalty Buzzer, Bell Ronde Gong.

### 3.2. Modul Display Screen (Akses Layar Laptop / Monitor 16:9)

- **FR-DSP-001 (Layout Rapi & Grid System):**
  - Memanfaatkan *Card Layout* modern 16:9 yang proporsional untuk 4–5+ pemain agar tampilan di monitor luas tidak berantakan.
- **FR-DSP-002 (Animasi Transisi & Reordering):**
  - Perubahan skor atau pergeseran posisi ranking menggunakan animasi halus (*Smooth Reordering / Flip Animation*).
- **FR-DSP-003 (Mode Tampilan Dinamis):**
  - Menerima event perubahan mode tampilan dari Admin secara instan tanpa reload browser.
- **FR-DSP-004 (Audio Engine Speaker Laptop):**
  - Memutar Web Audio API / synth sound effect saat menerima signal audio event dari admin.
- **FR-DSP-005 (Status Koneksi Real-time):**
  - Indikator koneksi kecil di pojok layar (Online / Reconnecting).
- **FR-DSP-006 (Dark Mode Default):**
  - Palet gelap dengan kontras tinggi (OLED dark / deep slate) untuk kenyamanan pandangan di panggung/acara.

---

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements)

| Kategori | Spesifikasi & Metrik |
| --- | --- |
| **Real-time Sync Latency** | Latensi pembaruan data antara Admin HP ke Layar Laptop maksimal **300 ms**. |
| **Responsivitas & Target UI** | **Mobile-First CSS** untuk Admin Controller (smartphone), **Desktop-First (16:9 / 1080p)** untuk Layar Display. |
| **Reliabilitas Jaringan** | Fitur *Auto-reconnect* jika jaringan terputus berkala dengan pemulihan sinkronisasi otomatis (*silent re-sync*). |
| **Keamanan & Otorisasi** | Otentikasi Admin menggunakan PIN/Token Sesi pertandingan untuk mencegah interferensi input liar. |
| **Performa Visual** | 60 FPS rendering animasi angka dan zero cumulative layout shift (CLS = 0). |