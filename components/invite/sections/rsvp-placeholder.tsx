"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ThemeConfig } from "@/lib/themes/types";
import { SectionShell } from "../section-shell";
import { CheckCircle, XCircle, Question, PaperPlaneTilt } from "../icons";
import { submitRsvp, type RsvpStatus } from "@/lib/actions/invitation";
import {
  RSVP_ATTENDEE_MAX,
  RSVP_ATTENDEE_MIN,
  RSVP_MESSAGE_MAX,
  RSVP_NAME_MAX,
} from "@/lib/validation/invitation-limits";

// Batas minimum submit duration (ms) — duplikasi dari
// SECURITY_LIMITS.minSubmitDurationMs di server. Tidak di-export
// dari "use server" module jadi kita mirror. Konstanta berubah
// bersama dengan lib/actions/security.ts.
const MIN_SUBMIT_DURATION_MS_CLIENT = 1500;

/**
 * Velora — RSVP Section (Client Component, TAHAP 6)
 * -------------------------------------------------------------------
 * Form konfirmasi kehadiran yang submit ke tabel `public.rsvps`
 * via Server Action `submitRsvp`. Anonymous (guestId null) = setiap
 * submit menambah entry baru; kalau guestId ada (personal link
 * /i/<slug>?guest=<uuid>), submit kedua dari tamu yang sama UPDATE
 * row yang sudah ada (upsert).
 *
 * Lapisan anti-spam (server-side; lihat lib/actions/security.ts):
 *   1. Honeypot field `company` — hidden, kalau terisi = bot.
 *   2. Min submit duration 1500ms (form mount → submit) — kita catat
 *      `mountedAt` via useEffect dan kirim delta `Date.now() - mountedAt`.
 *   3. Rate limit 5 / menit per (kind, ip, slug).
 *
 * Batas input (validate juga di server; di sini hanya untuk UX):
 *   - Nama: 1..100 char (trim).
 *   - Pesan: opsional, 0..500 char setelah trim.
 *   - Jumlah orang: 1..10 (integer, default 1). Di luar rentang
 *     ditampilkan error inline dan ditolak sebelum call server.
 *
 * State UI:
 *   - `idle`       — form normal, tombol aktif setelah choice selected.
 *   - `submitting` — transisi Server Action jalan; tombol disabled.
 *   - `success`    — kartu konfirmasi "Matur Nuwun" (replace form).
 *   - `error`      — banner error di bawah form + tombol "Coba lagi".
 *
 * Keamanan XSS: pesan RSVP di-render sebagai TEXT biasa (bukan HTML),
 * jadi tidak ada risiko injection di sini.
 */
type View = "idle" | "success" | "error";

