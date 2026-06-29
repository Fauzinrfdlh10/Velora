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

| Command              | Deskripsi                            |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Jalankan dev server di localhost:3000|
| `npm run build`      | Build production                    |
| `npm run start`      | Jalankan build production            |
| `npm run lint`       | Jalankan ESLint                      |
| `npm run format`     | Format code dengan Prettier          |
| `npm run format:check` | Cek format tanpa mengubah file     |

## Roadmap

Tahap development berikutnya (akan diimplementasikan di prompt terpisah):

1. Setup database schema & migrations
2. Autentikasi multi-tenant (Supabase Auth)
3. Dashboard klien
4. Halaman undangan publik (RSVP, galeri, amplop digital, wedding wish)
5. Deployment ke Vercel
