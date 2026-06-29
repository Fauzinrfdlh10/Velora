-- ============================================================================
-- Velora — Initial Database Schema
-- ============================================================================
-- Multi-tenant digital wedding invitation platform (target market: Indonesia)
-- This migration is NOT idempotent — running it twice against the same
-- database will FAIL (enum types and tables already exist).
-- Apply ONLY via the Supabase CLI, which tracks applied migrations:
--   supabase db reset          -- drop + reapply from scratch (DESTRUCTIVE)
--   supabase migration up      -- apply pending migrations locally
--   supabase db push           -- sync remote DB with local migration history
-- Do NOT `psql -f` this file twice manually against the same database.
-- The handful of `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` clauses are
-- best-effort safety for partial re-runs only.
-- ============================================================================
--
-- Architecture overview
-- --------------------------------------------------------------------------
--  public.clients                -- tenant root (one row per wedding/couple)
--  ├── public.guests             -- per-client guest list (with personal slug
--  │                              --  for invite links like /i/<client>/<guest>)
--  ├── public.rsvps              -- per-client RSVP responses (optionally
--  │                              --  linked to a guest; supports anonymous
--  │                              --  RSVPs from invite page visitors)
--  ├── public.wishes             -- per-client wedding wishes / guestbook
--  ├── public.gallery_photos     -- per-client gallery (max 15 per package,
--  │                              --  enforced at application layer)
--  └── public.gifts              -- per-client digital envelopes:
--                                 --  sender name + optional amount + optional
--                                 --  transfer-proof image (proof is private)
--
--  public.clients.user_id     ->  auth.users.id    (1:1)
--  public.clients.bank_accounts (jsonb) -- needed so guests table feature
--                                 -- works: senders must know which account
--                                 -- to transfer to.
--
-- Notes
-- - UUID PKs everywhere (collision-safe + not enumerable).
-- - HARD DELETE only (per project decision). Child tables ON DELETE CASCADE
--   from clients so deleting a tenant cleans up everything.
-- - ALL foreign keys have explicit indexes (Postgres does NOT auto-index FKs;
--   missing them causes table scans on cascade-delete and join-heavy reads).
-- ============================================================================

-- ============================================================================
-- Extensions
-- ============================================================================
-- pgcrypto is enabled by default on Supabase; gen_random_uuid() is built-in.
-- We ensure it for parity with self-hosted Postgres.
create extension if not exists "pgcrypto";


-- ============================================================================
-- Enum types
-- ============================================================================
-- Use enums instead of free-text strings for status fields so the type system
-- rejects typos and reports the allowed values in IDEs.
create type public.invitation_status as enum ('draft', 'active', 'inactive', 'expired');
create type public.invitation_package as enum ('basic', 'standard', 'premium');
create type public.guest_invitation_status as enum ('pending', 'sent');
create type public.rsvp_status as enum ('attending', 'not_attending', 'maybe');
create type public.wish_status as enum ('visible', 'hidden');
create type public.gift_status as enum ('pending', 'verified', 'rejected');


-- ============================================================================
-- Table: public.clients (tenant root)
-- ============================================================================
-- One per authenticated user (1:1 via user_id). Created automatically by
-- the handle_new_user() trigger whenever a new row lands in auth.users.
--
-- NOTE on bank_accounts column:
--   This JSONB column is NOT in the original spec but is REQUIRED for the
--   gifts (amplop digital) feature to make sense — without a destination
--   account, senders don't know where to transfer. Format:
--     [{ "bank": "BCA", "account_name": "Andi", "account_number": "1234567890" }, ...]
--   Defaulted to an empty array so clients without a bank account still work.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,

  groom_name text not null check (groom_name <> ''),
  bride_name text not null check (bride_name <> ''),

  -- Slug is part of the public URL: /i/<slug> and /i/<slug>/<guest-slug>.
  -- Constrained to URL-safe characters. User can change this in onboarding;
  -- the trigger below creates a temp slug from the auth.users UUID.
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),

  -- Akad (civil/religious ceremony)
  akad_date timestamptz,
  akad_location text,
  akad_maps_url text,

  -- Resepsi (reception) — may be the same day as akad
  resepsi_date timestamptz,
  resepsi_location text,
  resepsi_maps_url text,

  -- Customization
  theme text not null default 'classic',
  package public.invitation_package not null default 'basic',
  status public.invitation_status not null default 'draft',

  -- Membership/subscription end (1 year from signup). Used in RLS policies
  -- alongside status='active' as the "is this invitation currently viewable"
  -- predicate for public invitation-page visitors.
  expires_at timestamptz not null default (now() + interval '1 year'),

  -- Bank accounts for the digital-envelope feature (see note above)
  bank_accounts jsonb not null default '[]'::jsonb,

  -- Audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for clients --------------------------------------------------
