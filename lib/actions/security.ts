/**
 * Velora — Anti-Spam Helpers (server-side)
 * -------------------------------------------------------------------
 * Layer perlindungan yang dipakai oleh server actions publik:
 *   - Honeypot: field tersembunyi yang kalau terisi = bot.
 *   - Min-submit-duration: client stamps Date.now() saat form mount;
 *     server tolak submit yang datang < 1500ms kemudian.
 *   - In-memory rate limit: per (kind, ip, slug), 5 submit per 60 detik.
 *
 * Caveats:
 *   - In-memory rate limit hanya per-instance. Di Vercel dengan banyak
 *     region/edge, attack model multi-region tidak fully-cover. Cukup
 *     untuk MVP dan kombinasi dengan honeypot + DB constraints yang
 *     membatasi blast radius.
 *   - Rate limiter TIDAK boleh throw ke client (bocor info). Return
 *     boolean + clear window via lazy cleanup.
 */

const MIN_SUBMIT_DURATION_MS = 1500;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_WINDOW = 5;

/**
 * Map global terpisah per process (Node module cache). Akan reset saat
 * server restart atau saat lambda cold-start — itu OK untuk MVP karena
 * blast radius per instance sudah cukup kecil (5 / min).
 *
 * Key format: `${kind}|${ip}|${slug}`
 */
type Bucket = { count: number; resetAt: number };
const rateLimitStore: Map<string, Bucket> = (() => {
  const m = new Map<string, Bucket>();
  // Periodic cleanup tidak dipasang (tidak ada scheduler di server
  // actions). Bucket kadaluarsa akan di-skip saat dicek, jadi map
  // tumbuh sementara lalu stabil saat traffic turun.
  return m;
})();

/**
 * Honeypot check — return `true` kalau submission HARUS dianggap bot
 * dan di-silent-drop (return fake success ke client agar bot tidak
 * adaptasi). Field `company` kita pakai karena nama itu netral dan
 * nama `website` / `url` kadang auto-fill beberapa browser.
 */
export function isHoneypotTriggered(value: unknown): boolean {
  if (typeof value !== "string") return false;
  // Trim + cek non-empty. Spasi-only tidak dihitung sentuhan bot.
  return value.trim().length > 0;
}

/**
 * Min-submit-duration check — return `true` kalau submission terlalu
 * cepat (kemungkinan bot). Client harus mencatat Date.now() saat form
 * mount, lalu mengirim delta saat submit.
 */
export function isSubmitTooFast(durationMs: number | undefined | null): boolean {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs)) {
    // Tidak ada timestamp — anggap tepercaya (backward callability,
    // atau caller sudah filter di tempat lain). Bias "false" supaya
    // form legitimate tidak ditolak kalau lupa kirim field.
    return false;
  }
  return durationMs < MIN_SUBMIT_DURATION_MS;
}

/**
 * Rate limit check. Setelah panggil, counter naik secara otomatis untuk
 * identifier yang sama dalam window yang sama.
 *
 *   kind          — string identifier aksi ("rsvp" | "wish").
 *   identifier    — gabungan ip + slug, sudah di-prefix sisi caller.
 *
 * Return `true` kalau submit HARUS ditolak (limit exceeded).
 */
export function isRateLimited(kind: string, identifier: string): boolean {
  const key = `${kind}|${identifier}`;
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (existing.count >= RATE_LIMIT_MAX_PER_WINDOW) {
    return true;
  }

  existing.count += 1;
  return false;
}

/**
 * Ambil identifier rate-limit dari request headers. Vercel / Next.js
 * biasanya isi `x-forwarded-for` (proporsi IP pertama). Return "unknown"
 * kalau tidak tersedia — rate limit tetap jalan berdasarkan slug saja.
 */
export function getRequestIdentifier(headers: Headers, slug: string): string {
  const xff = headers.get("x-forwarded-for");
  const realIp =
    headers.get("x-real-ip") ??
    (xff ? xff.split(",")[0]?.trim() : null) ??
    headers.get("cf-connecting-ip");
  return `${realIp ?? "unknown"}|${slug}`;
}

/**
 * Konstanta export agar caller (server action + UI) bisa pakai nilai
 * yang sama tanpa duplikasi magic number.
 */
export const SECURITY_LIMITS = {
  minSubmitDurationMs: MIN_SUBMIT_DURATION_MS,
  rateLimitWindowMs: RATE_LIMIT_WINDOW_MS,
  rateLimitMaxPerWindow: RATE_LIMIT_MAX_PER_WINDOW,
} as const;