export function RsvpPlaceholderSection({
  theme,
  clientId,
  guestId,
}: {
  theme: ThemeConfig;
  clientId: string;
  guestId: string | null;
}) {
  const [choice, setChoice] = useState<RsvpStatus | null>(null);
  const [name, setName] = useState("");
  const [attendeeCount, setAttendeeCount] = useState<number>(1);
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [view, setView] = useState<View>("idle");
  const [mountedAt, setMountedAt] = useState<number | null>(null);

  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);

  // Catat timestamp mount SEKALI. Kalau re-mount (mis. after success →
  // reset ke "Ubah jawaban"), time akan reset sehingga bot tidak bisa
  // resubmit dengan sangat cepat dengan form yang sama.
  useEffect(() => {
    setMountedAt(Date.now());
  }, []);

  // Reset semua state ke initial — dipanggil dari kartu sukses via
  // tombol "Ubah jawaban".
  function reset() {
    setChoice(null);
    setName("");
    setAttendeeCount(1);
    setMessage("");
    setHoneypot("");
    setClientError(null);
    setServerError(null);
    setView("idle");
    setMountedAt(Date.now());
  }

  function validate(): { ok: boolean; reason: string | null } {
    if (!choice) {
      return { ok: false, reason: "Pilih status kehadiran terlebih dahulu." };
    }
    const n = name.trim();
    if (n.length === 0) {
      return { ok: false, reason: "Nama tidak boleh kosong." };
    }
    if (n.length > RSVP_NAME_MAX) {
      return {
        ok: false,
        reason: `Nama terlalu panjang (maks ${RSVP_NAME_MAX} karakter).`,
      };
    }
    if (
      !Number.isInteger(attendeeCount) ||
      attendeeCount < RSVP_ATTENDEE_MIN ||
      attendeeCount > RSVP_ATTENDEE_MAX
    ) {
      return {
        ok: false,
        reason: `Jumlah orang harus ${RSVP_ATTENDEE_MIN}–${RSVP_ATTENDEE_MAX}.`,
      };
    }
    const m = message.trim();
    if (m.length > RSVP_MESSAGE_MAX) {
      return {
        ok: false,
        reason: `Pesan terlalu panjang (maks ${RSVP_MESSAGE_MAX} karakter).`,
      };
    }
    if (mountedAt !== null) {
      const delta = Date.now() - mountedAt;
      if (delta < MIN_SUBMIT_DURATION_MS_CLIENT) {
        return { ok: false, reason: null }; // Serius spam — silent fail di sisi server
      }
    }
    return { ok: true, reason: null };
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);
    setServerError(null);

    const check = validate();
    if (!check.ok) {
      if (check.reason) setClientError(check.reason);
      return;
    }
    if (mountedAt === null || choice === null) return;

    const durationMs = Date.now() - mountedAt;

    startTransition(async () => {
      const result = await submitRsvp({
        clientId,
        guestId,
        name: name.trim(),
        status: choice,
        attendeeCount,
        message: message.trim() === "" ? null : message.trim(),
        honeypot: honeypot === "" ? null : honeypot,
        durationMs,
      });

      if (result.ok) {
        setView("success");
        return;
      }

      // Error codes tertentu (bot honeypot, submission too fast, rate
      // limit) dirender generic; kode lainnya pakai server msg langsung.
      setServerError(result.message);
      setView("error");
    });
  }

  if (view === "success") {
    return <SuccessCard theme={theme} guestId={guestId} onReset={reset} />;
  }

  const disableSubmit = pending || choice === null;

  return (
    <SectionShell theme={theme} id="rsvp" ariaLabel="Konfirmasi Kehadiran">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rule/80 bg-surface/50 text-accent backdrop-blur-sm shadow-sm">
          <CheckCircle size={20} aria-hidden="true" />
        </div>
        <h2 className="font-display text-3xl font-semibold italic text-ink">
          Konfirmasi Kehadiran
        </h2>
        <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-muted">
          rsvp form
        </p>
        {guestId ? (
          <p className="mt-3 text-[10px] uppercase tracking-[0.24em] text-accent/80">
            link personal · jawaban kedua akan memperbarui jawaban pertama
          </p>
        ) : null}
      </div>

      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="relative mx-auto max-w-md rounded-lg border border-rule/75 bg-surface p-6 sm:p-8 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)]"
      >
        {/* Honeypot — visually + AT hidden, tapi tetap submit-able via JS bot.
            Diletakkan di luar grid/interactive elements. */}
        <div
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        >
          <label>
            Company (jangan diisi):
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </label>
        </div>

        {/* Pilihan hadir */}
        <fieldset>
          <legend className="sr-only">Pilihan kehadiran</legend>
          <div className="grid grid-cols-3 gap-3">
            <ChoiceCard
              label="Hadir"
              icon={<CheckCircle size={20} aria-hidden="true" />}
              selected={choice === "attending"}
              onSelect={() => setChoice("attending")}
            />
            <ChoiceCard
              label="Absen"
              icon={<XCircle size={20} aria-hidden="true" />}
              selected={choice === "not_attending"}
              onSelect={() => setChoice("not_attending")}
            />
            <ChoiceCard
              label="Mungkin"
              icon={<Question size={20} aria-hidden="true" />}
              selected={choice === "maybe"}
              onSelect={() => setChoice("maybe")}
            />
          </div>
        </fieldset>

        {/* Name + jumlah + pesan opsional */}
        <div className="mt-8 space-y-5">
          <label className="block">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.25em] text-muted">
              Nama Lengkap
            </span>
            <input
              type="text"
              required
              maxLength={RSVP_NAME_MAX}
              placeholder="Masukkan nama Anda"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full border-b border-rule/80 bg-transparent px-1 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none transition duration-300"
            />
          </label>

          <label className="block">
            <span className="flex items-baseline justify-between text-[9px] font-semibold uppercase tracking-[0.25em] text-muted">
              <span>Jumlah Orang</span>
              <span className="text-[9px] normal-case tracking-normal text-muted/70">
                {RSVP_ATTENDEE_MIN}–{RSVP_ATTENDEE_MAX}
              </span>
            </span>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setAttendeeCount((c) =>
                    Math.max(RSVP_ATTENDEE_MIN, c - 1),
                  )
                }
                disabled={attendeeCount <= RSVP_ATTENDEE_MIN}
                aria-label="Kurangi jumlah"
                className="h-9 w-9 rounded-full border border-rule bg-surface text-sm font-semibold text-ink transition hover:border-accent/50 disabled:opacity-40"
              >
                −
              </button>
              <input
                type="number"
                min={RSVP_ATTENDEE_MIN}
                max={RSVP_ATTENDEE_MAX}
                value={attendeeCount}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setAttendeeCount(v);
                }}
                className="w-16 border-b border-rule/80 bg-transparent px-1 py-2 text-center text-sm tabular-nums text-ink focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setAttendeeCount((c) =>
                    Math.min(RSVP_ATTENDEE_MAX, c + 1),
                  )
                }
                disabled={attendeeCount >= RSVP_ATTENDEE_MAX}
                aria-label="Tambah jumlah"
                className="h-9 w-9 rounded-full border border-rule bg-surface text-sm font-semibold text-ink transition hover:border-accent/50 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </label>

          <label className="block">
            <span className="flex items-baseline justify-between text-[9px] font-semibold uppercase tracking-[0.25em] text-muted">
              <span>Pesan Tambahan (opsional)</span>
              <span className="text-[9px] normal-case tracking-normal text-muted/70">
                {message.trim().length}/{RSVP_MESSAGE_MAX}
              </span>
            </span>
            <textarea
              rows={3}
              maxLength={RSVP_MESSAGE_MAX}
              placeholder="Tulis ucapan selamat atau catatan..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2 w-full resize-none border-b border-rule/80 bg-transparent px-1 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none transition duration-300"
            />
          </label>
        </div>

        {/* Error banner */}
        {(clientError || serverError) && view === "error" ? (
          <div
            role="alert"
            className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <p className="font-semibold">Gagal mengirim konfirmasi</p>
            <p className="mt-1 text-xs leading-relaxed">
              {serverError ?? clientError}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] opacity-70">
              Coba lagi sebentar. Data Anda belum tersimpan.
            </p>
          </div>
        ) : clientError ? (
          <p
            role="alert"
            className="mt-6 text-xs text-red-700"
          >
            {clientError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={disableSubmit}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-inverseInk shadow-sm transition duration-300 hover:bg-accent/90 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? (
            <>
              <span
                className="h-3 w-3 animate-spin rounded-full border-2 border-inverseInk/30 border-t-inverseInk"
                aria-hidden="true"
              />
              <span>Mengirim...</span>
            </>
          ) : (
            <>
              <PaperPlaneTilt size={14} aria-hidden="true" />
              <span>Kirim Konfirmasi</span>
            </>
          )}
        </button>
      </form>
    </SectionShell>
  );
}