-- Unique indexes below back the unique constraints (Postgres auto-creates
-- them on `unique` / `primary key`, but we list them explicitly for clarity).
create unique index clients_user_id_idx on public.clients (user_id);
create unique index clients_slug_idx on public.clients (slug);
-- Common dashboard query: list active invitations by expiry for moderation.
create index clients_status_expires_at_idx on public.clients (status, expires_at);


-- ============================================================================
-- Table: public.guests
-- ============================================================================
-- Each row is one invited guest. The personal link '/i/<client-slug>/<g-slug>'
-- is constructed at app level from client_id + guests.slug.
--   - slug is NOT globally unique (different clients can use the same slug).
--     We enforce per-client uniqueness via composite (client_id, slug).
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null check (name <> ''),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  invitation_status public.guest_invitation_status not null default 'pending',
  created_at timestamptz not null default now(),

  -- Composite uniqueness: slug is unique only within a single client's guest list.
  unique (client_id, slug)
);

create index guests_client_id_idx on public.guests (client_id);


-- ============================================================================
-- Table: public.rsvps
-- ============================================================================
-- RSVP responses. guest_id is NULLABLE so anonymous invite-page visitors
-- (no personal link) can still RSVP — name in that case comes from the form.
-- `name` is captured at submission time (not joined from guests.name) so we
-- keep a true historical record even if the guest row is later edited.
create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  guest_id uuid references public.guests(id) on delete set null,
  name text not null check (name <> ''),
  status public.rsvp_status not null,
  attendee_count int not null default 1 check (attendee_count >= 0 and attendee_count <= 10),
  message text,
  created_at timestamptz not null default now()
);

create index rsvps_client_id_idx on public.rsvps (client_id);
create index rsvps_guest_id_idx on public.rsvps (guest_id);
-- Common dashboard query: recent RSVPs per client.
create index rsvps_client_id_created_at_idx on public.rsvps (client_id, created_at desc);
-- Optional: keep one RSVP per guest (typical UX: send link, guest RSVPs once,
-- re-opening the page shows the previous answer). We don't enforce here
-- because a couple may want to overwrite; this is a documented choice.


-- ============================================================================
-- Table: public.wishes
-- ============================================================================
-- Wedding wishes / guestbook entries. Owners can soft-hide negative entries
-- via the wish_status enum (visible | hidden) without losing the row.
create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null check (name <> ''),
  -- Length cap (1..1000) is the FIRST spam-mitigation line of defense.
  -- App layer should add captcha / rate limit (see README §Risks).
  message text not null check (length(message) between 1 and 1000),
  status public.wish_status not null default 'visible',
  created_at timestamptz not null default now()
);

create index wishes_client_id_idx on public.wishes (client_id);
-- Common queries: "show me visible wishes for this client, newest first".
create index wishes_client_id_status_created_at_idx
  on public.wishes (client_id, status, created_at desc);


-- ============================================================================
-- Table: public.gallery_photos
-- ============================================================================
-- Gallery images. `url` is a Supabase Storage URL (bucket 'gallery').
-- TODO(mvp+): enforce max 15 photos per client. For now this is at the
-- application layer for better UX (we can disable the "add photo" button
-- after the limit and show a friendly message).
--   Reference trigger pattern if we move to DB enforcement later:
--     check ( (select count(*) from public.gallery_photos
--             where client_id = new.client_id) < 15 )
create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index gallery_photos_client_id_idx on public.gallery_photos (client_id);
-- Display order on the public invite page.
create index gallery_photos_client_id_position_idx
  on public.gallery_photos (client_id, position);


