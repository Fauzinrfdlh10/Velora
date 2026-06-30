import type { BankAccount } from "./database";

/**
 * Velora — Public Invitation Data Shape
 * -------------------------------------------------------------------
 * Bentuk ter-unified dari data yang dibutuhkan section components
 * pada halaman publik undangan.
 *
 * `client` adalah subset dari `Client` row — kolom yang di-expose
 * oleh RPC `get_public_client_by_slug` (lihat migration
 * `20260631000000_get_public_client_by_slug_rpc.sql`).
 *
 * `gallery`, `wishes`, dan `bankAccounts` adalah data turunan yang
 * di-fetch terpisah oleh `page.tsx` di server, BUKAN oleh
 * section components. Section components hanya consume prop ini.
 *
 * `guestName` dari query param `?to=Name` — untuk personal greeting
 * di Cover. Null jika link dibuka tanpa query param.
 */
export interface PublicInvitationData {
  client: {
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
    /**
     * Nama tema yang dipakai — string identifier (`ThemeName` union)
     * yang di-resolve via `lib/themes/resolver.resolveTheme(name)`.
     * Disimpan sebagai TEXT di kolom `clients.theme` dan di-expose
     * oleh RPC `get_public_client_by_slug`.
     */
    theme: string;
    status: "draft" | "active" | "inactive" | "expired";
    expires_at: string;
  };
  gallery: Array<{
    id: string;
    url: string;
    position: number;
  }>;
  wishes: Array<{
    id: string;
    name: string;
    message: string;
    created_at: string;
  }>;
  bankAccounts: BankAccount[];
  /**
   * Personal guest greeting — dari `?to=Nama` di URL.
   * Null bila link dibuka tanpa query param personal.
   */
  guestName: string | null;
}

/**
 * Status render halaman undangan yang di-branching oleh page.tsx:
 *
 *   - `not-found`   → row tidak ada di DB (404 friendly).
 *   - `inactive`    → status='draft' atau 'inactive'.
 *   - `expired`     → expires_at < now() (meskipun status='active').
 *   - `active`      → siap di-render dengan theme + sections.
 *
 * Hanya state `active` yang kompleks — state lain tampilkan
 * pesan sederhana dengan styling theme yang sama.
 */
export type PageRenderState =
  | { kind: "not-found" }
  | { kind: "inactive"; reason: string; groom_name?: string; bride_name?: string }
  | { kind: "expired"; expires_at: string; groom_name: string; bride_name: string }
  | { kind: "active"; data: PublicInvitationData };
