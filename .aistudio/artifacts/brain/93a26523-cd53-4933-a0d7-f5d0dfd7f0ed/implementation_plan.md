# Redesain Beranda Mentor & Sesi Mengajar Terpadu

Transformasi menyeluruh pada dua halaman utama yang digunakan Mentor BTQ sehari-hari: **(1) Beranda Halaqah Mentor** yang diringkas dari tumpukan widget berulang menjadi pusat kendali yang bersih, kontekstual, dan *actionable*, serta **(2) Sesi Mengajar Terpadu** yang diubah menjadi **Wizard 3 Langkah Interaktif** dengan **Tabel Baris Kompak** dan **Bar Statistik Real-Time**.

## User Review & Critical Decisions

> [!IMPORTANT]
> Rencana ini menggabungkan hasil analisis perbaikan **Beranda Mentor (`MentorDashboard`)** dan preferensi **Sesi Mengajar (`LiveSession`)** yang telah Anda konfirmasi sebelumnya.

- **Confirmed Decision 1 (Wizard 3 Langkah Sesi Mengajar)**: Alur pengisian sesi dibagi menjadi *Langkah 1: Presensi Kehadiran*, *Langkah 2: Input Nilai KBM*, dan *Langkah 3: Jurnal & Finalisasi* dengan navigasi fleksibel.
- **Confirmed Decision 2 (Tabel Baris Kompak & Bar Statistik Real-Time)**: Mengganti kartu santri yang terlalu panjang dengan baris tabel kompak (`tabular-nums`) dan menambahkan strip indikator langsung (*Hadir, Izin, Sakit, Alpa*, serta progres penilaian).
- **Decision 3 (Penyederhanaan & Peningkatan Beranda Mentor)**:
  - **Dikurangi**: Menghapus duplikasi filter (bar tombol tren yang kembar dengan dropdown tabel), menggabungkan 6 kartu statistik + *Pie Chart* yang memakan ruang menjadi **4 Kartu KPI Interaktif**, serta menghapus *Checklist Persiapan Halaqah* statis.
  - **Diperbaiki**: Merampingkan *Hero Banner* dengan menyatukan info jadwal, ruangan, dan **Target Materi Pertemuan Aktif**, serta menyederhanakan tabel santri dari *double sparkline* yang padat menjadi indikator nilai, tren, dan kehadiran yang bersih.
  - **Ditambahkan**: Kartu **Kesinambungan Sesi (Rencana Jurnal Lalu → Target Materi Hari Ini)** dan panel **Santri Perlu Perhatian Prioritas** lengkap dengan pintasan hubungi wali santri via WhatsApp.

---

## 1. Analisis & Rencana Perbaikan Beranda Mentor (`MentorDashboard`)

### A. Apa yang Dikurangi (Menghilangkan Duplikasi & Kepadatan Visual)
1. **Redundansi 6 Kartu Statistik + Pie Chart + Bar Tren**:
   - Saat ini angka *Siap Ujian (Sangat Baik)* dan *Perlu Pendampingan* muncul 3 kali di layar (di deretan 6 kartu atas, di *Donut/Pie Chart* tengah, dan di filter tabel).
   - **Solusi**: Diringkas menjadi **4 Kartu KPI Utama yang Bisa Diklik (Interactive Filter Cards)** dilengkapi bar proporsi distribusi mutu horizontal yang hemat ruang.
2. **Filter Ganda (Bar Tombol Tren vs Dropdown Tabel)**:
   - Bar *"Tren Capaian Nilai Santri Antar Tahap"* di tengah halaman memiliki fungsi yang sama persis dengan dropdown *"Semua Tren"* di atas tabel santri.
   - **Solusi**: Menyatukan kontrol filter langsung di bagian header tabel santri agar halaman lebih ringkas.
3. **Checklist Persiapan Statis & Grafik Ganda di Tiap Baris Tabel**:
   - Kotak *Panduan Halaqah Pertemuan* berisi teks statis yang selalu sama setiap minggu dan memakan ruang sidebar.
   - Setiap baris tabel santri saat ini memuat 2 grafik SVG mini sekaligus (*Sparkline Nilai* + *Sparkline Batang Presensi*) yang membuat baris tabel terlihat sempit dan ramai.

### B. Apa yang Diperbaiki (Hierarki Visual & Kemudahan Pakai)
1. **Compact Command Hero (Hero Terfokus & Kontekstual)**:
   - Memangkas tinggi *Hero Banner* yang terlalu banyak *badge* dekoratif menjadi kartu sambutan elegan yang menampilkan: **Nama Mentor & Kelompok**, **Ruang & Jadwal**, **Status Pertemuan Saat Ini (Pertemuan Ke-N)**, dan satu tombol utama yang jelas: **Mulai / Lanjutkan Sesi Mengajar**.
2. **Tabel Santri Binaan yang Bersih & Mudah Dipindai**:
   - Menyusun ulang kolom tabel santri agar fokus pada: **Nama & Kelas/NIS**, **Capaian Materi Terakhir**, **Skor & Badge Mutu (dengan pil tren `▲ +4` / `▼ -2`)**, **Tingkat Kehadiran (Progress Bar Horizontal & Rasio Hadir)**, serta tombol aksi cepat **Grafik Detail** & **WA Ortu**.