-- ============================================================================
-- Table: public.gifts
-- ============================================================================
-- Digital envelopes. `amount` is optional (sender may omit). `proof_url`
-- is optional too — if absent, the row acts as a "promise to send" record.
-- proof_url is a Supabase Storage URL (bucket 'gifts', private).
-- Both `amount` and `proof_url` are sensitive — RLS keeps the whole row
-- owner-only on SELECT.
create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade not null,
  sender_name text not null check (sender_name <> ''),
  amount numeric(15, 2),
  proof_url text,
  status public.gift_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index gifts_client_id_idx on public.gifts (client_id);
-- Common dashboard query: pending transfers to verify.
create index gifts_client_id_status_idx on public.gifts (client_id, status);


-- ============================================================================
-- Trigger function: handle_new_user()
-- ============================================================================
-- After a row is inserted into auth.users (during signup), create the
-- corresponding clients row automatically. SECURITY DEFINER so it bypasses
-- RLS — there is no public INSERT policy on public.clients.
--
-- The initial slug is derived from the user's UUID (collision-safe; no need
-- to guess names). User can change it in the onboarding flow.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  initial_slug text;
begin
  -- 12 hex chars from the user's UUID, prefixed with 'user-'.
  -- 12 hex = ~2^48: collisions are astronomically rare at any reasonable
  -- user count. If a collision ever occurs (1 : 2^48) the unique constraint
  -- will reject, signup will fail — user retries with another account.
  initial_slug := 'user-' || substr(replace(new.id::text, '-', ''), 1, 12);

  insert into public.clients (user_id, slug, expires_at)
  values (
    new.id,
    initial_slug,
    now() + interval '1 year'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- Trigger function: set_updated_at()
-- ============================================================================
-- Auto-bump public.clients.updated_at on every UPDATE. Reused by other
-- tables if/when we add updated_at columns.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Two-tier access model:
--
--   1) OWNER (authenticated, owns the client via clients.user_id = auth.uid()):
--        - clients: full CRUD on the row keyed by user_id
--        - guests/rsvps/wishes/gallery_photos/gifts: full CRUD over rows
--          whose client_id belongs to the owner
--      Implementation: a per-table policy against EXISTS (subquery to
--      public.clients). EXPLAIN-friendly since clients.user_id has a unique
--      index. At larger scale we should migrate these to JWT custom claims
--      (app_metadata -> 'client_id') for O(1) policy evaluation — see README.
--
--   2) PUBLIC (anon, unauthenticated):
--        - clients: SELECT only when status='active' AND expires_at > now().
--                     No public INSERT (trigger is the only writer).
--        - guests: SELECT only for active+not-expired invitations. No public
--                     INSERT.
--        - rsvps: INSERT only for active+not-expired invitations, and only
--                     with a valid guest_id (if provided). No public SELECT
--                     (responses are private to owner).
--        - wishes: INSERT for active+not-expired; SELECT visible only for
--                     active+not-expired.
--        - gallery_photos: SELECT only for active+not-expired.
--        - gifts: INSERT for active+not-expired (proof/image uploads are
--                     handled app-side via Service Role — see Storage section
--                     below). No public SELECT (private financial data).
--
-- Across all policies: the "active invite" predicate for public reads is
--     status = 'active' AND expires_at > now()
-- Encoded inline in each policy for clarity. (A SECURITY DEFINER helper
-- function would reduce duplication but adds indirection — leave for later.)
--
-- PUBLIC INSERT SCOPE DECISION (MVP — project decision):
-- The three public INSERT policies (rsvps / wishes / gifts) are written as
-- `to anon, authenticated`, meaning not just truly anonymous invite-page
-- visitors but also ANY logged-in Supabase user can submit via REST. This
-- is a deliberate MVP trade-off (matches the UX of invitees occasionally
-- signing in via Supabase Auth on a shared device, or app bot-testing).
-- To strictly enforce the original "publik (tanpa login)" spec instead,
-- change `to anon, authenticated` to `to anon` in all three and route any
-- authenticated-user inserts through a Server Action using the Service
-- Role key. This trade-off is also recorded in README §"Risks & mitigations".
-- ============================================================================

