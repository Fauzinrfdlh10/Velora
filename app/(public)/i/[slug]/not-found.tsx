import Link from "next/link";

/**
 * 404 untuk halaman undangan publik.
 *
 * Ditampilkan saat `notFound()` dipanggil di `page.tsx` (kasus slug
 * tidak ditemukan di tabel clients). Status HTTP otomatis 404 karena
 * notFound() melemparkan NEXT_NOT_FOUND yang ditangani Next.js.
 */
export default function InvitationNotFound() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-20 sm:px-6">
      <article className="mx-auto max-w-xl space-y-4 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">
          404
        </p>
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
          Undangan tidak ditemukan
        </h1>
        <p className="text-base text-neutral-600">
          Alamat yang Anda buka tidak cocok dengan undangan manapun. Mungkin
          ada salah ketik atau tautan sudah tidak berlaku.
        </p>
        <p className="pt-6 text-sm text-neutral-400">
          Butuh undangan?{" "}
          <Link href="/" className="underline hover:text-neutral-700">
            Kunjungi Velora
          </Link>
        </p>
      </article>
    </main>
  );
}