### C. Apa yang Ditambahkan (Fitur Bernilai Tinggi & Eye-Catching)
1. **Kartu Kesinambungan Sesi (*Session Continuity Card*: Pertemuan Lalu $\longrightarrow$ Target Hari Ini)**:
   - Menampilkan secara berdampingan **Catatan & Rencana dari Jurnal Pertemuan Terakhir** dengan **Target Silabus & Halaman Pertemuan Hari Ini**, sehingga mentor langsung memahami konteks mengajar dalam 3 detik.
2. **Panel "Perlu Perhatian Prioritas" (*Actionable Student Spotlight*)**:
   - Menggantikan checklist statis di sidebar kanan dengan daftar santri yang mengalami penurunan nilai atau sering tidak hadir (*Alpa/Sakit*), lengkap dengan tombol satu-klik untuk melihat riwayat atau mengirim pesan motivasi ke orang tua.

---

## 2. Rencana Perbaikan Sesi Mengajar Terpadu (`LiveSession`)

### Key User Flows (Alur Wizard 3 Langkah)
1. **Bar Konfigurasi & Statistik Real-Time (Bagian Atas Tetap)**:
   - Pilihan **Kelompok Binaan**, **Tanggal**, **Pertemuan Ke-**, **Semester**, dan **Tahap Kurikulum**.
   - **Live Session KPI Strip**: Menampilkan secara langsung jumlah *Hadir*, *Izin*, *Sakit*, *Alpa*, progres santri yang sudah dinilai (`X dari Y Santri Hadir Dinilai • %`), serta rata-rata nilai kelas hari ini.
2. **Langkah 1 — Presensi Kehadiran (Tabel Kompak)**:
   - Toolbar aksi cepat: **Cari Santri**, **Scan QR Kartu**, **Semua Hadir**, **Semua Alpa**, dan **Tambah Santri**.
   - Baris tabel kompak berisi nomor urut, identitas santri, tombol segmen status (`Hadir | Izin | Sakit | Alpa`), dan catatan singkat kehadiran.
3. **Langkah 2 — Input Nilai KBM (Tabel Spreadsheet Kompak)**:
   - Memfokuskan tampilan pada santri yang berstatus **Hadir** (dengan toggle untuk melihat semua santri).
   - Kolom input angka langsung (`Tajwid`, `Baca`, `Tulis`, `Hafalan`), pemilih `Surah Juz 30 & Ayat`, skor `Rata-rata Otomatis`, serta tombol **Slider Detail** dan **Kirim WA**.
4. **Langkah 3 — Jurnal Mengajar & Simpan Sesi**:
   - Menampilkan kartu ringkasan kesiapan data sesi berdampingan dengan form **Materi yang Dibahas**, **Pencapaian Halaman/Surat**, **Kendala Santri**, dan **Rencana Tahap Berikutnya**, ditutup dengan tombol **Simpan Sesi Mengajar**.

---

## 3. Technical Architecture & Component Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        PORTAL MENTOR BTQ SMPN 102                            │
├──────────────────────────────────────┬───────────────────────────────────────┤
│        A. MentorDashboard            │           B. LiveSession              │
├──────────────────────────────────────┼───────────────────────────────────────┤
│ 1. Compact Command Hero              │ 1. Session Config Bar                 │
│    • Identitas Kelompok, Ruang, Jam  │    • Kelompok, Tgl, Pertemuan, Tahap  │
│    • CTA: Mulai Pertemuan Ke-N       │                                       │
│                                      │ 2. Live KPI & Progress Strip          │
│ 2. 4 Clickable KPI Cards             │    • [Hadir][Izin][Sakit][Alpa]       │
│    • Total & Rata-rata Kehadiran     │    • [Progres Nilai X/Y (%) & Rerata] │
│    • Skor Rata-rata & Bar Mutu       │                                       │
│    • Siap Ujian (Filter Klik)        │ 3. 3-Step Interactive Wizard          │
│    • Perlu Bimbingan (Filter Klik)   │    ├─ Step 1: Compact Attendance Table│
│                                      │    ├─ Step 2: Inline Score Grid Table │
│ 3. Continuity & Priority Grid        │    └─ Step 3: Teaching Journal &      │
│    • Jurnal Lalu ──> Target Hari Ini │               Session Summary Review  │
│    • Panel Santri Perlu Perhatian    │                                       │
│                                      │ 4. Sticky Step Nav & Atomic Save Bar  │
│ 4. Clean Student Progress Table      │    • [← Kembali] [Lanjut / Simpan →]  │
│    • Search, Filter, & Modal Grafik  │                                       │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

### Interactive State & Data Persistence
- **Sinkronisasi Real-Time Tanpa Kehilangan Fitur**:
  - Seluruh perhitungan murni berasal dari koleksi Firestore (`students`, `attendance`, `progress`, `journals`, `holidays`) tanpa data tiruan.
  - Klik pada kartu KPI di `MentorDashboard` langsung memfilter tabel daftar santri di bawahnya dan melakukan *smooth scroll* ke tabel.
  - Penyimpanan di `LiveSession` tetap menggunakan *atomic batch write* paralel dan memancarkan event pembaruan agar `MentorDashboard` langsung ter-update saat mentor kembali ke Beranda.
