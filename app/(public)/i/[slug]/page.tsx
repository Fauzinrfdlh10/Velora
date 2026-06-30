import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

/**
 * Halaman undangan publik.
 *
 * Tujuan tahap ini (Tahap 4):
 *   - Routing berdasarkan [slug] (didapati dari subdomain via middleware
 *     rewrite ATAU dari URL path langsung di dev/test).
 *   - Fetch data klien via RPC `get_public_client_by_slug` (SECURITY
 *     DEFINER) sehingga aplikasi dapat membedakan 404 vs inactive/expired
 *     tanpa Service Role key di app layer.
 *   - Sapa tamu personal via `?to=Firna` (case-insensitive name match ke
 *     tabel `guests`, fallback ke raw input).
 *   - Render plain HTML dengan Tailwind classes minimal — placeholder
 *     untuk theme/tema final di prompt berikutnya.
 *
 * Strategi keamanan:
 *   - Baca data via anon key + RPC dengan permission grant untuk `anon`.
 *     RPC hanya me-return kolom publik (lihat migration).
 *   - RSC ini TIDAK me-return raw row ke client — hanya kolom publik
 *     yang terpilih untuk rendering.
 *   - Auth check tidak dilakukan di sini karena halaman publik memang
 *     boleh diakses tanpa login. Middleware tidak mengarahkan /i/* ke
 *     login karena tidak diperlukan.
 *
 * Strategi performa:
 *   - Server component (RSC) secara default = zero JS bundle untuk
 *     undangan UI. First paint cepat di 3G.
 *   - Tailwind di-purge otomatis oleh Next.js — class yang dipakai
 *     saja yang dikirim.
 *   - `cookies()` tidak dipanggil di sini (tidak perlu), sehingga Next.js
 *     memberi perlakuan dynamic render per request — tidak ada caching
 *     static yang keliru.
 */

type Params = { slug: string };
type SearchParams = { to?: string };

/** Shape dari kolom publik yang dikembalikan RPC. */
type PublicClient = {
  id: string;
  slug: string;
  groom_name: string;
  bride_name: string;
  akad_date: string | null;
  akad_location: string | null;
  akad_maps_url: string | null;
  resepsi_date: string | null;
  resepsi_location: string | null;
  resepsi_maps_url: string | null;
  theme: string;
  status: "draft" | "active" | "inactive" | "expired";
  expires_at: string;
};

/* ──────────────── generateMetadata ──────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const client = await fetchPublicClient(slug);

  if (!client || client.status !== "active") {
    return {
      title: "Undangan tidak ditemukan — Velora",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${client.groom_name} & ${client.bride_name} — Velora`,
    description: `Undangan pernikahan ${client.groom_name} & ${client.bride_name}`,
  };
}

/* ──────────────── Page ──────────────── */

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, { to }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();

  // RPC SECURITY DEFINER dengan permission anon. Hanya kolom publik yang
  // dikembalikan (lihat migration). Tidak ada Service Role key di app.
  const { data, error } = await supabase.rpc("get_public_client_by_slug", {
    p_slug: slug,
  });

  if (error || !data || data.length === 0) {
    notFound();
  }

  const client = data[0] as PublicClient;

  // Cek status lengkap. Anon RLS policy hanya expose active+not-expired
  // sehingga tanpa RPC kita tidak akan sampai di sini untuk kasus lain.
  const isExpired =
    client.status === "expired" ||
    new Date(client.expires_at).getTime() < Date.now();

  if (client.status !== "active" || isExpired) {
    return <UnavailableView client={client} />;
  }

  // Sapa tamu via ?to=<name>. Lookup case-insensitive name match ke
  // tabel guests. Jika tidak ditemukan, pakai raw input.
  let guestName: string | null = null;
  const candidate = typeof to === "string" ? to.trim() : "";
  if (candidate) {
    const { data: matchedGuest } = await supabase
      .from("guests")
      .select("name")
      .eq("client_id", client.id)
      .ilike("name", candidate)
      .limit(1)
      .maybeSingle();
    guestName = matchedGuest?.name ?? candidate;
  }

  return <ActiveInvitationView client={client} guestName={guestName} />;
}

/* ──────────────── Helpers ──────────────── */

/**
 * Fetch klien publik by slug.
 *
 * Dibungkus dengan `react#cache()` agar pemanggilan `generateMetadata` dan
 * Page component dalam satu request yang sama menggunakan hasil yang sama
 * (dedupe intra-request). Tanpa ini, RPC di Supabase dipanggil 2x per page
 * view.
 */
const fetchPublicClient = cache(
  async (slug: string): Promise<PublicClient | null> => {
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc("get_public_client_by_slug", {
        p_slug: slug,
      });
      if (!data || data.length === 0) return null;
      return data[0] as PublicClient;
    } catch {
      return null;
    }
  },
);

/* ──────────────── Views ──────────────── */

function ActiveInvitationView({
  client,
  guestName,
}: {
  client: PublicClient;
  guestName: string | null;
}) {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-12 sm:px-6">
      <article className="mx-auto max-w-2xl space-y-12 text-neutral-800">
        {guestName ? (
          <p className="text-center text-xs font-medium uppercase tracking-widest text-neutral-500">
            Kepada Yth. {guestName}
          </p>
        ) : null}

        <header className="text-center">
          <p className="text-xs uppercase tracking-widest text-neutral-400">
            The Wedding of
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            {client.groom_name}
            <span className="mx-2 text-neutral-300">&amp;</span>
            {client.bride_name}
          </h1>
        </header>

        {client.akad_date ? (
          <EventSection
            title="Akad"
            date={client.akad_date}
            location={client.akad_location}
            mapsUrl={client.akad_maps_url}
          />
        ) : null}

        {client.resepsi_date ? (
          <EventSection
            title="Resepsi"
            date={client.resepsi_date}
            location={client.resepsi_location}
            mapsUrl={client.resepsi_maps_url}
          />
        ) : null}

        <footer className="pt-6 text-center text-xs text-neutral-400">
          Powered by Velora
        </footer>
      </article>
    </main>
  );
}

function EventSection({
  title,
  date,
  location,
  mapsUrl,
}: {
  title: string;
  date: string;
  location: string | null;
  mapsUrl: string | null;
}) {
  return (
    <section className="space-y-1.5 text-center">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
        {title}
      </h2>
      <p className="text-xl font-semibold text-neutral-800">
        {formatDate(date)}
      </p>
      {location ? <p className="text-base text-neutral-700">{location}</p> : null}
      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-neutral-600 underline hover:text-neutral-900"
        >
          Buka di Google Maps
        </a>
      ) : null}
    </section>
  );
}

function UnavailableView({ client }: { client: PublicClient }) {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-20 sm:px-6">
      <article className="mx-auto max-w-xl space-y-4 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
          Undangan
        </p>
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
          {client.groom_name}
          <span className="mx-2 text-neutral-300">&amp;</span>
          {client.bride_name}
        </h1>
        <p className="mt-6 text-base text-neutral-600">
          Mohon maaf, undangan ini sudah tidak aktif. Terima kasih atas
          perhatian Anda.
        </p>
      </article>
    </main>
  );
}
