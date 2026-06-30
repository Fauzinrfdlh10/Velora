"use server";

/**
 * Velora — Public Invitation Server Actions
 * -------------------------------------------------------------------
 * Tahap 6: Server actions untuk form RSVP dan Wedding Wish di halaman
 * publik. Dipanggil langsung dari client components via React 19
 * `useTransition` (lihat section components).
 *
 * Strategi keamanan (tanpa deps tambahan):
 *   1. Honeypot field `company` — kalau terisi, return fake success.
 *   2. Min-submit-duration: client kirim delta Date.now() saat submit.
 *      Server tolak kalau < 1500ms (lihat lib/actions/security.ts).
 *   3. In-memory rate limit per (kind, ip, slug) — 5 submit / 60 detik.
 *   4. DB-level CHECK constraints (length 1..1000 untuk wish, dll).
 *   5. RLS masih berlaku: anon INSERT ke wishes (allow), tapi RSVP
 *      via RPC SECURITY DEFINER (lihat migration 20260701000000).
 *
 * Strategi mock mode: bila VELORA_USE_MOCK_CLIENT=1, jangan panggil DB
 * sama sekali — return fake success. Berguna untuk preview tema tanpa
 * Supabase. Untuk wish, kita kembalikan row mock supaya bisa prepend
 * ke list lokal client.
 *
 * Strategi validation: hand-rolled (project tidak pakai zod). Setiap
 * aksi memvalidasi sendiri. Return discriminated-union agar caller
 * bisa narrow di TypeScript.
 */

import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  getRequestIdentifier,
  isHoneypotTriggered,
  isRateLimited,
  isSubmitTooFast,
} from "./security";
import {
  RSVP_ATTENDEE_MAX,
  RSVP_ATTENDEE_MIN,
  RSVP_MESSAGE_MAX,
  RSVP_NAME_MAX,
  WISH_MESSAGE_MAX,
  WISH_NAME_MAX,
} from "@/lib/validation/invitation-limits";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RsvpStatus = "attending" | "not_attending" | "maybe";

export type SubmitRsvpInput = {
  clientId: string;
  guestId: string | null;
  name: string;
  status: RsvpStatus;
  attendeeCount: number;
  message: string | null;
  /** Anti-spam honeypot (hidden field from form). MUST be empty. */
  honeypot: string | null;
  /** Milliseconds since form mount. Block kalau < 1500 (see security.ts). */
  durationMs: number;
};

export type SubmitWishInput = {
  clientId: string;
  name: string;
  message: string;
  /** Anti-spam honeypot. MUST be empty. */
  honeypot: string | null;
  /** Milliseconds since form mount. Block kalau < 1500. */
  durationMs: number;
};

export type ActionSuccess<T> = { ok: true; data: T };
export type ActionFailure = {
  ok: false;
  /** Slug-friendly error code UI bisa i18n kalau perlu. */
  code:
    | "invalid_input"
    | "submission_too_fast"
    | "rate_limited"
    | "client_inactive"
    | "guest_not_found"
    | "internal_error";
  message: string;
};
export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

// Konstanta batas-batas validasi di-import dari shared module
// `@/lib/validation/invitation-limits` agar client + server selalu
// setuju tentang nilai yang sama. DB CHECK constraint ada sebagai safety
// net terakhir.

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return typeof value === "string" && UUID_REGEX.test(value);
}

function isValidRsvpStatus(value: unknown): value is RsvpStatus {
  return (
    value === "attending" || value === "not_attending" || value === "maybe"
  );
}

