-- ============================================================================
-- Velora — RSVP: One per guest (upsert) + anti-spam hardening
-- ============================================================================
-- Tahap 6 requirement: "Satu kali per tamu (update)" — kalau guest_id ada,
-- submit kedua dari tamu yang sama UPDATE row yang sudah ada, BUKAN insert
-- baru. Anonymous (guest_id NULL) tetap setiap submit = entry baru.
--
-- Kenapa partial unique index dan bukan full UNIQUE?
--   - guest_id nullable: Postgres UNIQUE mengizinkan banyak NULLs (sesuai
--     standar SQL), tapi kita mau IDX hanya cover baris dengan guest_id.
--     Partial unique index Where guest_id IS NOT NULL persis mengunci
--     "1 RSVP per tamu" untuk tamu personal link, tanpa menyentuh RSVPs
--     anonim.
--
-- Kenapa perlu RPC upsert_rsvp(), tidak cukup .upsert() dari anon?
--   - RLS public untuk rsvps HANYA INSERT (lihat migration 20260629000000).
--     Tidak ada policy SELECT / UPDATE / DELETE untuk anon — by design,
--     jawaban RSVP adalah PRIVASI owner. Tanpa SELECT/UPDATE, anon tidak
--     bisa pakai `.upsert()` (yang buta apakah row konflik) atau `.update()`
--     langsung. Solusi: RPC SECURITY DEFINER yang jalan sebagai owner role,
--     melakukan INSERT-atau-UPDATE dalam satu transaksi, lalu return baris
--     yang baru saja ditulis.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Partial unique index — DB-level enforcement
-- ---------------------------------------------------------------------------
create unique index if not exists rsvps_client_id_guest_id_unique_idx
  on public.rsvps (client_id, guest_id)
  where guest_id is not null;

comment on index rsvps_client_id_guest_id_unique_idx is
  'TAHAP 6: Menjamin satu RSVP per tamu (saat personal link dipakai). ' ||
  'Anonymous RSVPs (guest_id NULL) tidak terkena constraint ini, sehingga ' ||
  'banyak submission dari tamu tanpa link tetap diizinkan.';


