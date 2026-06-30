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
  canvas: "36 21% 94%", // #F4F0EA
  ink: "25 15% 15%", // #2C2520
  muted: "30 10% 45%", // #7D7268
  rule: "33 21% 85%", // #E3DACF
  surface: "30 25% 98%", // #FCFAF8
  inverseCanvas: "25 15% 15%", // #2C2520
  inverseInk: "36 21% 94%", // #F4F0EA
  accent: "30 42% 38%", // #8C6239
} as const;
