import type { Config } from "tailwindcss";

/**
 * Velora — Tailwind CSS Configuration
 * -------------------------------------------------------------------
 * Mendefinisikan design tokens untuk SEMUA tema undangan via
 * CSS variables (hsl(var(--sana-*))). Pattern `<alpha-value>`
 * memungkinkan opacity modifier Tailwind (`bg-canvas/40` dst.)
 *
 * Kontrak:
 *   - Section components HANYA boleh memakai kelas semantic di sini
 *     (`bg-canvas`, `text-ink`, dst) — bukan `bg-blue-500` dll.
 *   - Setiap kelas semantic diikat ke CSS variable yang di-set oleh
 *     `<ThemeInject />` di root layout halaman `/i/[slug]`.
 *   - `neutral` dipertahankan untuk komponen DASHBOARD yang tidak
 *     bertema (lihat `app/dashboard/page.tsx`).
 *
 * UNTUK TAMBAH TEMA BARU:
 *   1. Tambah CSS variable defaults di `app/globals.css`
 *   2. (Opsional) Tambah class semantic baru di sini kalau tema
 *      butuh token ekstra di luar 8 token standar di atas.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette netral — dipakai oleh komponen non-tema (dashboard, dll).
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        // Semantic theme tokens — diikat ke CSS variables via `<ThemeInject />`.
        // Pattern `hsl(var(--sana-<token>) / <alpha-value>)` membuat
        // modifier Tailwind `bg-canvas/50` resolusi ke alpha 50%.
        canvas: "hsl(var(--sana-canvas) / <alpha-value>)",
        ink: "hsl(var(--sana-ink) / <alpha-value>)",
        muted: "hsl(var(--sana-muted) / <alpha-value>)",
        rule: "hsl(var(--sana-rule) / <alpha-value>)",
        surface: "hsl(var(--sana-surface) / <alpha-value>)",
        inverseCanvas: "hsl(var(--sana-inverse-canvas) / <alpha-value>)",
        inverseInk: "hsl(var(--sana-inverse-ink) / <alpha-value>)",
        accent: "hsl(var(--sana-accent) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-cormorant)", "Georgia", "serif"],
      },
      maxWidth: {
        // Container max-width untuk section invitation pages — diambil dari sana tokens.
        // Dipakai oleh `<SectionShell />`.
        invite: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
