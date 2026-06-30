/**
 * Velora — Theme: Sana (Design Tokens)
 * -------------------------------------------------------------------
 * Palette editorial monokromatik — warm off-white + deep navy-charcoal
 * dengan satu aksen deep forest. Sengaja BUKAN cream+terracotta cliché,
 * BUKAN dark+neon, BUKAN broadsheet tipis. Inspired by Kinfolk /
 * Cereal / FT editorial palette, dengan sedikit warm tint untuk
 * keramahan Indonesian wedding aesthetic.
 *
 * Format HSL space-separated (mis. "40 22% 96%") — dipakai sebagai
 * `hsl(var(--sana-<token>) / <alpha-value>)` di Tailwind colors.
 *
 * Hex equivalent untuk referensi designer:
 *   canvas        #FAF8F4  warm off-white
 *   ink           #1B1F26  deep navy-charcoal (primary text)
 *   muted         #6E7480  dove gray
 *   rule          #E5E1D8  warm light gray (dividers)
 *   surface       #FFFFFF  pure white (elevated cards)
 *   inverseCanvas #1B1F26  bg untuk dark section
 *   inverseInk    #FAF8F4  text on dark
 *   accent        #2A4A3E  deep forest (aksen tunggal — bukan terracotta)
 */

export const sanaColors = {
  canvas: "40 22% 96%", // #FAF8F4
  ink: "218 18% 13%", // #1B1F26
  muted: "218 6% 47%", // #6E7480
  rule: "38 18% 88%", // #E5E1D8
  surface: "0 0% 100%", // #FFFFFF
  inverseCanvas: "218 18% 13%", // #1B1F26
  inverseInk: "40 22% 96%", // #FAF8F4
  accent: "157 28% 23%", // #2A4A3E
} as const;
