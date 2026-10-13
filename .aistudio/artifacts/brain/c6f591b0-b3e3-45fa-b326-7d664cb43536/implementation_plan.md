# Rencana Perbaikan: Koreksi Jadwal Pertemuan Kalender Akademik (Sabtu BTQ)

## Penyebab Masalah (Root Cause Analysis)
Pada tangkapan layar yang Anda kirimkan, sesi pertemuan (P4, P5, P6, P7) muncul di kolom **Jumat** (tanggal 4, 11, 18, 25 September) bukannya di kolom **Sabtu (BTQ)** (tanggal 5, 12, 19, 26 September).

Penyebab utamanya adalah **Timezone Shift (Pergeseran Zona Waktu)**:
1. Objek tanggal dibuat pada tengah malam waktu lokal Indonesia/WIB (`2026-09-05 00:00:00 GMT+0700`).
2. Kode pemetaan di `src/services/academicCalendar.ts` menggunakan method `.toISOString().split('T')[0]`.
3. Method `.toISOString()` mengonversi waktu lokal ke format **UTC (GMT+0)**, sehingga mundur 7 jam menjadi `2026-09-04 17:00:00.000Z` (pukul 17:00 hari Jumat sebelumnya).
4. Hasil pemotongan string tanggal menjadi `'2026-09-04'` (hari Jumat), yang menyebabkan komponen kalender menempatkan kartu pertemuan di hari Jumat tanggal 4, bukan Sabtu tanggal 5. Hal serupa terjadi untuk P5 (11 Sep), P6 (18 Sep), dan P7 (25 Sep).

---

## Rencana Perbaikan yang Diusulkan

### 1. Perbaikan Algoritma Tanggal Pertemuan (`src/services/academicCalendar.ts`)
- Ganti kalkulasi tanggal berbasis timestamp UTC (`toISOString()`) dengan kalkulasi tanggal berbasis kalender lokal (`getFullYear()`, `getMonth()`, `getDate()`).
- Gunakan penambahan hari lokal kalender (`new Date(baseYear, baseMonth, baseDay + weekOffset * 7)`).
- Menghasilkan string tanggal `YYYY-MM-DD` yang selalu konsisten dengan tanggal Sabtu riil di kalender Masehi:
  - Pertemuan 1: Sabtu, 15 Agustus 2026 (`2026-08-15`)
  - Pertemuan 2: Sabtu, 22 Agustus 2026 (`2026-08-22`)
  - Pertemuan 3: Sabtu, 29 Agustus 2026 (`2026-08-29`)
  - Pertemuan 4: Sabtu, 05 September 2026 (`2026-09-05`)
  - Pertemuan 5: Sabtu, 12 September 2026 (`2026-09-12`)
  - Pertemuan 6: Sabtu, 19 September 2026 (`2026-09-19`)
  - Pertemuan 7: Sabtu, 26 September 2026 (`2026-09-26`)
  - Dan seterusnya hingga Pertemuan 16 (Sabtu, 28 November 2026).

### 2. Standarisasi Grid Kalender (`src/pages/AcademicCalendar.tsx`)
- Perbarui pembentukan string tanggal pada `calendarGrid`:
  - Padding hari bulan sebelumnya (previous month padding).
  - Hari bulan berjalan (current month days).
  - Padding hari bulan berikutnya (next month padding).
- Pastikan seluruh cell tanggal menggunakan format lokal murni `YYYY-MM-DD` tanpa konversi `toISOString()` yang rentan terhadap offset zona waktu UTC+7.

### 3. Penyelarasan Dashboard & Komponen Terkait (`src/components/dashboard/AdminDashboard.tsx`)
- Pastikan helper tanggal Sabtu terakhir (`lastSaturdayStr`) dan `todayStr` menggunakan format tanggal lokal agar kartu ringkasan presensi mingguan selalu presisi merujuk ke hari Sabtu.

---

## Rencana Verifikasi
1. Periksa tampilan halaman Kalender Akademik (`/calendar`) pada bulan September 2026:
   - Pastikan P4 berada di kolom **Sabtu (BTQ)** tanggal 5 September.
   - Pastikan P5 berada di kolom **Sabtu (BTQ)** tanggal 12 September.
   - Pastikan P6 berada di kolom **Sabtu (BTQ)** tanggal 19 September.
   - Pastikan P7 berada di kolom **Sabtu (BTQ)** tanggal 26 September.
   - Pastikan kolom **Jumat** bersih tanpa kartu pertemuan BTQ.
2. Jalankan `lint_applet` dan `compile_applet` untuk memastikan tidak ada kesalahan kompilasi.
