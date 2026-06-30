import type { ThemeConfig } from "@/lib/themes/types";
import { sanaColors } from "@/lib/themes/sana/tokens";

/**
 * Velora — Theme Inject (RSC)
 * -------------------------------------------------------------------
 * Render inline `<style>` yang meng-set CSS variables tema ke `:root`.
 * Dipasang di server component halaman `/i/[slug]/page.tsx`.
 *
 * Komponen-komponen section tinggal memakai kelas Tailwind semantic
 * (`bg-canvas`, `text-ink`, dst) — yang diikat Tailwind ke expression
 * `hsl(var(--sana-<token>) / <alpha-value>)`, dan token-nya di-set
 * di sini.
 *
 * Aman untuk RSC: konten style tag dihasilkan dari module tema
 * (bukan user input), tidak ada risiko XSS via dangerouslySetInnerHTML.
 *
 * Untuk TAHAP 5: hanya 1 tema (sana). Multi-tema nanti: refactor map
 * nama→CSS-string per theme (lihat catatan ThemeName union di types.ts).
 */
const SANA_VAR_NAMES: Record<keyof typeof sanaColors, string> = {
  canvas: "--sana-canvas",
  ink: "--sana-ink",
  muted: "--sana-muted",
  rule: "--sana-rule",
  surface: "--sana-surface",
  inverseCanvas: "--sana-inverse-canvas",
  inverseInk: "--sana-inverse-ink",
  accent: "--sana-accent",
};

function buildSanaCss(): string {
  const declarations = (Object.keys(sanaColors) as Array<keyof typeof sanaColors>)
    .map((key) => `${SANA_VAR_NAMES[key]}: ${sanaColors[key]};`)
    .join("\n  ");
  return `:root {\n  ${declarations}\n}`;
}

export function ThemeInject({ theme }: { theme: ThemeConfig }) {
  if (theme.name !== "sana") return null;
  return (
    <style
      // dangerouslySetInnerHTML aman: konten berasal dari module tema,
      // bukan user input.
      dangerouslySetInnerHTML={{ __html: buildSanaCss() }}
      data-theme={theme.name}
    />
  );
}
