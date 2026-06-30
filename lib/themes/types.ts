/**
 * Velora — Theme System Types
 * -------------------------------------------------------------------
 * Kontrak untuk semua tema undangan. Tema adalah modul TypeScript
 * (`lib/themes/<name>/config.ts`) dan di-mount ke registry agar dapat
 * di-resolve dari string `clients.theme` di database.
 *
 * Untuk menambahkan tema baru:
 *   1) Tambahkan nama ke `ThemeName` union di bawah.
 *   2) Buat `lib/themes/<name>/tokens.ts` dan `lib/themes/<name>/config.ts`.
 *   3) Daftarkan di `lib/themes/registry.ts`.
 *   4) Tambahkan CSS variable defaults untuk tema baru di `app/globals.css`.
 *
 * Section components di `components/invite/sections/*` TIDAK boleh tahu
 * nama tema. Mereka hanya menggunakan kelas Tailwind semantic
 * (`bg-canvas`, `text-ink`, `border-rule`, dst.) yang diikat ke CSS
 * variables yang di-inject oleh komponen `<ThemeInject />`.
 */

export type ThemeName = "sana";

/** Section IDs yang memiliki layout override-able per tema. */
export type SectionId =
  | "cover"
  | "countdown"
  | "event-details"
  | "gallery"
  | "rsvp"
  | "amplop"
  | "wish";

export interface DesignTokens {
  /**
   * Palette warna — SEMUA nilai adalah ekspresi Tailwind yang
   * ter-resolve ke CSS variables. Jangan hardcode hex di sini.
   * Hex didefinisikan di `globals.css` sebagai `--sana-canvas`, dst.
   *
   * Pattern `hsl(var(--sana-<token>) / <alpha-value>)` memungkinkan
   * opacity modifier Tailwind (`bg-canvas/50`) bekerja.
   */
  colors: {
    canvas: string;
    ink: string;
    muted: string;
    rule: string;
    surface: string;
    inverseCanvas: string;
    inverseInk: string;
    accent: string;
  };
  /**
   * Font contract — `family` adalah nama CSS family
   * (sudah di-load oleh next/font di root layout).
   * `variable` adalah nama CSS variable yang di-set oleh next/font.
   */
  fonts: {
    display: { family: string; variable: string; weights: number[] };
    body: { family: string; variable: string; weights: number[] };
  };
  spacing: {
    sectionPaddingY: string;
    containerMaxWidth: string;
  };
  motion: {
    enterDuration: string;
    enterStagger: string;
    reducedMotionSafe: boolean;
  };
}

/**
 * ThemeConfig adalah unit bundle yang di-registry. Setiap tema
 * meng-export SATU objek `ThemeConfig` dari file `config.ts`.
 */
export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  description: string;
  tokens: DesignTokens;
}
