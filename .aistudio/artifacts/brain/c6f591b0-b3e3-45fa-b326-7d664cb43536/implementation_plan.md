# Rencana Implementasi: Pengaturan Pertemuan Diliburkan & Sinkronisasi Perhitungan Kehadiran Kalender Fleksibel

Menyediakan fitur bagi Admin untuk menandai hari libur/pembatalan pertemuan secara instan melalui klik pada **Kalender Akademik BTQ**, menyimpan pengaturan ke **Cloud Firestore**, serta menerapkan algoritma pergeseran nomor pertemuan secara otomatis agar tanggal libur dilewati dari kalkulasi kehadiran dan target 16 pertemuan tetap tercapai.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan jawaban klarifikasi yang telah Anda tentukan:
> 1. **Mekanisme Setting Libur**: Admin dapat langsung **mengklik tanggal di kartu Kalender Akademik** untuk membuka dialog pengaturan dan menandai hari libur beserta keterangannya (misal: "Libur Maulid", "Jeda PTS").
> 2. **Perhitungan Kehadiran & Penomoran**: Hari libur **dilewati total** dari kalkulasi kehadiran (tidak ada santri yang dianggap alpa/hadir, persentase tidak terganggu), dan **nomor pertemuan bergeser otomatis** ke Sabtu aktif berikutnya.
> 3. **Penyimpanan Data**: Pengaturan tanggal libur disimpan langsung ke **Cloud Firestore** agar tersinkronisasi secara real-time ke seluruh guru/pembina dan admin.

---

## 1. Overview & Formula Perhitungan

### A. Konsep Pergeseran Nomor Pertemuan (Meeting Shifting)
- Standar semester 1 memuat **16 Pertemuan Efektif**.
- Setiap hari Sabtu dievaluasi:
  - Jika hari Sabtu tersebut **Bukan Hari Libur**: Ditetapkan sebagai `Pertemuan Ke-[N]`, dan guru mengisi presensi serta progres nilai seperti biasa.
  - Jika hari Sabtu tersebut **Ditandai Hari Libur**:
    - Tanggal tersebut diberi status `Diliburkan` dengan catatan alasan.
    - **Nomor Pertemuan TIDAK bertambah** pada tanggal libur tersebut.
    - Nomor pertemuan berikutnya otomatis bergeser ke hari Sabtu berikutnya yang aktif.
    - *Contoh*: Jika Sabtu, 29 Agustus diliburkan (karena UTS), maka Sabtu, 5 September otomatis menjadi **Pertemuan 3**, Sabtu 12 September menjadi **Pertemuan 4**, dst.

### B. Rumus Perhitungan Kehadiran Santri (Attendance Rate)
$$\text{Tingkat Kehadiran} = \frac{\text{Jumlah Pertemuan Hadir}}{\text{Total Pertemuan Efektif yang Telah Terlaksana}} \times 100\%$$
- **Prinsip Keadilan**: Tanggal libur sama sekali tidak dimasukkan ke dalam penyebut (total pertemuan yang telah berjalan). Dengan demikian:
  - Kehadiran santri tidak turun (tidak dihitung alpa).
  - Grafik tren kehadiran di dashboard tidak mengalami grafik anjlok ke 0% akibat pekan kosong.
  - Capaian KKM kurikulum tetap terukur pada sesi yang benar-benar berlangsung.

---

## 2. User Experience & Visual Design

### A. Alur Interaksi Admin (Set Libur via Klik Kalender)
1. Pada kartu **Kalender Akademik BTQ** di Dashboard, setiap kotak tanggal memiliki indikator interaktif bagi Admin.
2. Admin mengklik salah satu tanggal (misal: Sabtu, 29 Agu).
3. Muncul modal dialog **"Pengaturan Jadwal Sesi Pertemuan"**:
   - Menampilkan detail tanggal dan nomor pertemuan terkait.
   - Pilihan aksi:
     - 🏖️ **Tandai Sebagai Hari Libur / Ditiadakan**: Muncul input teks alasan (misal: *"Libur Maulid Nabi Muhammad SAW"* atau *"Kegiatan Jeda PTS"*).
     - Tombol **Simpan ke Firestore**.
   - Jika tanggal sudah berstatus libur, modal menyediakan tombol **"Batalkan Libur & Aktifkan Kembali Sesi"**.
4. Begitu disimpan, kalender langsung memperbarui status:
   - Tanggal libur berubah warna menjadi oranye lembut (`bg-amber-50 border-amber-300 text-amber-900`) dengan badge `🏖️ Libur: [Alasan]`.
   - Kotak pertemuan setelahnya otomatis memperbarui tanggal riilnya secara real-time.

