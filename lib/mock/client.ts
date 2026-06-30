import type { PublicInvitationData } from "@/types/invitation";
import { getMockGallery } from "./gallery";
import { getMockWishes } from "./wishes";
import { getMockBankAccounts } from "./bank-accounts";

/**
 * Velora — Mock Invitation (development only)
 * -------------------------------------------------------------------
 * Aktif bila env var `VELORA_USE_MOCK_CLIENT=1` di .env.local.
 *
 * Tujuan: visualisasi tema 'Sana' + semua section placeholder tanpa
 * perlu row Supabase sungguhan. Date relatif terhadap `Date.now()` —
 * akad di 45 hari ke depan, resepsi 46 hari ke depan — supaya
 * countdown benar-benar "jalan" setiap kali halaman dimuat.
 *
 * Shape mengikuti `PublicInvitationData` 1:1 sehingga section
 * components TIDAK bisa membedakan mock vs real (good encapsulation).
 */
export function getMockInvitation(): PublicInvitationData {
  const day = 1000 * 60 * 60 * 24;
  return {
    client: {
      id: "00000000-0000-0000-0000-000000000000",
      slug: "dev-preview",
      groom_name: "Andi",
      bride_name: "Sari",
      akad_date: new Date(Date.now() + 45 * day).toISOString(),
      akad_location: "Masjid Al-Ikhlas, Jakarta Selatan",
      akad_maps_url: "https://maps.google.com/?q=-6.2615,106.8106",
      resepsi_date: new Date(Date.now() + 46 * day).toISOString(),
      resepsi_location: "Gedung Graha Widya Sabha, Jakarta",
      resepsi_maps_url: "https://maps.google.com/?q=-6.2184,106.8076",
      status: "active",
      expires_at: new Date(Date.now() + 365 * day).toISOString(),
      theme: "sana",
    },
    gallery: getMockGallery(),
    wishes: getMockWishes(),
    bankAccounts: getMockBankAccounts(),
    guestName: null,
  };
}
