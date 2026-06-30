import type { ThemeConfig } from "@/lib/themes/types";

/**
 * Velora — Theme: Sana (Config)
 * -------------------------------------------------------------------
 * ThemeConfig yang di-bundle ke registry untuk tema "Sana".
 *
 * Setiap nilai `colors.<token>` adalah ekspresi Tailwind yang
 * ter-resolve ke CSS variable yang di-inject oleh `<ThemeInject />`.
 * Dengan pattern `hsl(var(--sana-<token>) / <alpha-value>)`, kita
 * mendapat fasilitas opacity Tailwind (`bg-canvas/40` dst.)
 *
 * Font family dan variable harus cocok dengan yang di-declare
 * di `app/layout.tsx` via next/font/google.
 */
export const sana: ThemeConfig = {
  name: "sana",
  displayName: "Sana",
  description:
    "Editorial monokromatik — kalem, berkelas, abadi. " +
    "Warm off-white + deep ink dengan aksen deep forest. " +
    "Typography: Cormorant Garamond (display) + Inter (body).",
  tokens: {
    colors: {
      canvas: `hsl(var(--sana-canvas) / <alpha-value>)`,
      ink: `hsl(var(--sana-ink) / <alpha-value>)`,
      muted: `hsl(var(--sana-muted) / <alpha-value>)`,
      rule: `hsl(var(--sana-rule) / <alpha-value>)`,
      surface: `hsl(var(--sana-surface) / <alpha-value>)`,
      inverseCanvas: `hsl(var(--sana-inverse-canvas) / <alpha-value>)`,
      inverseInk: `hsl(var(--sana-inverse-ink) / <alpha-value>)`,
      accent: `hsl(var(--sana-accent) / <alpha-value>)`,
    },
    fonts: {
      display: {
        family: "Cormorant Garamond",
        variable: "--font-cormorant",
        weights: [400, 500, 600, 700],
      },
      body: {
        family: "Inter",
        variable: "--font-inter",
        weights: [400, 500, 600],
      },
    },
    spacing: {
      sectionPaddingY: "clamp(4rem, 8vw, 7rem)",
      containerMaxWidth: "72rem",
    },
    motion: {
      enterDuration: "600ms",
      enterStagger: "80ms",
      reducedMotionSafe: true,
    },
  },
};
