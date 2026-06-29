# 🎉 Velora

Platform undangan pernikahan digital multi-tenant untuk pasar Indonesia.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, TypeScript)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/)
- **Backend**: [Supabase](https://supabase.com/) (Auth, Postgres, Storage)
- **Deployment**: [Vercel](https://vercel.com/)

## Prasyarat

- [Node.js](https://nodejs.org/) v18+
- npm (termasuk dalam Node.js)
- Akun [Supabase](https://supabase.com/) (untuk database & auth)

## Cara Menjalankan

### 1. Clone repository

```bash
git clone <repo-url> velora
cd velora
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` dan isi kredensial Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-kamu>
```

> Kredensial bisa didapatkan dari dashboard Supabase → Settings → Data API.

### 4. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

Halaman root akan menampilkan status setup: apakah Next.js, Tailwind, dan
koneksi Supabase berjalan dengan benar.

## Struktur Project

```
velora/
├── app/                    # Next.js App Router
│   ├── (public)/           # Halaman publik (nanti: undangan pernikahan)
│   ├── dashboard/          # Dashboard klien (nanti)
│   ├── api/                # API route handlers
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Halaman root (status setup)
├── components/
│   └── ui/                 # Komponen UI reusable
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Supabase client (browser)
│   │   └── server.ts       # Supabase client (server)
│   └── utils.ts            # Utilitas umum
├── types/                  # TypeScript type definitions
├── public/                 # Static assets
├── .env.local.example      # Template environment variables
├── .prettierrc             # Prettier config
├── tailwind.config.ts      # Tailwind CSS config
├── next.config.ts          # Next.js config
└── package.json            # Dependencies & scripts
```

## Scripts

| Command                | Deskripsi                             |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Jalankan dev server di localhost:3000 |
| `npm run build`        | Build production                      |
| `npm run start`        | Jalankan build production             |
| `npm run lint`         | Jalankan ESLint                       |
| `npm run format`       | Format code dengan Prettier           |
| `npm run format:check` | Cek format tanpa mengubah file        |

## Database Architecture

Skema awal ada di `supabase/migrations/20260629000000_init_velora_schema.sql`
dan tipe TypeScript-nya di `types/database.ts`.

### Entitas & relasi

```
auth.users (Supabase managed)
   └── 1 user_id : 1 public.clients    (auto-created via trigger)
                       ├── public.guests
                       ├── public.rsvps        (FK opsional ke guests)
                       ├── public.wishes
                       ├── public.gallery_photos
                       └── public.gifts
```

- `clients` adalah tenant root (1 baris per pasangan / user).
- 5 tabel anak seluruhnya `ON DELETE CASCADE` ke `clients` — menghapus klien
  akan membersihkan semua data terkait (strategi hard-delete per keputusan
  project).
- Kolom `clients.id` (UUID) dipakai sebagai folder prefix di Storage
  (`gallery/<client_id>/<file>`, `gifts/<client_id>/<file>`) sehingga policy
  storage bisa enforce ownership via path.

Detail kolom dan constraint bisa dibaca di file migration; semua tabel punya
UUID primary key, foreign key di-index secara eksplisit (Postgres tidak
auto-index FK), dan check constraint dasar (`slug ~ '^[a-z0-9-]+$'`,
`name <> ''`, panjang pesan `wishes` 1–1000 karakter, dst).

### Row Level Security (RLS) — ringkasan

Semua tabel `enable row level security`. Dua tier akses:

| Tier                                          | Akses                                                                                                                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner** (authenticated, memiliki `clients`) | SELECT/INSERT/UPDATE/DELETE penuh pada baris miliknya. Dicek via `EXISTS` ke `public.clients` (di-index).                                                                                                                       |
| **Public** (anon)                             | SELECT hanya pada baris dari undangan `status='active'` dan `expires_at > now()`. INSERT hanya ke `rsvps`, `wishes`, `gifts` (untuk undangan yang aktif). Publik tidak bisa SELECT `rsvps` dan `gifts` (data pribadi/keuangan). |

`public.clients` INSERT dilakukan **hanya** lewat trigger `handle_new_user()`
(`SECURITY DEFINER`, bypass RLS) saat ada row baru di `auth.users`. Slug
awal di-generate dari UUID user (collision-safe) dan user bebas mengubahnya
di onboarding.

### Storage

| Bucket    | Akses publik                | Tulisan dari                                     | Bacaan dari             |
| --------- | --------------------------- | ------------------------------------------------ | ----------------------- |
| `gallery` | Public SELECT               | Owner (dashboard) + Server Action (Service Role) | Anon (halaman undangan) |
| `gifts`   | Private (owner-only SELECT) | Owner atau API route Service Role                | Owner (dashboard)       |

Path convention: `<client_id>/<random-filename>`. Folder prefix dicek di
RLS `storage.objects` lewat `storage.foldername(name)[1]`.

### Risiko & mitigasi

| Risiko                                                                 | Status saat ini                                               | Mitigasi yang disarankan                                                                                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spam INSERT (rsvps/wishes/gifts) — bot bisa submit ribuan row via REST | RLS hanya validasi target aktif, tidak ada rate limit         | Tangani semua submission publik lewat Next.js API route / Server Action dengan **rate limit** (Upstash Redis) dan **captcha** (Turnstile/reCAPTCHA).               |
| Hard-delete = tidak ada undo                                           | `ON DELETE CASCADE` langsung                                  | Backup harian Supabase Point-in-Time Recovery (perlu plan postgres berbayar). Bisa diubah ke soft-delete nanti dengan migration terpisah.                          |
| Slug di `clients` bisa di-enumerate untuk view policy                  | Policy publik SELECT active clients memang mengizinkan ini    | Trade-off sadar — URL publik memang predictability-based. Mitigasi tambahan: monitor traffic + rate-limit di Edge layer.                                           |
| `EXISTS` di setiap policy baca baris anak → overhead di scale besar    | `clients.user_id` sudah unique-index; cepat untuk saat ini    | Migrasi ke **Custom JWT Claims** (simpan `client_id` di `auth.users.app_metadata` saat trigger, lalu policy pakai `auth.jwt() -> 'app_metadata' ->> 'client_id'`). |
| Storage `gallery` public — URL bisa dishare                            | Default, agar halaman undangan bisa loadtanpa auth            | Jika perlu: pakai signed URL expiry, atau nama file random panjang (sudah kami rekomendasikan di path convention).                                                 |
| `gifts` proof image bersifat finansial                                 | Bucket `gifts` PRIVATE, hanya owner bisa baca.                | ✅ Sudah aman. Pastikan Server Action yang menerima upload pakai **Service Role** + validasi ukuran/tipe file + rate limit.                                        |
| Postgres tidak auto-index FK                                           | ✅ Sudah di-handle — semua FK punya `CREATE INDEX` eksplisit. | —                                                                                                                                                                  |
| `wishes.message` bebas diisi publik                                    | Panjang dibatasi 1–1000 karakter                              | Tambahkan filter kata-kata kotor di app layer (atau gunakan moderation function di Postgres).                                                                      |

| `rsvps/wishes/gifts` public INSERT juga mengizinkan logged-in Supabase user (bukan hanya anon) | ✅ **Project decision (MVP)**: keep `to anon, authenticated`. Siapa pun user Supabase yang login bisa insert ke undangan aktif via REST API. | Untuk strict compliance ke spec asli ("publik, tanpa login"), ubah `to anon, authenticated` → `to anon` di tiga policy tersebut, dan handle insert user terautentikasi via Server Action + Service Role. Lihat juga blok komentar §RLS di file migration. |

### Setup migration

```bash
# Opsional: install & login Supabase CLI
brew install supabase/tap/supabase                          # macOS
# atau lihat https://supabase.com/docs/guides/cli

supabase login

# Pertama kali di project ini (membuat supabase/config.toml):
supabase init

supabase link --project-ref <ref-project-kamu>

# Terapkan migration ke database remote
supabase db push

# Atau untuk local dev:
supabase start
supabase migration up
```

> `supabase init` hanya dibutuhkan satu kali per repo untuk membuat
> `supabase/config.toml`. Setelah config ada, langsung pakai
> `supabase link` + `supabase db push` di komputer lain.

### Regenerate tipe dari schema aktif

Saat schema sudah terkoneksi dengan project Supabase asli, regenerate tipe
dengan:

```bash
supabase gen types typescript --linked > types/database.ts
```

File hasil regenerate kompatibel dengan struktur saat ini (semua tabel
ada di `Database['public']['Tables']`, enum di `Database['public']['Enums']`).

## Roadmap

Tahap development berikutnya (akan diimplementasikan di prompt terpisah):

1. ~~Setup database schema & migrations~~ ✅ Selesai untuk MVP.
2. Autentikasi multi-tenant (Supabase Auth) — onboarding flow, update slug.
3. Dashboard klien — manajemen data, verifikasi gifts, moderasi wishes.
4. Halaman undangan publik (RSVP, galeri, amplop digital, wedding wish).
5. Rate limit + captcha di API route publik (mitigasi spam).
6. Deployment ke Vercel.
