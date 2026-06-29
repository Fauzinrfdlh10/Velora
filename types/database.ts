/**
 * Velora — Database Type Definitions
 * -------------------------------------------------------------------
 * Hand-written types matching the SQL schema defined in
 * `supabase/migrations/20260629000000_init_velora_schema.sql`.
 *
 * This file is structured to be a near-drop-in replacement for the output
 * of `supabase gen types typescript --linked` so it can be swapped out
 * once the Supabase CLI is linked to a real project:
 *
 *   supabase gen types typescript --linked > types/database.ts
 *
 * Conventions
 *  - Each table has a Row type (= the SELECT shape), an Insert type
 *    (= writes — defaults applied), and an Update type (= partial
 *    updates). Matches Supabase's Database['public']['Tables'][T].
 *  - Timestamps are ISO-8601 strings (timestamptz round-trips to string
 *    in @supabase/supabase-js).
 *  - JSONB is exported as a typed interface (BankAccount) with a fallback
 *    cast for DB rows we haven't parsed yet (Json / unknown).
 *  - Enums are exported both as `InviterStatus`-style TypeScript unions
 *    and on Database['public']['Enums'] so generated code matches.
 */

// ---------------------------------------------------------------------------
// JSON helpers (for jsonb columns)
// ---------------------------------------------------------------------------
/** Free-form JSON value (DB round-trip type). Parse at the boundary. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Enum types (mirror Postgres enums in supabase/migrations/...init_velora_schema.sql)
// ---------------------------------------------------------------------------
export type InvitationStatus = "draft" | "active" | "inactive" | "expired";
export type InvitationPackage = "basic" | "standard" | "premium";
export type GuestInvitationStatus = "pending" | "sent";
export type RsvpStatus = "attending" | "not_attending" | "maybe";
export type WishStatus = "visible" | "hidden";
export type GiftStatus = "pending" | "verified" | "rejected";

// ---------------------------------------------------------------------------
// Domain shapes stored inside jsonb columns
// ---------------------------------------------------------------------------
/** Shape of an entry in `public.clients.bank_accounts` (jsonb). */
export interface BankAccount {
  /** Bank name (e.g. "BCA", "Mandiri"). */
  bank: string;
  /** Account holder name as written on the account. */
  account_name: string;
  /** Account number. Stored as string to preserve leading zeros. */
  account_number: string;
  /** Optional notes shown to senders (e.g. "a/n atas nama pengantin wanita"). */
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// public.clients
// ---------------------------------------------------------------------------
export interface Client {
  id: string;
  user_id: string;
  groom_name: string;
  bride_name: string;
  slug: string;
  akad_date: string | null;
  akad_location: string | null;
  akad_maps_url: string | null;
  resepsi_date: string | null;
  resepsi_location: string | null;
  resepsi_maps_url: string | null;
  theme: string;
  package: InvitationPackage;
  status: InvitationStatus;
  expires_at: string;
  bank_accounts: BankAccount[];
  created_at: string;
  updated_at: string;
}
export interface ClientInsert {
  /** Server-managed. */
  id?: string;
  /** Required: the auth.users.id of the new tenant. */
  user_id: string;
  groom_name: string;
  bride_name: string;
  slug: string;
  akad_date?: string | null;
  akad_location?: string | null;
  akad_maps_url?: string | null;
  resepsi_date?: string | null;
  resepsi_location?: string | null;
  resepsi_maps_url?: string | null;
  /** Defaults to 'classic' in the DB. */
  theme?: string;
  /** Defaults to 'basic' in the DB. */
  package?: InvitationPackage;
  /** Defaults to 'draft' in the DB. */
  status?: InvitationStatus;
  /** Defaults to now() + 1 year in the DB (and the handle_new_user trigger). */
  expires_at?: string;
  /** Defaults to '[]'::jsonb. Accept either parsed array or raw Json. */
  bank_accounts?: BankAccount[] | Json;
  /** Server-managed. */
  created_at?: string;
  /** Server-managed. */
  updated_at?: string;
}
export type ClientUpdate = Partial<ClientInsert>;

// ---------------------------------------------------------------------------
// public.guests
// ---------------------------------------------------------------------------
export interface Guest {
  id: string;
  client_id: string;
  name: string;
  slug: string;
  invitation_status: GuestInvitationStatus;
  created_at: string;
}
export interface GuestInsert {
  id?: string;
  client_id: string;
  name: string;
  slug: string;
  /** Defaults to 'pending' in the DB. */
  invitation_status?: GuestInvitationStatus;
  created_at?: string;
}
export type GuestUpdate = Partial<GuestInsert>;

// ---------------------------------------------------------------------------
// public.rsvps
// ---------------------------------------------------------------------------
export interface Rsvp {
  id: string;
  client_id: string;
  /** NULLABLE: anonymous invite-page RSVPs (no personal link) have no guest_id. */
  guest_id: string | null;
  name: string;
  status: RsvpStatus;
  /** Defaults to 1 in the DB. CHECK constraint 0..10. */
  attendee_count: number;
  message: string | null;
  created_at: string;
}
export interface RsvpInsert {
  id?: string;
  client_id: string;
  /** Optional. Insert with null when RSVP comes from the public invite page. */
  guest_id?: string | null;
  name: string;
  status: RsvpStatus;
  /** Defaults to 1. CHECK 0..10 in the DB. */
  attendee_count?: number;
  message?: string | null;
  created_at?: string;
}
export type RsvpUpdate = Partial<RsvpInsert>;

// ---------------------------------------------------------------------------
// public.wishes
// ---------------------------------------------------------------------------
export interface Wish {
  id: string;
  client_id: string;
  name: string;
  /** CHECK constraint in DB: length between 1 and 1000 chars. */
  message: string;
  /** Defaults to 'visible' in the DB. Owner can set to 'hidden' to moderate. */
  status: WishStatus;
  created_at: string;
}
export interface WishInsert {
  id?: string;
  client_id: string;
  name: string;
  message: string;
  status?: WishStatus;
  created_at?: string;
}
export type WishUpdate = Partial<WishInsert>;

// ---------------------------------------------------------------------------
// public.gallery_photos
// ---------------------------------------------------------------------------
export interface GalleryPhoto {
  id: string;
  client_id: string;
  /** URL to the file in the `gallery` Supabase Storage bucket. */
  url: string;
  /** Display order within the client. Defaults to 0. */
  position: number;
  created_at: string;
}
export interface GalleryPhotoInsert {
  id?: string;
  client_id: string;
  url: string;
  position?: number;
  created_at?: string;
}
export type GalleryPhotoUpdate = Partial<GalleryPhotoInsert>;

// ---------------------------------------------------------------------------
// public.gifts
// ---------------------------------------------------------------------------
export interface Gift {
  id: string;
  client_id: string;
  sender_name: string;
  /** Optional. Sender may omit amount. numeric(15,2) in DB → string here. */
  amount: string | null;
  /** Optional. URL to transfer-proof image in `gifts` SUPA bucket. */
  proof_url: string | null;
  /** Defaults to 'pending' in the DB. Owner flips to 'verified' / 'rejected'. */
  status: GiftStatus;
  created_at: string;
}
export interface GiftInsert {
  id?: string;
  client_id: string;
  sender_name: string;
  amount?: string | number | null;
  proof_url?: string | null;
  status?: GiftStatus;
  created_at?: string;
}
export type GiftUpdate = Partial<GiftInsert>;

// ---------------------------------------------------------------------------
// Database composite (Supabase-style)
// ---------------------------------------------------------------------------
/**
 * Shape mirrors what `supabase gen types typescript --linked` produces.
 * The application imports this and uses:
 *   import type { Database } from '@/types/database';
 *   const { data } = await supabase.from('clients').select('*');
 *     // data is Database['public']['Tables']['clients']['Row'][]
 *
 * When you regenerate, `supabase gen types` will overwrite this file in a
 * compatible shape. If you hand-edit, keep the structure below intact.
 */
export type Database = {
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: ClientInsert;
        Update: ClientUpdate;
        Relationships: [];
      };
      guests: {
        Row: Guest;
        Insert: GuestInsert;
        Update: GuestUpdate;
        Relationships: [];
      };
      rsvps: {
        Row: Rsvp;
        Insert: RsvpInsert;
        Update: RsvpUpdate;
        Relationships: [];
      };
      wishes: {
        Row: Wish;
        Insert: WishInsert;
        Update: WishUpdate;
        Relationships: [];
      };
      gallery_photos: {
        Row: GalleryPhoto;
        Insert: GalleryPhotoInsert;
        Update: GalleryPhotoUpdate;
        Relationships: [];
      };
      gifts: {
        Row: Gift;
        Insert: GiftInsert;
        Update: GiftUpdate;
        Relationships: [];
      };
    };
    Enums: {
      invitation_status: InvitationStatus;
      invitation_package: InvitationPackage;
      guest_invitation_status: GuestInvitationStatus;
      rsvp_status: RsvpStatus;
      wish_status: WishStatus;
      gift_status: GiftStatus;
    };
  };
};

// ---------------------------------------------------------------------------
// Convenience aliases
// ---------------------------------------------------------------------------
/** Shorthand for "any row that this table's RLS will actually return". */
export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
export type GuestRow = Database["public"]["Tables"]["guests"]["Row"];
export type RsvpRow = Database["public"]["Tables"]["rsvps"]["Row"];
export type WishRow = Database["public"]["Tables"]["wishes"]["Row"];
export type GalleryPhotoRow =
  Database["public"]["Tables"]["gallery_photos"]["Row"];
export type GiftRow = Database["public"]["Tables"]["gifts"]["Row"];
