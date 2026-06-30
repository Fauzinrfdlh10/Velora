import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "./actions";

/**
 * Smart Dashboard (skeleton).
 *
 * Tujuan tahap ini: HANYA kerangka. Menampilkan nama klien yang sedang
 * login dan placeholder section untuk fitur yang akan diisi di tahap
 * berikutnya (tamu, RSVP, wish, amplop). Tidak ada CRUD penuh di sini.
 *
 * Strategi auth:
 *   1. Middleware sudah redirect /dashboard/* ke /login kalau no-session.
 *   2. Double-check di server component ini: defensive, supaya tidak
 *      pernah render protected UI even kalau konfigurasi matcher
 *      middleware berubah.
 *   3. Query `clients` hanya dengan `eq('user_id', user.id)` — RLS akan
 *      melimitasi hasil, dan kita hanya fetch row milik sendiri.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensive: jika middleware somehow membiarkan lewat tapi tidak ada session
  // (mis. cookie expired antara middleware dan render), tendang ke /login.
  if (!user) {
    redirect("/login");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, groom_name, bride_name, slug, package, status, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // Kasus A: trigger handle_new_user seharusnya auto-create row di
  // public.clients saat signup. Jika somehow tidak ada row, tampilkan
  // fallback "akun belum terhubung".
  if (clientError) {
    return (
      <DashboardShell email={user.email ?? null}>
        <ErrorBanner
          title="Gagal memuat data klien"
          detail={clientError.message}
        />
      </DashboardShell>
    );
  }

  if (!client) {
    return (
      <DashboardShell email={user.email ?? null}>
        <ErrorBanner
          title="Akun belum terhubung ke data klien"
          detail={
            "Akun Anda berhasil login, tapi belum ada data undangan yang terkait. " +
              "Hubungi admin agar akun Anda dihubungkan ke data klien."
          }
        />
      </DashboardShell>
    );
  }

  // Kasus B: row ada (trigger sukses) tapi nama masih placeholder
  // 'Belum diisi' — klien perlu setup data dasar sebelum lanjut.
  // Cek dengan OR: kalau salah satu masih placeholder, dashboard belum
  // siap dirender dengan nama asli (akan tampil "Andi & Belum diisi"
  // yang aneh).
  const hasPlaceholderName =
    client.groom_name === "Belum diisi" ||
    client.bride_name === "Belum diisi";

  // Slug placeholder 'user-<12hex>' (auto-generated oleh handle_new_user
  // trigger) tidak ditampilkan di UI — tampilkan hanya saat sudah Menjadi
  // slug custom dari onboarding.
  const showSlug = !client.slug.startsWith("user-");

  if (hasPlaceholderName) {
    return (
      <DashboardShell
        email={user.email ?? null}
        slug={showSlug ? client.slug : undefined}
        package={client.package}
        status={client.status}
      >
        <ErrorBanner
          title="Data klien belum lengkap"
          detail={
            "Akun Anda sudah aktif, tapi nama pengantin belum diisi. " +
              "Hubungi admin untuk melengkapi data sebelum membuat undangan aktif."
          }
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      email={user.email ?? null}
      slug={showSlug ? client.slug : undefined}
      package={client.package}
      status={client.status}
      groomName={client.groom_name}
      brideName={client.bride_name}
    >
      <PlaceholderGrid />
    </DashboardShell>
  );
}


/* ──────────────── Sub-components ──────────────── */

function DashboardShell({
  email,
  slug,
  package: pkg,
  status,
  groomName,
  brideName,
  children,
}: {
  email: string | null;
  slug?: string;
  package?: string;
  status?: string;
  groomName?: string;
  brideName?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl bg-neutral-50 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Smart Dashboard
          </p>
          {groomName && brideName ? (
            <h1 className="mt-1 text-2xl font-semibold text-neutral-900 sm:text-3xl">
              {groomName}{" "}
              <span className="text-neutral-400">&amp;</span> {brideName}
            </h1>
          ) : (
            <h1 className="mt-1 text-2xl font-semibold text-neutral-900 sm:text-3xl">
              Dashboard Klien
            </h1>
          )}
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
            {slug ? <span>Slug: <span className="font-mono text-neutral-700">{slug}</span></span> : null}
            {pkg ? <span>Paket: {pkg}</span> : null}
            {status ? <span>Status: {status}</span> : null}
            {email ? <span>{email}</span> : null}
          </dl>
        </div>

        {/* Logout: form + server action, no client component needed */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-100"
          >
            Logout
          </button>
        </form>
      </header>

      {/* Content */}
      <section className="mt-8">{children}</section>
    </main>
  );
}

function ErrorBanner({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <h2 className="text-base font-semibold text-amber-900">{title}</h2>
      <p className="mt-2 text-sm text-amber-800">{detail}</p>
    </div>
  );
}

function PlaceholderGrid() {
  const cards = [
    {
      title: "Daftar Tamu",
      hint: "Kelola tamu yang diundang, slug personal untuk link undangan.",
    },
    {
      title: "RSVP Masuk",
      hint: "Lihat siapa yang konfirmasi hadir / tidak hadir / mungkin.",
    },
    {
      title: "Wedding Wish",
      hint: "Ucapan & doa dari tamu yang masuk lewat halaman undangan.",
    },
    {
      title: "Amplop Digital",
      hint: "Status transfer & bukti amplop digital dari tamu.",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <article
          key={card.title}
          className="rounded-lg border border-dashed border-neutral-300 bg-white p-5"
        >
          <h3 className="text-sm font-semibold text-neutral-900">{card.title}</h3>
          <p className="mt-1 text-sm text-neutral-500">{card.hint}</p>
          <p className="mt-4 text-xs italic text-neutral-400">
            Implementasi menyusul di tahap berikutnya.
          </p>
        </article>
      ))}
    </div>
  );
}
