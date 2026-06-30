import type { ThemeConfig } from "@/lib/themes/types";

/**
 * Velora — Theme Inject (RSC)
 * -------------------------------------------------------------------
 * Render inline `<style>` yang meng-set CSS variables tema ke `:root`.
 * Dipasang di server component halaman `/i/[slug]/page.tsx`.
 *
 * Komponen-komponen section tinggal memakai kelas Tailwind semantic
 * (`bg-canvas`, `text-ink`, dst) — yang diikat Tailwind ke expression
 * `hsl(var(--theme-<token>) / <alpha-value>)`, dan token-nya di-set
 * di sini secara dinamis berdasarkan tema aktif.
 *
 * Aman untuk RSC: konten style tag dihasilkan dari module tema
 * (bukan user input), tidak ada risiko XSS via dangerouslySetInnerHTML.
 */
export function ThemeInject({ theme }: { theme: ThemeConfig }) {
  if (!theme || !theme.tokens) return null;

  const colorDeclarations = Object.entries(theme.tokens.colors)
    .map(([key, val]) => {
      // Ubah camelCase (mis. inverseCanvas) ke kebab-case (inverse-canvas)
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `--theme-${cssKey}: ${val};`;
    })
    .join("\n  ");

  const fontDeclarations = `
  --theme-font-display: var(${theme.tokens.fonts.display.variable});
  --theme-font-body: var(${theme.tokens.fonts.body.variable});
  `;

  const css = `:root {\n  ${colorDeclarations}\n  ${fontDeclarations}\n}`;

  return (
    <style
      // dangerouslySetInnerHTML aman: konten berasal dari module tema,
      // bukan user input.
      dangerouslySetInnerHTML={{ __html: css }}
      data-theme={theme.name}
    />
  );
}
