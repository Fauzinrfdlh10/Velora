import type { ThemeConfig, ThemeName } from "./types";
import { sana } from "./sana/config";

/**
 * Velora — Theme Registry
 * -------------------------------------------------------------------
 * Memetakan `ThemeName` (string dari `clients.theme` di DB) →
 * ThemeConfig. Untuk menambah tema baru:
 *   1) Tambah nama ke union `ThemeName` di `lib/themes/types.ts`.
 *   2) Buat `lib/themes/<name>/config.ts` (eksport `ThemeConfig`).
 *   3) Tambahkan entry di bawah ini.
 *   4) Tambahkan default CSS variables untuk tema baru di `app/globals.css`.
 *
 * TypeScript akan menolak nama tema yang tidak ada di union — jadi
 * typo di nama tema di database akan ketahuan saat compile.
 */
export const themeRegistry: Record<ThemeName, ThemeConfig> = {
  sana,
};
