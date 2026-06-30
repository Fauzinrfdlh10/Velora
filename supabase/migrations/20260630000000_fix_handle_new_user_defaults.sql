-- ============================================================================
-- Velora — Fix: handle_new_user() trigger needs defaults for groom_name & bride_name
-- ============================================================================
-- Bug di migration awal:
--   trigger handle_new_user() melakukan INSERT ke public.clients dengan
--   kolom (user_id, slug, expires_at) saja. Namun groom_name dan bride_name
--   didefinisikan NOT NULL tanpa DEFAULT, sehingga setiap signup baru akan
--   gagal dengan NOT NULL violation.
--
-- Fix:
--   1. Tambahkan DEFAULT ke kolom groom_name dan bride_name dengan string
--      placeholder yang lolos CHECK constraint (CHECK hanya forbid '').
--   2. Re-declare trigger function (perubahan minor — komentar doang).
--
-- Alasan pakai 'Belum diisi' (bukan NULL atau ''):
--   - Memenuhi NOT NULL
--   - Lolos CHECK (`groom_name <> ''`)
--   - Memberi sinyal eksplisit ke UI/dashboard bahwa data perlu dilengkapi
--     oleh admin / klien setelah signup, sehingga bisa ditangani tanpa
--     halaman error yang membingungkan.
--   - Dapat diganti kapan saja via UPDATE biasa.
-- ============================================================================

alter table public.clients
  alter column groom_name set default 'Belum diisi',
  alter column bride_name set default 'Belum diisi';


create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  initial_slug text;
begin
  -- 12 hex chars dari UUID user, prefix 'user-'.
  -- 12 hex = ~2^48: tabrakan astronomis langka pada skala wajar.
  -- CHECK pada kolom slug memaksa semua karakter lowercase + dash, jadi
  -- hex lowercase aman.
  initial_slug := 'user-' || substr(replace(new.id::text, '-', ''), 1, 12);

  insert into public.clients (user_id, slug, expires_at)
  values (
    new.id,
    initial_slug,
    now() + interval '1 year'
  );
  -- groom_name & bride_name otomatis terisi DEFAULT 'Belum diisi'
  -- setelah ALTER TABLE di migration sebelumnya.

  return new;
end;
$$;
