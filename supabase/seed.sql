-- ============================================================================
-- Velora — Local Database Seed Data
-- ============================================================================
-- File ini digunakan oleh Supabase CLI secara otomatis saat:
--   supabase db reset
--   supabase start
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Seed: Auth Users
-- ----------------------------------------------------------------------------

-- User 1: Budi & Siti (Active premium client, slug: budi-siti)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token
) VALUES (
  'a57a165b-bf42-4f36-932f-48d8a7c2901c',
  '00000000-0000-0000-0000-000000000000',
  'budi@velora.id',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  'authenticated',
  'authenticated',
  ''
) ON CONFLICT DO NOTHING;

-- User 2: Danang & Rara (Inactive/Draft basic client, slug: danang-rara)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token
) VALUES (
  'b68b276c-c053-4f47-a43f-59e9b8d3a12d',
  '00000000-0000-0000-0000-000000000000',
  'danang@velora.id',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  'authenticated',
  'authenticated',
  ''
) ON CONFLICT DO NOTHING;

-- User 3: Reza & Lisa (Expired premium client, slug: reza-lisa)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token
) VALUES (
  'c79c387d-d064-4e58-b54e-60f0c9e4b23e',
  '00000000-0000-0000-0000-000000000000',
  'reza@velora.id',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  'authenticated',
  'authenticated',
  ''
) ON CONFLICT DO NOTHING;


-- ----------------------------------------------------------------------------
-- 2. Seed: Update Clients (Trigger automatically generated these rows, now we enrich them)
-- ----------------------------------------------------------------------------

-- Update Client 1: Budi & Siti (Active, Sana theme, Premium)
UPDATE public.clients
SET
  groom_name = 'Budi Santoso',
  bride_name = 'Siti Aminah',
  slug = 'budi-siti',
  akad_date = now() + interval '45 days',
  akad_location = 'Masjid Agung Al-Azhar, Kebayoran Baru, Jakarta Selatan',
  akad_maps_url = 'https://maps.google.com/?q=-6.2346,106.7972',
  resepsi_date = now() + interval '45 days' + interval '2 hours',
  resepsi_location = 'Graha Elnusa, Cilandak, Jakarta Selatan',
  resepsi_maps_url = 'https://maps.google.com/?q=-6.2929,106.8118',
  theme = 'sana',
  package = 'premium',
  status = 'active',
  expires_at = now() + interval '1 year',
  bank_accounts = '[
    {
      "bank": "BCA",
      "account_name": "Budi Santoso",
      "account_number": "1234567890",
      "notes": "Kado Anda sangat kami hargai"
    },
    {
      "bank": "Bank Mandiri",
      "account_name": "Siti Aminah",
      "account_number": "9876543210"
    }
  ]'::jsonb
WHERE user_id = 'a57a165b-bf42-4f36-932f-48d8a7c2901c';

-- Update Client 2: Danang & Rara (Inactive)
UPDATE public.clients
SET
  groom_name = 'Danang Joyo',
  bride_name = 'Rara Ayu',
  slug = 'danang-rara',
  theme = 'sana',
  package = 'basic',
  status = 'inactive'
WHERE user_id = 'b68b276c-c053-4f47-a43f-59e9b8d3a12d';

-- Update Client 3: Reza & Lisa (Expired)
UPDATE public.clients
SET
  groom_name = 'Reza Rahardian',
  bride_name = 'Lisa Blackpink',
  slug = 'reza-lisa',
  theme = 'sana',
  package = 'premium',
  status = 'active',
  expires_at = now() - interval '10 days' -- Expired
WHERE user_id = 'c79c387d-d064-4e58-b54e-60f0c9e4b23e';


-- ----------------------------------------------------------------------------
-- 3. Seed: Guest List (For Client 1: Budi & Siti)
-- ----------------------------------------------------------------------------
INSERT INTO public.guests (id, client_id, name, slug, invitation_status)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    'Adi Purnama',
    'adi-purnama',
    'sent'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    'Siti Khadijah',
    'siti-khadijah',
    'pending'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    'Bapak Presiden',
    'bapak-presiden',
    'sent'
  )
ON CONFLICT (client_id, slug) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 4. Seed: Gallery Photos (For Client 1: Budi & Siti)
-- ----------------------------------------------------------------------------
INSERT INTO public.gallery_photos (client_id, url, position)
VALUES
  (
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    'https://picsum.photos/seed/velora-sana-1/800/800',
    0
  ),
  (
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    'https://picsum.photos/seed/velora-sana-2/800/800',
    1
  ),
  (
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    'https://picsum.photos/seed/velora-sana-3/800/800',
    2
  ),
  (
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    'https://picsum.photos/seed/velora-sana-4/800/800',
    3
  ),
  (
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    'https://picsum.photos/seed/velora-sana-5/800/800',
    4
  ),
  (
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    'https://picsum.photos/seed/velora-sana-6/800/800',
    5
  );


-- ----------------------------------------------------------------------------
-- 5. Seed: Wishes (For Client 1: Budi & Siti)
-- ----------------------------------------------------------------------------
INSERT INTO public.wishes (client_id, name, message, status, created_at)
VALUES
  (
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    'Adi Purnama',
    'Selamat menempuh hidup baru Budi & Siti! Semoga samawa selalu dunia akhirat.',
    'visible',
    now() - interval '2 hours'
  ),
  (
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    'Siti Khadijah',
    'Semoga menjadi keluarga yang sakinah, mawaddah, warahmah serta penuh limpahan berkat dan kebahagiaan.',
    'visible',
    now() - interval '1 hour'
  ),
  (
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    'Eko Prasetyo',
    'Selamat ya Budi & Siti! Maaf belum bisa hadir langsung, tapi doa terbaik dari kami sekeluarga menyertai kalian berdua.',
    'visible',
    now() - interval '30 minutes'
  );


-- ----------------------------------------------------------------------------
-- 6. Seed: RSVPs (For Client 1: Budi & Siti)
-- ----------------------------------------------------------------------------
INSERT INTO public.rsvps (client_id, guest_id, name, status, attendee_count, message)
VALUES
  (
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    '11111111-1111-1111-1111-111111111111',
    'Adi Purnama',
    'attending',
    2,
    'Akan hadir bersama istri!'
  ),
  (
    (SELECT id FROM public.clients WHERE slug = 'budi-siti'),
    '22222222-2222-2222-2222-222222222222',
    'Siti Khadijah',
    'maybe',
    1,
    'InsyaAllah diusahakan hadir.'
  );