function normalizeText(
  value: unknown,
  opts: { max: number; optional: boolean },
): { ok: true; value: string | null } | { ok: false; reason: string } {
  if (value === undefined || value === null || value === "") {
    if (opts.optional) return { ok: true, value: null };
    return { ok: false, reason: "empty" };
  }
  if (typeof value !== "string") {
    return { ok: false, reason: "wrong_type" };
  }
  const trimmed = value.trim();
  if (!opts.optional && trimmed.length === 0) {
    return { ok: false, reason: "empty" };
  }
  if (trimmed.length > opts.max) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Heuristik user-facing untuk error validasi. Server tetap source of
 * truth — UI boleh render lebih spesifik, tapi generic tetap helpful.
 */
function userMessageFor(code: ActionFailure["code"]): string {
  switch (code) {
    case "invalid_input":
      return "Periksa kembali isian formulir Anda.";
    case "submission_too_fast":
      return "Formulir terdeteksi dikirim terlalu cepat. Coba lagi.";
    case "rate_limited":
      return "Terlalu banyak percobaan dari perangkat Anda. Coba lagi sebentar.";
    case "client_inactive":
      return "Undangan ini tidak sedang menerima konfirmasi saat ini.";
    case "guest_not_found":
      return "Tamu undangan tidak dikenali. Coba lagi lewat link utama.";
    case "internal_error":
      return "Gagal mengirim. Coba lagi sebentar, atau hubungi pengantin jika masalah berlanjut.";
  }
}

// ---------------------------------------------------------------------------
// submitRsvp
// ---------------------------------------------------------------------------

export async function submitRsvp(
  input: SubmitRsvpInput,
): Promise<ActionResult<{ rsvpId: string; updated: boolean }>> {
  // 1) Honeypot — silent fake success agar bot tidak belajar adaptasi.
  if (isHoneypotTriggered(input.honeypot)) {
    return {
      ok: true,
      data: { rsvpId: `bot-${Date.now()}`, updated: false },
    };
  }

  // 2) Min submit duration.
  if (isSubmitTooFast(input.durationMs)) {
    return {
      ok: false,
      code: "submission_too_fast",
      message: userMessageFor("submission_too_fast"),
    };
  }

  // 3) Rate limit.
  const hdrs = await headers();
  const id = getRequestIdentifier(hdrs, input.clientId);
  if (isRateLimited("rsvp", id)) {
    return {
      ok: false,
      code: "rate_limited",
      message: userMessageFor("rate_limited"),
    };
  }

  // 4) Validate input.
  if (!isValidUuid(input.clientId)) {
    return {
      ok: false,
      code: "invalid_input",
      message: userMessageFor("invalid_input"),
    };
  }
  if (input.guestId !== null && !isValidUuid(input.guestId)) {
    return {
      ok: false,
      code: "invalid_input",
      message: userMessageFor("invalid_input"),
    };
  }
  if (!isValidRsvpStatus(input.status)) {
    return {
      ok: false,
      code: "invalid_input",
      message: userMessageFor("invalid_input"),
    };
  }
  const nameNorm = normalizeText(input.name, {
    max: RSVP_NAME_MAX,
    optional: false,
  });
  if (!nameNorm.ok || nameNorm.value === null) {
    return {
      ok: false,
      code: "invalid_input",
      message: userMessageFor("invalid_input"),
    };
  }
  const msgNorm = normalizeText(input.message, {
    max: RSVP_MESSAGE_MAX,
    optional: true,
  });
  if (!msgNorm.ok) {
    return {
      ok: false,
      code: "invalid_input",
      message: userMessageFor("invalid_input"),
    };
  }
  const att =
    typeof input.attendeeCount === "number" ? input.attendeeCount : NaN;
  if (
    !Number.isFinite(att) ||
    att < RSVP_ATTENDEE_MIN ||
    att > RSVP_ATTENDEE_MAX
  ) {
    return {
      ok: false,
      code: "invalid_input",
      message: userMessageFor("invalid_input"),
    };
  }

  // 5) Mock mode short-circuit (untuk preview tema tanpa DB).
  if (process.env.VELORA_USE_MOCK_CLIENT === "1") {
    return {
      ok: true,
      data: { rsvpId: `mock-${Date.now()}`, updated: false },
    };
  }

  // 6) Call RPC upsert_rsvp.
  try {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase.rpc("upsert_rsvp", {
      p_client_id: input.clientId,
      p_guest_id: input.guestId,
      p_name: nameNorm.value,
      p_status: input.status,
      p_attendee_count: att,
      p_message: msgNorm.value,
      p_duration_ms: input.durationMs,
    });

    if (error) {
      const mapped = mapDbError(error.message);
      return {
        ok: false,
        code: mapped,
        message: userMessageFor(mapped),
      };
    }

    const firstRow = Array.isArray(data) ? data[0] : data;
    const rsvpId =
      firstRow && typeof firstRow === "object" && "id" in firstRow
        ? String((firstRow as { id: string }).id)
        : "unknown";
    // Tidak bisa bedakan insert vs update dari response murah — heuristik
    // sederhana: kalau guest_id ada + RPC, kemungkinan besar update.
    return {
      ok: true,
      data: { rsvpId, updated: input.guestId !== null },
    };
  } catch (err) {
    const mapped = mapDbError(err);
    return {
      ok: false,
      code: mapped,
      message: userMessageFor(mapped),
    };
  }
}

// ---------------------------------------------------------------------------
// submitWish
// ---------------------------------------------------------------------------

export type WishRowForList = {
  id: string;
  name: string;
  message: string;
  created_at: string;
};

export async function submitWish(
  input: SubmitWishInput,
): Promise<ActionResult<{ wish: WishRowForList }>> {
  // 1) Honeypot
  if (isHoneypotTriggered(input.honeypot)) {
    return {
      ok: true,
      data: {
        wish: {
          id: `bot-${Date.now()}`,
          name: "Tamu",
          message: "",
          created_at: new Date().toISOString(),
        },
      },
    };
  }

  // 2) Min submit duration.
  if (isSubmitTooFast(input.durationMs)) {
    return {
      ok: false,
      code: "submission_too_fast",
      message: userMessageFor("submission_too_fast"),
    };
  }

  // 3) Rate limit.
  const hdrs = await headers();
  const id = getRequestIdentifier(hdrs, input.clientId);
  if (isRateLimited("wish", id)) {
    return {
      ok: false,
      code: "rate_limited",
      message: userMessageFor("rate_limited"),
    };
  }

  // 4) Validate input.
  if (!isValidUuid(input.clientId)) {
    return {
      ok: false,
      code: "invalid_input",
      message: userMessageFor("invalid_input"),
    };
  }
  const nameNorm = normalizeText(input.name, {
    max: WISH_NAME_MAX,
    optional: false,
  });
  if (!nameNorm.ok || nameNorm.value === null) {
    return {
      ok: false,
      code: "invalid_input",
      message: userMessageFor("invalid_input"),
    };
  }
  const msgNorm = normalizeText(input.message, {
    max: WISH_MESSAGE_MAX,
    optional: false,
  });
  if (!msgNorm.ok || msgNorm.value === null) {
    return {
      ok: false,
      code: "invalid_input",
      message: userMessageFor("invalid_input"),
    };
  }

  // 5) Mock mode short-circuit.
  if (process.env.VELORA_USE_MOCK_CLIENT === "1") {
    return {
      ok: true,
      data: {
        wish: {
          id: `mock-${Date.now()}`,
          name: nameNorm.value,
          message: msgNorm.value,
          created_at: new Date().toISOString(),
        },
      },
    };
  }

  // 6) Call supabase.from('wishes').insert.
  //    RLS publik untuk wishes SUDAH mengizinkan INSERT (lihat migration
  //    20260629000000). Tidak perlu RPC khusus.
  try {
    const supabase = await createSupabaseClient();
    const insertPayload = {
      client_id: input.clientId,
      name: nameNorm.value,
      message: msgNorm.value,
    };

    const { data, error } = await supabase
      .from("wishes")
      .insert(insertPayload)
      .select("id, name, message, created_at")
      .single();

    if (error || !data) {
      const mapped = mapDbError(error?.message ?? "");
      return {
        ok: false,
        code: mapped,
        message: userMessageFor(mapped),
      };
    }

    return {
      ok: true,
      data: {
        wish: {
          id: data.id,
          name: data.name,
          message: data.message,
          created_at: data.created_at,
        },
      },
    };
  } catch (err) {
    const mapped = mapDbError(err);
    return {
      ok: false,
      code: mapped,
      message: userMessageFor(mapped),
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map DB error message / error.code ke ActionFailure code UI-friendly.
 *
 * Urutan match PENTING:
 *   1. Cek Postgres SQLSTATE lewat PostgrestError.code (paling reliable).
 *      23505 = unique_violation, 23514 = check_violation, dst.
 *   2. Fallback ke pencocokan nama exception yang di-raise eksplisit
 *      dari RPC (lihat migration 20260701000000). Nama ini deterministik;
 *      substring dari message Postgres seperti "submission_too_fast"
 *      akan mucncl di sini.
 *   3. Broad regex hanya setelah dua layer di atas selesai.
 */
function mapDbError(err: unknown): ActionFailure["code"] {
  // 1) SQLSTATE kalau ada.
  if (
    err !== null &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  ) {
    const sqlstate = (err as { code: string }).code;
    if (sqlstate === "23505") return "invalid_input"; // unique_violation
    if (sqlstate === "23514") return "invalid_input"; // check_violation (e.g. RPC raise check_violation)
    if (sqlstate === "22P02") return "invalid_input"; // invalid_text_representation (bad UUID)
  }

  // 2) Raw message string (exhaustive named exceptions from our RPC).
  const raw =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "";

  const lower = raw.toLowerCase();

  // Urutan: cek EXCEPTION name penuh DULU (exact-substring), sebelum
  // pola keyword-wide. Ini mencegah false-positive seperti "guest_not_found"
  // terpicu oleh pesan apa pun yang kebetulan memiliki "guest" + "not".
  if (lower.includes("submission_too_fast")) return "submission_too_fast";
  if (lower.includes("client_inactive")) return "client_inactive";
  if (lower.includes("guest_not_found")) return "guest_not_found";

  // 3) Broad fallback (hanya untuk message yang tidak bernama exception).
  if (lower.includes("unique") || lower.includes("duplicate")) {
    return "invalid_input";
  }
  return "internal_error";
}
