import { sana } from "./sana/config";
import { themeRegistry } from "./registry";
import type { ThemeConfig, ThemeName } from "./types";

/**
 * Velora — Theme Resolver
 * -------------------------------------------------------------------
 * Ambil ThemeConfig dari nama. Selalu ThemeConfig, tidak pernah null.
 * - Jika nama null / undefined / string kosong → fallback ke `sana`.
 * - Jika nama tidak ada di registry → fallback ke `sana`.
 * - Hanya nama yang ada di union `ThemeName` yang akan dipakai.
 *
 * Dipakai di `app/(public)/i/[slug]/page.tsx`:
 *   const theme = resolveTheme(client.theme);
 *
 * Pendekatan fallback tunggal (bukan throw) menjamin halaman publik
 * selalu me-render sesuatu yang layak — lebih baik satu tema konsisten
 * daripada error 500 karena nama tema typo di DB.
 */
export function resolveTheme(name: string | null | undefined): ThemeConfig {
  if (name && (name as ThemeName) in themeRegistry) {
    return themeRegistry[name as ThemeName];
  }
  return sana;
}
