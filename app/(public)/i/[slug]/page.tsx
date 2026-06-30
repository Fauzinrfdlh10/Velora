import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { resolveTheme } from "@/lib/themes/resolver";
import { InvitationRenderer } from "@/components/invite/invitation-renderer";
import { ThemeInject } from "@/components/invite/theme-inject";
import { SectionShell } from "@/components/invite/section-shell";
import { getMockInvitation } from "@/lib/mock/client";
import type {
  PublicInvitationData,
  PageRenderState,
} from "@/types/invitation";
import type { BankAccount } from "@/types/database";

/**
 * Velora — Public Invitation Page (RSC)
 * -------------------------------------------------------------------
 * Entry untuk `/i/<slug>`. Middleware mem-rewrite `<slug>.domain.com`
 * ke path ini, menyertakan query param `?to=Nama` (lihat middleware.ts).
 *
 * Alur:
 *   1. Cek env VELORA_USE_MOCK_CLIENT=1 → pakai mock, skip DB.
 *   2. Panggil RPC `get_public_client_by_slug` (anon-safe via RLS,
 *      SECURITY DEFINER sehingga expose `status` & `expires_at` lengkap).
 *   3. Fetch data turunan paralel: gallery, wishes (visible), bank_accounts.
 *   4. Tentukan PageRenderState (active|inactive|expired|not-found).
 *   5. Render sesuai state. Hanya `active` yang memakai 7-section theme.
 *
 * Tidak ada data klien valid → not-found. Status 'draft'/'inactive' →
 * inactive view. Expired → expired view. Active → full invitation.
 */

