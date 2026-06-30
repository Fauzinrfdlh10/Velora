/**
 * Velora — Invitation Validation Limits (shared)
 * -------------------------------------------------------------------
 * Konstanta batas-batas input untuk form publik RSVP / Wish. Module ini
 * dipakai oleh:
 *   - Server actions     (lib/actions/invitation.ts)
 *   - Client components  (components/invite/sections/{rsvp,wish}-placeholder.tsx)
 *
 * MARKAH PENTING: file ini TIDAK ber-markah `"use server"` atau
 * `"use client"`. Konstanta TS plane biasa yang di-bundle ke kedua sisi
 * oleh Next.js / Turbopack. Tidak ada import restriction.
 *
 * Setiap perubahan di file ini di-mirror ke CHECK constraint di DB
 * (lihat migration 20260629000000_init_velora_schema.sql + 20260701...).
 * DB tetap source of truth terakhir jika client/server bug.
 */

// ---------------------------------------------------------------------------
// RSVP
// ---------------------------------------------------------------------------

/** Panjang maksimum nama pengisi RSVP (chars). */
export const RSVP_NAME_MAX = 100;

/** Panjang maksimum pesan RSVP opsional (chars). */
export const RSVP_MESSAGE_MAX = 500;

/** Batas bawah attendee_count — UI + server serial. DB CHECK 0..10. */
export const RSVP_ATTENDEE_MIN = 1;

/** Batas atas attendee_count per submit. DB CHECK 0..10. */
export const RSVP_ATTENDEE_MAX = 10;

// ---------------------------------------------------------------------------
// Wish
// ---------------------------------------------------------------------------

/** Panjang maksimum nama pengisi wish (chars). */
export const WISH_NAME_MAX = 100;

/** Panjang maksimum pesan wish (chars). Cocok dengan DB CHECK 1..1000. */
export const WISH_MESSAGE_MAX = 1000;
