import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Next.js middleware.
 *
 * Tahap 4 menambahkan dua tanggung jawab:
 *   1. SUBDOMAIN REWRITE — request ke `<slug>.domain.com[/<path>]` di-rewrite
 *      internal ke path `/i/<slug>[/<path>]`. Mempertahankan query params
 *      (untuk `?to=Firna`). Pola ini menjaga URL publik tetap subdomain
 *      di address bar, dan route handler tetap tinggal di satu tempat
 *      (`app/(public)/i/[slug]/page.tsx`).
 *
 *   2. AUTH PROTECTION `[/dashboard/*]` — redirect ke /login kalau belum
 *      auth (Tahap 3, dipertahankan).
 *
 * Detail teknis:
 *   - Baca `host` dari HEADER (bukan dari `nextUrl.host`) supaya konsisten
 *     dengan layer Vercel edge / proxy. `nextUrl.host` kadang salah map di
 *     belakang proxy.
 *   - Pakai negative-lookahead matcher agar skip `_next/static`, image,
 *     favicon, dan ekstensi gambar. Vercel midleware invocations tetap
 *     murah (sub-1ms) sehingga matcher luas aman.
 *   - Subdomain yang tidak lolos regex `^[a-z0-9-]+$` (mis. huruf besar atau
 *     karakter non-izinkan) diabaikan, supaya tidak mengacaukan fallback ke
 *     app root.
 */

/** Subdomain yang dicadangkan — tidak dianggap sebagai undangan klien. */
const RESERVED_SUBDOMAINS = new Set(["www", "app", "dashboard", "api"]);

/** Subdomain harus cocok dengan CHECK di kolom `clients.slug`. */
const SUBDOMAIN_REGEX = /^[a-z0-9-]+$/;

/** Strip trailing port kalau host nilai seperti "localhost:3000". */
function stripPort(host: string): string {
  return host.replace(/:\d+$/, "");
}

export async function middleware(request: NextRequest) {
  // 1) Subdomain rewrite — kalau respon dihasilkan, langsung return tanpa
  //    menjalankan auth handler karena /i/<slug> route tidak butuh auth.
  const rewriteResponse = tryRewriteSubdomainToInvite(request);
  if (rewriteResponse) return rewriteResponse;

  // 2) Auth-protected route — jalur reguler (root domain dan sub reserved).
  return await handleAuthRoutes(request);
}

function tryRewriteSubdomainToInvite(
  request: NextRequest,
): NextResponse | null {
  const hostHeader = request.headers.get("host");
  if (!hostHeader) return null;

  const rootDomain =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

  const hostNoPort = stripPort(hostHeader);
  const rootNoPort = stripPort(rootDomain);

  // Host sama dengan root → no rewrite.
  // Host sama dengan www.<root> → no rewrite (dianggap root).
  if (
    hostNoPort === rootNoPort ||
    hostNoPort === `www.${rootNoPort}`
  ) {
    return null;
  }

  // Ekstrak subdomain dengan menghapus suffix root domain.
  if (!hostNoPort.endsWith(`.${rootNoPort}`)) {
    // Mis. host adalah IP atau domain lain → tidak ditangani.
    return null;
  }

  const subdomain = hostNoPort.slice(
    0,
    hostNoPort.length - rootNoPort.length - 1,
  );
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null;
  if (!SUBDOMAIN_REGEX.test(subdomain)) return null;

  // Rewrite ke path internal. `nextUrl.clone()` mempertahankan search params
  // bawaan sehingga `?to=Firna` di URL publik ikut terbawa.
  const url = request.nextUrl.clone();
  url.pathname = `/i/${subdomain}${url.pathname}`;
  return NextResponse.rewrite(url);
}

async function handleAuthRoutes(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // PENTING: jangan tulis logika lain di antara createServerClient dan
  // getUser() — perubahan kecil di sini bisa bikin session gampang expire
  // secara acak dan sulit di-debug.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  /**
   * Middleware dijalankan untuk semua path KECUALI:
   *   - api/* (route handlers Next.js — tidak butuh middleware)
   *   - _next/static, _next/image (aset internal Next.js)
   *   - favicon.ico
   *   - file static dengan ekstensi gambar (svg/png/jpg/jpeg/gif/webp)
   *
   * Negative-lookahead pattern sesuai rekomendasi Vercel agar Vercel Edge
   * invocations tetap minimal.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
