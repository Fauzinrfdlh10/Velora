-- ============================================================================
-- Velora — RPC: get_public_client_by_slug(text)
-- ============================================================================
-- Tujuan:
--   Memungkinkan R halaman publik (Tahap 4) membedakan 404 vs inactive/expired
--   vs draft, tanpa harus memakai Service Role key di app layer.
--
-- Kenapa perlu bypass RLS?
--   Anon policy untuk public.clients cuma mengizinkan SELECT saat
--   status='active' AND expires_at > now(). Dari sisi anon, semua kasus
--   (draft / inactive / expired / tidak ditemukan) terlihat sebagai null.
--   Untuk menampilkan halaman "khusus untuk undangan sudah tidak aktif"
--   (requirement Tahap 4), RSC publik butuh akses ke kolom status penuh.
--
-- Kenapa RPC, bukan Service Role di app?
--   SECURITY DEFINER di Postgres = constrain ada di level DB. Kolom yang
--   bocor ke client HARUS masuk dalam return signature function ini.
--   Menambah kolom baru ke return adalah migration eksplisit (visible
--   di git history). Service Role di app layer akan me-return semua kolom
--   tanpa filter kecuali developer ingat untuk memfilter — tinggi risiko
--   regressi.
--
-- Kolom yang dikembalikan (publik-only):
--   id              — diperlukan untuk query turunan (mis. guests.name lookup
--                     saat ?to=Firna). Bukan rahasia; URL sudah ada di address
--                     bar publik.
--   slug            — domain pengidentifikasi publik.
--   groom_name,
--   bride_name      — untuk sapaan di halaman.
--   akad_date,
--   akad_location,
--   akad_maps_url,
--   resepsi_date,
--   resepsi_location,
--   resepsi_maps_url — untuk ditampilkan.
--   theme           — diperlukan oleh renderer (pengaturan styling di tahap
--                     berikutnya).
--   status          — diperlukan untuk menentukan render branch
--                     (active/expired/inactive/draft).
--   expires_at      — sama.
--
-- Kolom yang TIDAK dikembalikan (privat/audit):
--   user_id         — tidak boleh bocor (link ke auth, identitas owner).
--   bank_accounts   — finansial; hanya owner boleh akses.
--   created_at,
--   updated_at      — audit internal; tidak relevan untuk publik.
-- ============================================================================

create or replace function public.get_public_client_by_slug(p_slug text)
returns table (
  id uuid,
  slug text,
  groom_name text,
  bride_name text,
  akad_date timestamptz,
  akad_location text,
  akad_maps_url text,
  resepsi_date timestamptz,
  resepsi_location text,
  resepsi_maps_url text,
  theme text,
  status public.invitation_status,
  expires_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.id,
    c.slug,
    c.groom_name,
    c.bride_name,
    c.akad_date,
    c.akad_location,
    c.akad_maps_url,
    c.resepsi_date,
    c.resepsi_location,
    c.resepsi_maps_url,
    c.theme,
    c.status,
    c.expires_at
  from public.clients c
  where c.slug = p_slug
  limit 1;
$$;

-- Pemanggil: anon (pengunjung publik) dan authenticated (admin/dashboard
-- yang ingin melihat status klien tanpa harus service-role).
grant execute on function public.get_public_client_by_slug(text) to anon, authenticated;

comment on function public.get_public_client_by_slug(text) is
  'Lookup klien by slug untuk halaman publik. SECURITY DEFINER memungkinkan '
  'RSC publik membedakan rentang status (active/inactive/expired/draft/tidak-ditemukan) '
  'tanpa Service Role key di app layer. Hanya me-return kolom publik; '
  'user_id, bank_accounts, dan audit timestamps sengaja di-exclude. '
  'Pemanggil WAJIB: hanya menampilkan field yang ditampilkan ke user, '
  'jangan me-return raw row ke client.';