-- ---------------------------------------------------------------------------
-- 2) RPC upsert_rsvp(...) — insert-or-update dalam satu transaksi
-- ---------------------------------------------------------------------------
-- Dipanggil oleh Server Action `submitRsvp` di lib/actions/invitation.ts.
-- SECURITY DEFINER jadi dia berjalan sebagai owner function (privilege
-- postgres bypass RLS), tetapi menerima input dari anon dan memvalidasi
-- SEMUA kondisi manually — tidak ada trusts ke client.
--
-- Kontrak:
--   - `status` WAJIB salah satu dari rsvp_status enum (Postgres tolak kalau
--     invalid — kita teruskan error).
--   - `attendee_count` WAJIB 0..10 (CHECK constraint di tabel juga enforce).
--   - Jika guest_id non-null DAN row dengan (client_id, guest_id) sudah
--     ada → UPDATE semua kolom terbaru. created_at tetap original
--     (riwayat) dan updated_at? kita tambah manual lewat now().
--   - Jika guest_id null → INSERT row baru (anonymous).
--   - Return row lengkap (id, created_at, dll) agar client bisa render
--     confirmation.
--
-- Parameter opsional:
--   - `p_duration_ms`: delta waktu antara mount form dan submit (client pass).
--     Digunakan anti-spam — di bawah threshold ditolak. Default 0 = skip cek
--     (untuk backward callability, meskipun production selalu pass nilai).
-- ---------------------------------------------------------------------------
create or replace function public.upsert_rsvp(
  p_client_id   uuid,
  p_guest_id    uuid,
  p_name        text,
  p_status      public.rsvp_status,
  p_attendee_count int,
  p_message     text,
  p_duration_ms int default 0
)
returns table (
  id uuid,
  client_id uuid,
  guest_id uuid,
  name text,
  status public.rsvp_status,
  attendee_count int,
  message text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min_client_id_is_active boolean;
  v_min_guest_owner_match boolean;
  v_now timestamptz := now();
  v_row public.rsvps%rowtype;
begin
  -- 1) Anti-spam: terlalu cepat submit dari client = bot-like.
  --    Threshold 1500ms mengikuti konvensi lib/actions/security.ts.
  --    p_duration_ms = 0 artinya caller sengaja skip (dianggap tepercaya).
  if p_duration_ms > 0 and p_duration_ms < 1500 then
    raise exception 'submission_too_fast'
      using errcode = 'check_violation';
  end if;

  -- 2) Validasi: client harus active + not expired (mirror RLS public INSERT).
  select exists (
    select 1 from public.clients c
    where c.id = p_client_id
      and c.status = 'active'
      and c.expires_at > now()
  ) into v_min_client_id_is_active;
  if not v_min_client_id_is_active then
    raise exception 'client_inactive'
      using errcode = 'check_violation';
  end if;

  -- 3) Validasi: kalau guest_id diberikan, dia harus milik client yang sama.
  if p_guest_id is not null then
    select exists (
      select 1 from public.guests g
      where g.id = p_guest_id and g.client_id = p_client_id
    ) into v_min_guest_owner_match;
    if not v_min_guest_owner_match then
      raise exception 'guest_not_found'
        using errcode = 'check_violation';
    end if;
  end if;  -- 4) Single-statement atomic UPSERT untuk race-free behavior.
  --
  --    Pendekatan sebelumnya (SELECT-then-INSERT/UPDATE) rentan: dua
  --    submit simultan untuk (client_id, guest_id) yang sama bisa
  --    keduanya miss lookup, kemudian keduanya INSERT, sehingga satu
  --    akan kena partial unique index (23505 unique_violation).
  --
  --    `INSERT ... ON CONFLICT` atomik: jika ada row konflik, lakukan
  --    UPDATE di tempat. Tidak ada window antara baca dan tulis,
  --    sehingga invariant "1 RSVP per tamu" selalu dipatuhi.
  --
  --    PENTING: kita pakai `ON CONFLICT (col_list) WHERE ...`,
  --    BUKAN `ON CONFLICT ON CONSTRAINT <name>`. Alasannya:
  --    `rsvps_client_id_guest_id_unique_idx` dibuat via
  --    `CREATE UNIQUE INDEX` (partial index), bukan via `ADD CONSTRAINT
  --    UNIQUE`. Postgres `ON CONSTRAINT name` hanya menoleransi nama
  --    yang dideklarasikan sebagai constraint (CREATE TABLE / ALTER
  --    TABLE ADD CONSTRAINT), bukan nama index biasa. Bentuk
  --    `(col_list) WHERE partial_predicate` (PG 11+) cocok untuk
  --    partial unique index secara native.
  --
  --    `where guest_id is not null` di ON CONFLICT clause agar cocok
  --    dengan partial unique index di atas. Anonymous RSVPs (guest_id
  --    NULL) tidak terlibat di konfl path — mereka selalu INSERT baru.
  insert into public.rsvps (
    client_id, guest_id, name, status, attendee_count, message, updated_at
  ) values (
    p_client_id, p_guest_id, p_name, p_status, p_attendee_count, p_message, v_now
  )
  on conflict (client_id, guest_id) where guest_id is not null
  do update set
    name = excluded.name,
    status = excluded.status,
    attendee_count = excluded.attendee_count,
    message = excluded.message,
    updated_at = v_now
  returning * into v_row;

  -- 5) Return row lengkap.
  return query
    select
      v_row.id,
      v_row.client_id,
      v_row.guest_id,
      v_row.name,
      v_row.status,
      v_row.attendee_count,
      v_row.message,
      v_row.created_at,
      v_row.updated_at;
end;$$;

-- Grant untuk anon + authenticated — dipakai oleh Server Action yang
-- di-invoke dari browser maupun dari logged-in user.
grant execute on function public.upsert_rsvp(
  uuid, uuid, text, public.rsvp_status, int, text, int
) to anon, authenticated;

comment on function public.upsert_rsvp(
  uuid, uuid, text, public.rsvp_status, int, text, int
) is
  'TAHAP 6: Insert-or-update RSVP dari publik dalam satu transaksi. ' ||
  'SECURITY DEFINER (jalan sebagai owner function) memungkinkan logic tanpa ' ||
  'harus membuka policy SELECT/UPDATE publik untuk tabel rsvps — owner tetap ' ||
  'punya kontrol penuh via policy owner_all, publik hanya bisa INSERT via ' ||
  'fungsi ini. Anti-spam: p_duration_ms < 1500 ditolak (raise submission_too_fast).';
