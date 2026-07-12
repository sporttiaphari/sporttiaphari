-- Jalanin script ini di Supabase Dashboard > SQL Editor > New query > Run
-- Aman dijalanin berkali-kali (idempotent) — nggak akan error walau
-- sebagian sudah pernah dibuat sebelumnya.

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

-- Semua orang (termasuk yang belum login) boleh BACA data.
-- Ini yang bikin jadwal olahraga bisa keliatan publik.
create policy "public can read kv_store"
  on kv_store for select
  using (true);

-- Cuma akun dengan email tertentu yang boleh TULIS (insert/update).
-- GANTI 'email-lo@contoh.com' di bawah ini sesuai email akun admin lo,
-- dan pastiin persis sama dengan konstanta ADMIN_EMAIL di src/App.jsx.
create policy "only admin can insert kv_store"
  on kv_store for insert
  with check ((auth.jwt() ->> 'email') = 'email-lo@contoh.com');

create policy "only admin can update kv_store"
  on kv_store for update
  using ((auth.jwt() ->> 'email') = 'email-lo@contoh.com')
  with check ((auth.jwt() ->> 'email') = 'email-lo@contoh.com');

-- Aktifin Realtime buat tabel ini (aman dijalanin berkali-kali)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'kv_store'
  ) then
    alter publication supabase_realtime add table kv_store;
  end if;
end $$;