alter table public.clients enable row level security;

-- clients: owner -----------------------------------------------------------
-- Owner: full access (SELECT/INSERT/UPDATE/DELETE) on the row keyed by
-- user_id. INSERT happens ONLY through the handle_new_user() trigger — there
-- is no public INSERT policy on clients.
create policy "clients_owner_all"
  on public.clients for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- clients: public ----------------------------------------------------------
-- Public SELECT only for active and not-expired invitations.
create policy "clients_select_public"
  on public.clients for select
  to anon
  using (status = 'active' and expires_at > now());


-- guests: owner ------------------------------------------------------------
alter table public.guests enable row level security;

-- Owner: full access (SELECT/INSERT/UPDATE/DELETE) on rows whose client_id
-- maps to a clients row owned by them. Owns all 4 ops in a single policy to
-- keep one source of truth for the ownership check.
create policy "guests_owner_all"
  on public.guests for all
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = guests.client_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = guests.client_id and c.user_id = auth.uid()
    )
  );

-- guests: public -----------------------------------------------------------
-- Lookup guest by slug for personal invite links. Only for active invitations.
create policy "guests_select_public"
  on public.guests for select
  to anon
  using (
    exists (
      select 1 from public.clients c
      where c.id = guests.client_id
        and c.status = 'active'
        and c.expires_at > now()
    )
  );


-- rsvps: owner -------------------------------------------------------------
alter table public.rsvps enable row level security;

-- Owner: full access (SELECT/INSERT/UPDATE/DELETE) on rows whose client_id
-- maps to a clients row owned by them. Lets the couple record RSVPs manually
-- from the dashboard (e.g. legacy paper RSVPs) in addition to public inserts.
create policy "rsvps_owner_all"
  on public.rsvps for all
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = rsvps.client_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = rsvps.client_id and c.user_id = auth.uid()
    )
  );

-- rsvps: public (insert only) ---------------------------------------------
-- Allows anon to RSVP from the invite page, optionally with a guest_id.
create policy "rsvps_insert_public"
  on public.rsvps for insert
  to anon, authenticated
  with check (
    -- Target invitation must be active and not expired.
    exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.status = 'active'
        and c.expires_at > now()
    )
    -- If guest_id is provided, it must belong to the same client.
    and (
      guest_id is null
      or exists (
        select 1 from public.guests g
        where g.id = rsvps.guest_id and g.client_id = rsvps.client_id
      )
    )
  );

-- No public SELECT: RSVPs are private to the owner.


-- wishes: owner ------------------------------------------------------------
alter table public.wishes enable row level security;

-- Owner: full access (SELECT/INSERT/UPDATE/DELETE) on rows whose client_id
-- maps to a clients row owned by them. Lets the owner post wishes on behalf
-- of absent friends and flip status to 'hidden' for moderation.
create policy "wishes_owner_all"
  on public.wishes for all
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = wishes.client_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = wishes.client_id and c.user_id = auth.uid()
    )
  );

-- wishes: public -----------------------------------------------------------
create policy "wishes_insert_public"
  on public.wishes for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.status = 'active'
        and c.expires_at > now()
    )
  );

create policy "wishes_select_public"
  on public.wishes for select
  to anon
  using (
    status = 'visible'
    and exists (
      select 1 from public.clients c
      where c.id = wishes.client_id
        and c.status = 'active'
        and c.expires_at > now()
    )
  );


-- gallery_photos: owner ----------------------------------------------------
alter table public.gallery_photos enable row level security;

-- Owner: full access (SELECT/INSERT/UPDATE/DELETE) on rows whose client_id
-- maps to a clients row owned by them.
create policy "gallery_photos_owner_all"
  on public.gallery_photos for all
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = gallery_photos.client_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = gallery_photos.client_id and c.user_id = auth.uid()
    )
  );

