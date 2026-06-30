import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Next.js middleware.
 *
 * Tujuan di tahap ini:
 *   1. Melindungi route /dashboard/* — redirect ke /login kalau belum auth.
 *   2. Memvalidasi session via Supabase Auth (getUser, bukan getSession)
 *      sehingga tidak bisa dibypass dengan cookie palsu. Validation
 *      terjadi di server, bukan hanya client-side.
 *   3. Me-refresh Supabase session cookie sehingga TTL diperpanjang saat
 *      request berikutnya.
 *
 * Pattern ini mengikuti rekomendasi resmi @supabase/ssr untuk
 * Next.js App Router (lihat README mereka).
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Tanpa env Supabase, jangan loop middleware. Biarkan request lewat
    // dan biakkan app/page.tsx menampilkan status "isi .env.local dulu".
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
   * Jalankan middleware hanya untuk /dashboard/* dan /login (supaya
   * server action login bisa menulis cookie auth baru). Aset Next.js
   * dan file statis di-skip.
   */
  matcher: ["/dashboard/:path*", "/login"],
};
