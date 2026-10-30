# Rencana Implementasi: Sinkronisasi Real-Time Profil & Tanda Tangan Rapor Firestore

Investigasi menunjukkan bahwa data konfigurasi sekolah (Kepala Sekolah & Pembina Rohis) telah memiliki struktur tersimpan di dokumen Firestore `settings/school_config`. Untuk memastikan seluruh perubahan profil dan tanda tangan tercermin secara **real-time di rapor semua siswa**, kita akan mengimplementasikan listener Firestore terintegrasi.

---

## 1. Tambah Listener Real-Time Konfigurasi Sekolah (`schoolConfig.ts`)
- Menambahkan fungsi `subscribeToSchoolConfig(callback)` pada `src/services/schoolConfig.ts` yang mendengarkan perubahan dokumen `settings/school_config` menggunakan `onSnapshot`.
- Memastikan `saveAdminAndSchoolProfile` dan `saveSchoolConfig` memperbarui field `headmasterName`, `headmasterNip`, `headmasterSignature`, `coordinatorName`, `coordinatorNip`, dan `coordinatorSignature` di Firestore.

## 2. Integrasi Listener Real-Time pada Lembar Rapor (`OfficialReportSheet.tsx`)
- Memasang `subscribeToSchoolConfig` pada `OfficialReportSheet.tsx` agar nama, NIP, dan tanda tangan **Pembina Rohis** (Kolom Tengah) serta **Kepala Sekolah** (Kolom Kanan) langsung ter-update secara otomatis begitu ada perubahan di profil Admin.
- Memasang listener `onSnapshot` ke dokumen `mentors/{mentorId}` spesifik untuk kelompok siswa terkait, sehingga profil dan tanda tangan **Mentor** (Kolom Kiri) juga tercermin secara real-time.

## 3. Penyempurnaan Pengeditan Profil (`UserProfileModal.tsx`)
- Memastikan saat Admin mengubah profil (Pembina Rohis & Kepala Sekolah), data langsung terdorong ke `settings/school_config`.
- Memastikan saat Mentor mengunggah atau menggambar tanda tangan digital di modal profil, data tersimpan ke `mentors/{mentorId}` dan terdistribusi ke rapor siswa binaannya.

## 4. Validasi Kompilasi & Keamanan Firestore
- Menguji build dengan `compile_applet` dan `lint_applet` untuk memastikan tidak ada kesalahan TypeScript.
- Memastikan aturan keamanan `firestore.rules` mengizinkan akses baca publik/otentikasi ke `settings/school_config` dan `mentors`.

---

## Verifikasi
- Pengubahan nama/tanda tangan Pembina Rohis di modal profil Admin akan langsung mengubah tanda tangan pada modal rapor yang sedang terbuka tanpa butuh muat ulang halaman (*zero latency re-render*).