-- gallery_photos: public ---------------------------------------------------
create policy "gallery_select_public"
  on public.gallery_photos for select
  to anon
  using (
    exists (
      select 1 from public.clients c
      where c.id = gallery_photos.client_id
        and c.status = 'active'
        and c.expires_at > now()
    )
  );


-- gifts: owner -------------------------------------------------------------
alter table public.gifts enable row level security;

-- Owner: full access (SELECT/INSERT/UPDATE/DELETE) on rows whose client_id
-- maps to a clients row owned by them. Lets the owner flip gift status
-- (pending -> verified / rejected) and record gifts observed via bank
-- statement that lack a sender-uploaded proof.
create policy "gifts_owner_all"
  on public.gifts for all
  to authenticated
  using (
    exists (
      select 1 from public.clients c
      where c.id = gifts.client_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = gifts.client_id and c.user_id = auth.uid()
    )
  );

-- gifts: public (insert only) ----------------------------------------------
-- IMPORTANT: For real usage, gift proof IMAGES are uploaded through a
-- Next.js API route / Server Action using the Service Role key, NOT
-- directly from the browser. The migration below does NOT grant anon write
-- to storage; the application code must handle the file upload, then insert
-- the gifts row (which this policy permits). See README §Storage security.
create policy "gifts_insert_public"
  on public.gifts for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.status = 'active'
        and c.expires_at > now()
    )
  );

-- No public SELECT: gift rows are private to the owner.


-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
-- Two buckets:
--   gallery — PUBLIC read; owner manages objects. Photos show on invite page.
--   gifts   — PRIVATE (only owner can list/read). Server actions / API routes
--             with the Service Role key are the only sanctioned writers.
--
-- Path convention used by the policies below:
--   gallery: <client_id>/<random-filename>
--   gifts:   <client_id>/<random-filename>
-- The folder-level checkownership via storage.foldername(name)[1] lets us
-- enforce "this object belongs to a client owned by you" without parsing.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('gifts', 'gifts', false)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- storage.objects policies
-- ---------------------------------------------------------------------------
-- MVP-GRADE PERFORMANCE NOTE: Each ownership check below executes
--   (storage.foldername(name))[1] in (select id from public.clients where user_id = auth.uid())
-- per storage object. This is fast at MVP scale (clients.user_id is unique-
-- indexed) but creates a per-object subquery as object counts grow. To scale,
-- migrate to custom JWT claims (set client_id in auth.users.app_metadata
-- inside the handle_new_user trigger, then change the policy to
--     (storage.foldername(name))[1] = auth.jwt() -> 'app_metadata' ->> 'client_id'
-- for O(1) checks). See README §"Risks & mitigations".
-- ---------------------------------------------------------------------------

-- gallery: anon SELECT
create policy "gallery_storage_select_public"
  on storage.objects for select
  to anon
  using (bucket_id = 'gallery');

-- gallery: owner full access (folder-scoped to their own client_id)
create policy "gallery_storage_owner_all"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] in (
      select id::text from public.clients where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] in (
      select id::text from public.clients where user_id = auth.uid()
    )
  );

-- gifts: owner-only SELECT
create policy "gifts_storage_select_owner"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'gifts'
    and (storage.foldername(name))[1] in (
      select id::text from public.clients where user_id = auth.uid()
    )
  );

-- gifts: owner full access — and this is where Server Actions / API
-- routes using the Service Role key write on behalf of public senders.
create policy "gifts_storage_owner_modify"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'gifts'
    and (storage.foldername(name))[1] in (
      select id::text from public.clients where user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'gifts'
    and (storage.foldername(name))[1] in (
      select id::text from public.clients where user_id = auth.uid()
    )
  );

-- IMPORTANT: ANON does NOT get INSERT/UPDATE/DELETE on storage.objects.
-- All anonymous contributions must go through the Next.js app's Server
-- Action / API route, which authenticates with the Service Role key.
-- (See README §"Risks & mitigations".)