function SuccessCard({
  theme,
  guestId,
  onReset,
}: {
  theme: ThemeConfig;
  guestId: string | null;
  onReset: () => void;
}) {
  return (
    <SectionShell theme={theme} id="rsvp" ariaLabel="Konfirmasi Kehadiran">
      <div className="mx-auto max-w-md rounded-lg border border-rule/75 bg-surface p-8 text-center shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[4px] bg-accent/70" />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <CheckCircle
            size={30}
            aria-hidden="true"
            className="text-accent"
            weight="regular"
          />
        </div>
        <h3 className="font-display text-2xl font-semibold text-ink">
          Matur Nuwun / Terima Kasih
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Konfirmasi kehadiran Anda telah tercatat oleh pasangan.
          {guestId ? (
            <>
              {" "}
              Anda dapat memperbarui jawaban dengan mengirim ulang
              konfirmasi kapan saja.
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-6 text-[9px] font-semibold uppercase tracking-[0.25em] text-accent underline underline-offset-4 hover:text-accent/80 transition"
        >
          Ubah jawaban
        </button>
      </div>
    </SectionShell>
  );
}

function ChoiceCard({
  label,
  icon,
  selected,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-lg border p-4 text-center transition duration-300 ${
        selected
          ? "border-accent bg-accent text-inverseInk shadow-[0_4px_15px_-4px_rgba(140,98,57,0.3)]"
          : "border-rule/80 bg-surface text-ink hover:border-accent/40"
      }`}
    >
      <div className="flex justify-center text-current">{icon}</div>
      <div className="mt-2 text-[9px] font-semibold uppercase tracking-[0.18em]">
        {label}
      </div>
    </button>
  );
}