type SearchParams = Promise<{ to?: string | string[]; guest?: string | string[] }>;
type RouteParams = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Undangan ${slug} · Velora`,
    description: "Undangan pernikahan digital dari Velora.",
    robots: { index: true, follow: true },
  };
}

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: SearchParams;
}) {
  const useMock = process.env.VELORA_USE_MOCK_CLIENT === "1";

  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const guestName = parseGuestName(sp?.to);
  const guestIdParam = parseFirstString(sp?.guest);

  const state: PageRenderState = useMock
    ? {
        kind: "active",
        data: withMockExtras(getMockInvitation(), guestName, null),
      }
    : await fetchRealState(slug, guestName, guestIdParam);

  switch (state.kind) {
    case "not-found":
      return <NotFoundView slug={slug} />;
    case "inactive":
      return <InactiveView state={state} slug={slug} />;
    case "expired":
      return <ExpiredView state={state} slug={slug} />;
    case "active":
      return (
        <InvitationRenderer
          slug={slug}
          theme={resolveTheme(state.data.client.theme)}
          data={state.data}
        />
      );
  }
}

function parseGuestName(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const raw = Array.isArray(v) ? v[0] : v;
  const trimmed = raw?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function parseFirstString(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const raw = Array.isArray(v) ? v[0] : v;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve `?guest=<uuid>` -> guest UUID yang valid untuk client ini.
 * Tiga filter berurutan agar tidak melakukan round-trip DB sia-sia:
 *   1. Format regex UUID (avoid spam dengan invalid strings).
 *   2. RLS-protected `public.guests` SELECT — anon sudah boleh (lihat
 *      migration init: policy `guests_select_public` aktif saat
 *      client.active + not expired).
 *
 * Return null kalau tidak valid / tidak ditemukan. Anonymous fallback
 * selalu aman (UI treat sebagai tanpa guest_id).
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveGuestId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  candidate: string | null,
): Promise<string | null> {
  if (!candidate || !UUID_REGEX.test(candidate)) return null;
  const { data, error } = await supabase
    .from("guests")
    .select("id")
    .eq("id", candidate)
    .eq("client_id", clientId)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

function withMockExtras(
  data: PublicInvitationData,
  guestName: string | null,
  guestId: string | null,
): PublicInvitationData {
  return { ...data, guestName, guestId };
}

/**
 * State resolver untuk klien sungguhan (non-mock).
 *
 * TAHAP 6: menerima `?guest=<uuid>` dari query param. Jika valid
 * (format + ada di tabel guests milik client ini), dipakai sebagai
 * guest_id sehingga submit kedua dari tamu yang sama UPDATE RSVP
 * row. Null/undefined = anonymous submission.
 */
async function fetchRealState(
  slug: string,
  guestName: string | null,
  guestIdParam: string | null,
): Promise<PageRenderState> {
  const supabase = await createClient();
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_public_client_by_slug",
    { p_slug: slug },
  );
  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;

  if (rpcError || !row) {
    return { kind: "not-found" };
  }

  const status = row.status as "draft" | "active" | "inactive" | "expired";
  const isExpired = new Date(row.expires_at).getTime() < Date.now();

  if (status === "draft" || status === "inactive") {
    return {
      kind: "inactive",
      reason:
        status === "draft"
          ? "Undangan ini masih dalam tahap persiapan oleh pengantin."
          : "Undangan ini untuk sementara tidak ditampilkan.",
      groom_name: row.groom_name,
      bride_name: row.bride_name,
    };
  }
  if (isExpired) {
    return {
      kind: "expired",
      expires_at: row.expires_at,
      groom_name: row.groom_name,
      bride_name: row.bride_name,
    };
  }

  // Resolve guest_id di paralel dengan data turunan agar tidak
  // menambah latency bila tidak ada guest param.
  const [galleryRes, wishesRes, bankRes, resolvedGuestId] = await Promise.all([
    supabase
      .from("gallery_photos")
      .select("id, url, position")
      .eq("client_id", row.id)
      .order("position", { ascending: true }),
    supabase
      .from("wishes")
      .select("id, name, message, created_at")
      .eq("client_id", row.id)
      .eq("status", "visible")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("clients")
      .select("bank_accounts")
      .eq("id", row.id)
      .maybeSingle(),
    resolveGuestId(supabase, row.id, guestIdParam),
  ]);

  return {
    kind: "active",
    data: {
      client: {
        id: row.id,
        slug: row.slug,
        groom_name: row.groom_name,
        bride_name: row.bride_name,
        akad_date: row.akad_date,
        akad_location: row.akad_location,
        akad_maps_url: row.akad_maps_url,
        resepsi_date: row.resepsi_date,
        resepsi_location: row.resepsi_location,
        resepsi_maps_url: row.resepsi_maps_url,
        theme: row.theme,
        status,
        expires_at: row.expires_at,
      },
      gallery: galleryRes.data ?? [],
      wishes: wishesRes.data ?? [],
      // bank_accounts adalah JSONB di DB. Supabase decode otomatis ke JS value,
      // tapi tanpa generated types (lihat types/database.ts) hasilnya `any`.
      // Cast eksplisit ke BankAccount[] untuk safety saat DB type digenerate
      // di prompt berikutnya via `supabase gen types typescript --linked`.
      bankAccounts: (bankRes.data?.bank_accounts ?? []) as BankAccount[],
      guestName,
      guestId: resolvedGuestId,
    },
  };
}

/* ─────────── State views (theme-aware) ─────────── */

function NotFoundView({ slug }: { slug: string }) {
  const theme = resolveTheme("sana");
  return (
    <main>
      <ThemeInject theme={theme} />
      <SectionShell theme={theme} ariaLabel="Undangan tidak ditemukan">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-4xl text-ink">Tidak ditemukan</h1>
          <p className="mt-3 text-sm text-muted">
            Undangan dengan slug{" "}
            <span className="font-mono">{slug}</span> tidak tersedia. Periksa
            kembali link Anda.
          </p>
        </div>
      </SectionShell>
    </main>
  );
}

function InactiveView({
  state,
  slug,
}: {
  state: Extract<PageRenderState, { kind: "inactive" }>;
  slug: string;
}) {
  const theme = resolveTheme("sana");
  return (
    <main>
      <ThemeInject theme={theme} />
      <SectionShell theme={theme} ariaLabel="Undangan tidak aktif">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-4xl text-ink">Belum siap</h1>
          <p className="mt-3 text-sm text-muted">{state.reason}</p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-accent">
            {slug}
          </p>
        </div>
      </SectionShell>
    </main>
  );
}

function ExpiredView({
  state,
  slug,
}: {
  state: Extract<PageRenderState, { kind: "expired" }>;
  slug: string;
}) {
  const theme = resolveTheme("sana");
  return (
    <main>
      <ThemeInject theme={theme} />
      <SectionShell theme={theme} ariaLabel="Undangan berakhir">
        <div className="mx-auto max-w-md text-center">
          <h1 className="font-display text-4xl text-ink">Sudah berakhir</h1>
          {state.groom_name || state.bride_name ? (
            <p className="mt-3 font-display text-xl text-ink">
              {state.groom_name} &amp; {state.bride_name}
            </p>
          ) : null}
          <p className="mt-3 text-sm text-muted">
            Masa aktif undangan ini sudah berakhir pada{" "}
            {new Date(state.expires_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            .
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-accent">
            {slug}
          </p>
        </div>
      </SectionShell>
    </main>
  );
}
