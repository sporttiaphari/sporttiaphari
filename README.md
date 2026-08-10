# Jadwal Olahraga @sporttiaphari

Platform jadwal olahraga harian, siap deploy ke domain sendiri.

## 1. Bikin project Supabase (gratis)

1. Buka [supabase.com](https://supabase.com) → daftar/login → **New project**
2. Isi nama project (mis. `sporttiaphari`), bikin password database (simpan baik-baik), pilih region terdekat (Singapore paling deket ke Indonesia)
3. Tunggu ± 2 menit sampai project selesai dibuatin
4. Di sidebar kiri, buka **SQL Editor** → **New query**
5. **Copy-paste seluruh isi file `supabase-setup.sql`** → klik **Run**
   - Script ini sudah memakai email admin `sporttiaphari@outlook.com`. Kalau email lo beda, ganti dulu di dalam file SQL sebelum di-run.
   - Ini bikin tabel `kv_store` + `suggestions`, aktifin RLS (cuma admin yang boleh tulis), realtime, **dan Storage bucket `logos`**.
6. Buka **Settings** (ikon gear) → **API**
   - Copy nilai **Project URL**
   - Copy nilai **anon public** key
7. Buka **Authentication** (ikon orang) di sidebar → tab **Users** → **Add user** → **Create new user**
   - Isi email (harus **persis sama** kayak di SQL) dan password
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
3. Buka `src/App.jsx`, pastikan baris `const ADMIN_EMAIL = "sporttiaphari@outlook.com";` sudah sesuai email admin lo.

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

Semua data disimpen di tabel `kv_store` dengan 3 key utama:
- `events` → array semua event + jadwal pertandingan
- `broadcasterLogos` → daftar logo channel custom (hanya URL, bukan base64)
- `eventLogos` → daftar logo event (hanya URL, bukan base64)

**Logo sekarang disimpan di Supabase Storage (bucket `logos`)**, database cuma simpan URL HTTPS-nya. Ini jauh lebih aman dan hemat space.

Status login disimpen otomatis sama Supabase di browser (bukan custom logic lagi), jadi begitu lo login di satu device, tetep login sampai lo logout manual atau clear browser data.

## Soal Keamanan (udah lebih aman)

- Cuma akun dengan email yang ditentukan di `ADMIN_EMAIL` + RLS policy yang bisa login dan edit data (dicek dua lapis: frontend + database).
- **Logo channel & logo event** tidak lagi disimpan sebagai base64 di Postgres. Mereka di-upload ke Storage dengan policy ketat (hanya admin yang boleh upload/hapus, publik cuma boleh baca).
- File size logo dibatasi max 1.5 MB.
- Jangan share password akun admin, dan aktifkan 2FA di akun dashboard Supabase lo.