### B. Alur Interaksi Pembina / Guru
1. Guru melihat kartu Kalender Akademik dengan penanda jelas jika tanggal tertentu diliburkan.
2. Di halaman **Presensi Siswa** (`StudentAttendance.tsx`) dan **Sesi Mengajar** (`LiveSession.tsx`):
   - Jika guru memilih tanggal yang berstatus libur, sistem menampilkan banner peringatan informatif:
     > ℹ️ *Hari ini ditandai Libur oleh Admin: [Alasan]. Sesi Pertemuan Ke-[N] dijadwalkan pada Sabtu, [Tanggal Berikutnya].*
   - Tombol simpan dinonaktifkan untuk mencegah duplikasi atau data hantu pada tanggal libur.

---

## 3. Technical Architecture & Data Strategy

### A. Struktur Koleksi Cloud Firestore
Membuat koleksi baru: `academic_holidays`:
```typescript
export interface AcademicHoliday {
  id: string;          // format: 'holiday_YYYY-MM-DD'
  date: string;        // '2026-08-29'
  reason: string;      // 'Libur Nasional / Kegiatan Sekolah'
  semester: number;    // 1 atau 2
  academicYear: string;// '2026/2027'
  createdBy?: string;  // Admin email / UID
  createdAt: string;   // ISO string
}
```

### B. Modul Logika `src/services/academicCalendar.ts`
1. Menambahkan fungsi CRUD:
   - `getAcademicHolidays(): Promise<AcademicHoliday[]>`
   - `saveAcademicHoliday(date: string, reason: string): Promise<void>`
   - `deleteAcademicHoliday(date: string): Promise<void>`
2. Memperbarui generator jadwal:
   - `getSynchronizedMeetings(attendances, journals, holidays)`:
     - Melakukan perulangan hari Sabtu secara sekuensial.
     - Jika hari Sabtu masuk dalam daftar `holidays`, sisipkan sebagai item berstatus `'holiday'`.
     - Sesi aktif berikutnya tetap memegang nomor pertemuan yang belum terlaksana.
3. Menyiapkan Security Rules (`firestore.rules`):
   - Memastikan `match /academic_holidays/{holidayId}` mengizinkan `read` untuk pengguna login, dan `write` hanya untuk admin terverifikasi.

### C. Komponen yang Dibuat & Diperbarui
1. **`src/components/dashboard/HolidayConfigModal.tsx`**:
   - Dialog interaktif bagi admin untuk mengatur libur / aktifkan kembali sesi pada tanggal tertentu.
2. **`src/components/dashboard/AcademicCalendarCard.tsx`**:
   - Menghubungkan klik tanggal dengan `HolidayConfigModal`.
   - Menampilkan visual badge libur dan keterangan alasan.
3. **`src/components/dashboard/AdminDashboard.tsx`**:
   - Mengambil data `holidays` dari Firestore secara reaktif dan membagikannya ke kartu ringkasan dan kalender.
4. **`src/pages/StudentAttendance.tsx` & `src/pages/LiveSession.tsx`**:
   - Memberikan notifikasi peringatan jika tanggal yang dipilih adalah hari libur sekolah.

---

## 4. Verification & Testing Plan

1. **Pengujian Set Libur oleh Admin**:
   - Mengklik salah satu tanggal (misal 29 Agu 2026), mengisi alasan "Jeda Ujian Tengah Semester", lalu menyimpan.
   - Memverifikasi tanggal tersebut berubah status menjadi libur di database Firestore.
2. **Pengujian Pergeseran Nomor Pertemuan**:
   - Memastikan Pertemuan 3 yang sebelumnya jatuh pada 29 Agu bergeser ke 05 Sep.
   - Memverifikasi seluruh nomor pertemuan berikutnya bergeser maju 1 pekan.
3. **Pengujian Perhitungan Kehadiran**:
   - Memverifikasi bahwa tidak ada santri yang tercatat alpa pada tanggal libur.
   - Memverifikasi grafik tren kehadiran di Dashboard tetap mulus tanpa nilai anjlok ke 0%.
4. **Pengujian Batal Libur**:
   - Mengklik kembali tanggal libur dan memilih "Batalkan Libur". Memverifikasi jadwal kembali ke urutan semula.
5. **Kompilasi & Linting**:
   - Menjalankan `compile_applet` dan `lint_applet` untuk menjamin kualitas kode.
