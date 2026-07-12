# Jadwal Olahraga @sporttiaphari

Platform jadwal olahraga harian, siap deploy ke domain sendiri.

## 1. Bikin project Supabase (gratis)

1. Buka [supabase.com](https://supabase.com) → daftar/login → **New project**
2. Isi nama project (mis. `sporttiaphari`), bikin password database (simpan baik-baik), pilih region terdekat (Singapore paling deket ke Indonesia)
3. Tunggu ± 2 menit sampai project selesai dibuatin
4. Di sidebar kiri, buka **SQL Editor** → **New query**
5. **Sebelum di-run**, buka file `supabase-setup.sql` di folder ini, ganti dua tulisan `email-lo@contoh.com` jadi email yang mau lo pakai buat login sebagai admin
6. Copy-paste seluruh isi file itu → klik **Run**
   - Ini bikin tabel `kv_store` tempat semua data disimpen, ngaktifin akses publik buat baca, realtime, dan yang paling penting: **cuma email yang lo tulis tadi yang boleh nulis/edit/hapus data**
7. Buka **Settings** (ikon gear) → **API**
   - Copy nilai **Project URL**
   - Copy nilai **anon public** key
8. Buka **Authentication** (ikon orang) di sidebar → tab **Users** → **Add user** → **Create new user**
   - Isi email (harus **persis sama** kayak yang lo tulis di SQL tadi) dan password
   - Centang **Auto Confirm User** biar langsung aktif tanpa perlu klik link email
   - Klik **Create user**

Ini akun **satu-satunya** yang bisa login dan edit data di situs lo. Nggak ada tombol daftar/signup di aplikasinya sama sekali — akun cuma bisa dibikin manual dari dashboard Supabase kayak di atas.

## 2. Konfigurasi project ini

1. Duplikat file `.env.example` jadi `.env`
2. Isi dua baris di dalamnya pakai nilai dari langkah 1:
   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
3. Buka `src/App.jsx`, cari baris `const ADMIN_EMAIL = "email-lo@contoh.com";` di bagian atas file, ganti jadi email admin yang sama persis kayak yang lo pakai di langkah 1.8

## 3. Coba jalanin di komputer lo dulu

Butuh [Node.js](https://nodejs.org) terinstall (versi 18 ke atas).

```bash
npm install
npm run dev
```

Buka link yang muncul di terminal (biasanya `http://localhost:5173`). Klik tombol **Login** di header, masukin email + password akun admin yang lo bikin tadi. Kalau tombol Edit/Hapus/+ Event muncul, berarti semuanya udah kekonfigurasi bener.


## 4. Deploy ke domain sendiri

Paling gampang pakai **Vercel** (gratis buat skala kecil-menengah):

1. **Pastiin dulu** `ADMIN_EMAIL` di `src/App.jsx` udah bener sebelum push ke publik
2. Push folder ini ke GitHub (bikin repo baru, `git init`, `git add .`, `git commit`, push)
3. Buka [vercel.com](https://vercel.com) → login pakai akun GitHub → **Add New Project** → pilih repo ini
4. Vercel otomatis ngedeteksi ini project Vite, nggak perlu ubah setting build
5. Sebelum klik Deploy, buka bagian **Environment Variables**, tambahin:
   - `VITE_SUPABASE_URL` → isi URL Supabase lo
   - `VITE_SUPABASE_ANON_KEY` → isi anon key Supabase lo
6. Klik **Deploy**, tunggu ± 1 menit
7. Situs lo langsung online di `nama-project.vercel.app`
8. Mau pakai domain sendiri (mis. `sporttiaphari.com`)? Buka **Settings > Domains** di project Vercel, tambahin domain lo, ikutin instruksi ganti DNS di tempat lo beli domain

Alternatif: [Netlify](https://netlify.com) juga bisa, caranya mirip banget (drag-drop folder `dist` hasil `npm run build`, atau connect ke GitHub juga).

## Struktur data

Semua data disimpen di tabel `kv_store` dengan 2 baris utama:
- `events` → array semua event + jadwal pertandingan
- `broadcasterLogos` → daftar logo channel custom yang di-set lewat mode login

Status login disimpen otomatis sama Supabase di browser (bukan custom logic lagi), jadi begitu lo login di satu device, tetep login sampai lo logout manual atau clear browser data.

## Soal Keamanan (udah lebih aman dari versi awal)

Sekarang cuma akun dengan email yang lo tentuin di `ADMIN_EMAIL` (dan di RLS policy Supabase) yang bisa login dan edit data — dicek dua lapis: di kode frontend DAN di level database (RLS policy), jadi walaupun ada yang coba akses database langsung lewat API (skip UI-nya), tetep ketolak kalau bukan akun lo.

Beberapa hal yang masih perlu diperhatiin ke depannya kalau situsnya makin gede:
- **Jangan share password akun admin ke siapa pun**, dan pakai password yang kuat
- Supabase nyaranin aktifin **2FA** buat akun dashboard Supabase lo sendiri (beda sama akun admin situs) — ini di Account Settings Supabase
- Kalau nanti mau lebih dari satu admin (tim), tinggal bikin lebih banyak user di Authentication > Users, terus ubah policy SQL-nya jadi cek list email atau bikin tabel `admins` terpisah
- Rate limiting & validasi input tetap jadi PR berikutnya kalau trafiknya udah tinggi (lihat rekomendasi lain yang udah dibahas sebelumnya)
