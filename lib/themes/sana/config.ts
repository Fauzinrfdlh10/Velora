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
import { sanaColors } from "./tokens";

export const sana: ThemeConfig = {
  name: "sana",
  displayName: "Sana",
  description:
    "Modern Heritage — estetika hangat, elegan, dan abadi. " +
    "Warm sand + deep espresso dengan aksen emas antik. " +
    "Typography: Playfair Display (display) + Plus Jakarta Sans (body).",
  tokens: {
    colors: {
      canvas: sanaColors.canvas,
      ink: sanaColors.ink,
      muted: sanaColors.muted,
      rule: sanaColors.rule,
      surface: sanaColors.surface,
      inverseCanvas: sanaColors.inverseCanvas,
      inverseInk: sanaColors.inverseInk,
      accent: sanaColors.accent,
    },
    fonts: {
      display: {
        family: "Playfair Display",
        variable: "--font-playfair",
        weights: [400, 500, 600, 700],
      },
      body: {
        family: "Plus Jakarta Sans",
        variable: "--font-jakarta",
        weights: [400, 500, 600, 700],
      },
    },
    spacing: {
      sectionPaddingY: "clamp(3.5rem, 7vw, 6rem)",
      containerMaxWidth: "68rem",
    },
    motion: {
      enterDuration: "500ms",
      enterStagger: "60ms",
      reducedMotionSafe: true,
    },
  },
};
