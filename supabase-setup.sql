-- Jalanin script ini di Supabase Dashboard > SQL Editor > New query > Run
-- Aman dijalanin berkali-kali (idempotent) — nggak akan error walau
-- sebagian sudah pernah dibuat sebelumnya.
--
-- PENTING: Ganti 'sporttiaphari@outlook.com' di bawah ini kalau email admin lo beda.
-- Email ini HARUS sama dengan VITE_ADMIN_EMAIL di .env / Vercel Environment Variables.

-- ============================================================
-- 1. Tabel kv_store (events, broadcasterLogos, eventLogos)
-- ============================================================
create table if not exists kv_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table kv_store enable row level security;

-- Hapus dulu kalau udah ada, biar bisa di-replace tanpa error
drop policy if exists "public can read kv_store" on kv_store;
drop policy if exists "public can write kv_store" on kv_store;
drop policy if exists "public can update kv_store" on kv_store;
drop policy if exists "only admin can insert kv_store" on kv_store;
drop policy if exists "only admin can update kv_store" on kv_store;
drop policy if exists "only admin can delete kv_store" on kv_store;

-- Semua orang (termasuk yang belum login) boleh BACA data.
create policy "public can read kv_store"
  on kv_store for select
  using (true);

-- Cuma akun admin yang boleh TULIS / UPDATE / DELETE.
create policy "only admin can insert kv_store"
  on kv_store for insert
  with check ((auth.jwt() ->> 'email') = 'sporttiaphari@outlook.com');

create policy "only admin can update kv_store"
  on kv_store for update
  using ((auth.jwt() ->> 'email') = 'sporttiaphari@outlook.com')
  with check ((auth.jwt() ->> 'email') = 'sporttiaphari@outlook.com');

create policy "only admin can delete kv_store"
  on kv_store for delete
  using ((auth.jwt() ->> 'email') = 'sporttiaphari@outlook.com');

-- Aktifin Realtime buat tabel ini
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'kv_store'
  ) then
    alter publication supabase_realtime add table kv_store;
  end if;
end $$;

-- ============================================================
-- 2. Tabel suggestions (opsional, sudah ada di beberapa deployment)
-- ============================================================
create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  contact text,
  created_at timestamptz not null default now()
);

alter table suggestions enable row level security;

drop policy if exists "anyone can insert suggestions" on suggestions;
drop policy if exists "admin can read suggestions" on suggestions;
drop policy if exists "admin can delete suggestions" on suggestions;

create policy "anyone can insert suggestions"
  on suggestions for insert
  with check (true);

create policy "admin can read suggestions"
  on suggestions for select
  using ((auth.jwt() ->> 'email') = 'sporttiaphari@outlook.com');

create policy "admin can delete suggestions"
  on suggestions for delete
  using ((auth.jwt() ->> 'email') = 'sporttiaphari@outlook.com');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'suggestions'
  ) then
    alter publication supabase_realtime add table suggestions;
  end if;
end $$;

-- ============================================================
-- 3. Storage bucket "logos" — INI YANG BIKIN LOGO AMAN
-- ============================================================
-- Logo channel & logo event sekarang disimpan di Storage (bukan base64
-- di dalam JSONB). Database hanya menyimpan URL HTTPS.
-- Ini jauh lebih aman, hemat space, dan scalable.

-- Buat bucket (public = true supaya <img src="..."> bisa load tanpa auth)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  1572864, -- 1.5 MB
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 1572864,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];

-- Hapus policy lama kalau ada
drop policy if exists "Public read logos" on storage.objects;
drop policy if exists "Admin upload logos" on storage.objects;
drop policy if exists "Admin update logos" on storage.objects;
drop policy if exists "Admin delete logos" on storage.objects;

-- Siapa saja boleh baca (supaya logo muncul di website publik)
create policy "Public read logos"
  on storage.objects for select
  using (bucket_id = 'logos');

-- Hanya admin yang boleh upload
create policy "Admin upload logos"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and (auth.jwt() ->> 'email') = 'sporttiaphari@outlook.com'
  );

-- Hanya admin yang boleh update
create policy "Admin update logos"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and (auth.jwt() ->> 'email') = 'sporttiaphari@outlook.com'
  );

-- Hanya admin yang boleh hapus
create policy "Admin delete logos"
  on storage.objects for delete
  using (
    bucket_id = 'logos'
    and (auth.jwt() ->> 'email') = 'sporttiaphari@outlook.com'
  );
