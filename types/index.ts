/**
 * Type definitions untuk project Velora.
 *
 * Entry point yang me-re-export seluruh tipe database. Definisi lengkap
 * berada di `./database` (database, enum, dan Row/Insert/Update per tabel).
 *
 * Untuk meregenerasi tipe dari schema Supabase yang aktif, jalankan:
 *   supabase gen types typescript --linked > types/database.ts
 */

export * from "./database";
