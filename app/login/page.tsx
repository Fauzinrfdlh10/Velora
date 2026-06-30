import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

/**
 * Halaman login.
 *
 * Server component: kalau user sudah terautentikasi, redirect langsung
 * ke /dashboard sehingga tidak ada flash dari form login. Auth check
 * terjadi di server, bukan client-side.
 */
export default async function LoginPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            🎉 Velora
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Masuk ke Smart Dashboard klien
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-neutral-400">
          Belum punya akun? Hubungi admin — akun klien dibuat secara manual
          setelah konfirmasi pesanan.
        </p>
      </div>
    </main>
  );
}
