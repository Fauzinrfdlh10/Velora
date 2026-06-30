import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Placeholder } from "@/components/ui/placeholder";

/**
 * Halaman root sementara.
 * Digunakan untuk memverifikasi semua konfigurasi (Tailwind, Supabase)
 * berjalan dengan benar sebelum implementasi fitur dimulai.
 *
 * Halaman ini akan diganti dengan landing page publik atau redirect
 * di tahap development berikutnya.
 *
 * CTA tambahan: tampilkan "Masuk" / "Buka Dashboard" tergantung status auth
 * user saat ini, supaya klien yang sudah login tidak nyasar ke /login.
 */
export default async function HomePage() {
  const [supabaseStatus, currentUserEmail] = await Promise.all([
    checkSupabaseConnection(),
    getCurrentUserEmail(),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
            🎉 Velora
          </h1>
          <p className="mt-2 text-neutral-600">
            Platform Undangan Pernikahan Digital
          </p>
        </div>

        {/* Status Check */}
        <Placeholder>
          <h2 className="mb-4 text-lg font-semibold text-neutral-800">
            Setup Status
          </h2>

          <div className="space-y-3 text-left">
            <StatusRow
              label="Next.js (App Router)"
              status={Status.PASS}
              detail="Berjalan"
            />
            <StatusRow
              label="Tailwind CSS"
              status={Status.PASS}
              detail="Aktif"
            />
            <StatusRow
              label="Supabase Connection"
              status={supabaseStatus.status}
              detail={supabaseStatus.detail}
            />
          </div>
        </Placeholder>

        {/* Footer */}
        <p className="text-center text-sm text-neutral-400">
          Semua konfigurasi dasar siap. Gunakan{" "}
          <code className="rounded bg-neutral-200 px-1 py-0.5 text-xs">
            npm run dev
          </code>{" "}
          untuk memulai development.
        </p>

        {/* Auth CTA — server-side rendered, tidak ada client-side bypass */}
        <div className="text-center">
          {currentUserEmail ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800"
            >
              Buka Dashboard →
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-100"
            >
              Masuk sebagai Klien
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

/* ──────────────── Helpers ──────────────── */

async function getCurrentUserEmail(): Promise<string | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? null;
  } catch {
    return null;
  }
}

enum Status {
  PASS = "pass",
  FAIL = "fail",
  PENDING = "pending",
}

interface ConnectionResult {
  status: Status;
  detail: string;
}

async function checkSupabaseConnection(): Promise<ConnectionResult> {
  // Cek environment variables terlebih dahulu
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return {
      status: Status.PENDING,
      detail: "Isi .env.local dulu",
    };
  }

  try {
    const supabase = await createClient();

    // Health check: panggil Supabase Auth API (GoTrue)
    // Ini memverifikasi instance Supabase bisa dijangkau tanpa bergantung
    // pada schema database atau RLS.
    const { error } = await supabase.auth.getSession();

    if (error) {
      return {
        status: Status.FAIL,
        detail: `Gagal: ${error.message}`,
      };
    }

    return {
      status: Status.PASS,
      detail: "Terhubung ke Supabase ✓",
    };
  } catch (err) {
    return {
      status: Status.FAIL,
      detail: `Error: ${err instanceof Error ? err.message : "Unknown"}`,
    };
  }
}

function StatusRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: Status;
  detail: string;
}) {
  const indicator = {
    [Status.PASS]: "🟢",
    [Status.FAIL]: "🔴",
    [Status.PENDING]: "🟡",
  }[status];

  return (
    <div className="flex items-center justify-between rounded-md bg-white px-4 py-2.5 shadow-sm">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <span className="text-sm text-neutral-500">
        {indicator} {detail}
      </span>
    </div>
  );
}
