"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { PublicInvitationData } from "@/types/invitation";
import type { ThemeConfig } from "@/lib/themes/types";
import { SectionShell } from "../section-shell";
import { Quotes, PaperPlaneTilt, Heart } from "../icons";
import { submitWish } from "@/lib/actions/invitation";
import {
  WISH_MESSAGE_MAX,
  WISH_NAME_MAX,
} from "@/lib/validation/invitation-limits";

/**
 * Velora — Wedding Wish Section (Client Component, TAHAP 6)
 * -------------------------------------------------------------------
 * Tampilkan list wishes dari `data.wishes` (SSR-fetched, newest first)
 * plus form untuk menambah wish baru yang TERSIMPAN ke tabel
 * `public.wishes` via Server Action `submitWish`.
 *
 * Setelah submit sukses:
 *   - Wish baru dari response server di-prepend ke list lokal (no
 *     reload). `created_at` dari server (bukan `Date.now()` di client)
 *     sehingga timestamp konsisten walau form submit telat.
 *   - Form input di-reset untuk entry berikutnya.
 *
 * Anti-spam (sama dengan RSVP; lihat lib/actions/security.ts):
 *   1. Honeypot `company` field.
 *   2. Min submit duration 1500ms.
 *   3. Rate limit 5 / menit per (wish, ip, slug).
 *
 * XSS: message di-render sebagai TEXT biasa (`<p>{w.message}</p>`)
 * sehingga sanitasi XSS terjadi natural via React escaping. Tidak
 * ada dangerouslySetInnerHTML.
 */
type Wish = PublicInvitationData["wishes"][number];

export function WishPlaceholderSection({
  theme,
  data,
}: {
  theme: ThemeConfig;
  data: PublicInvitationData;
}) {
  const [list, setList] = useState<Wish[]>(data.wishes);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [mountedAt, setMountedAt] = useState<number | null>(null);

  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);

  // Catat mount-time saat section pertama dirender; reset hanya saat
  // hard reload (key prop) karena kami tidak sengaja reset form setelah
  // submit sukses (form siap untuk entry berikutnya).
  useEffect(() => {
    setMountedAt(Date.now());
  }, []);

  function validate(): { ok: boolean; reason: string | null } {
    const n = name.trim();
    if (n.length === 0) {
      return { ok: false, reason: "Nama tidak boleh kosong." };
    }
    if (n.length > WISH_NAME_MAX) {
      return {
        ok: false,
        reason: `Nama terlalu panjang (maks ${WISH_NAME_MAX} karakter).`,
      };
    }
    const m = message.trim();
    if (m.length === 0) {
      return { ok: false, reason: "Pesan ucapan tidak boleh kosong." };
    }
    if (m.length > WISH_MESSAGE_MAX) {
      return {
        ok: false,
        reason: `Pesan terlalu panjang (maks ${WISH_MESSAGE_MAX} karakter).`,
      };
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
    if (mountedAt === null) return;

    const durationMs = Date.now() - mountedAt;
    const clientId = data.client.id;

    startTransition(async () => {
      const result = await submitWish({
        clientId,
        name: name.trim(),
        message: message.trim(),
        honeypot: honeypot === "" ? null : honeypot,
        durationMs,
      });

      if (result.ok) {
        // Prepend row dari server. Server sudah normalisasi (trim) +
        // timestamps akurat. Tidak perlu Date.now() client-side —
        // clock-skew tidak akan jadi masalah.
        setList((cur) => [result.data.wish, ...cur]);
        setName("");
        setMessage("");
        setHoneypot("");
        setClientError(null);
        setServerError(null);
        // Catatan: TIDAK reset mountedAt setelah submit sukses.
        // 1500ms threshold adalah "lama form dibuka sebelum submit
        // pertama", bukan jeda antar submit. Reset di tengah sesi
        // akan memblokir legitimate rapid submissions dari user yang
        // beretik cepat (dikoreksi dari review internal).
        return;
      }
      setServerError(result.message);
    });
  }

  return (
    <SectionShell theme={theme} id="wish" ariaLabel="Ucapan & Doa">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rule/80 bg-surface/50 text-accent backdrop-blur-sm shadow-sm">
          <Quotes size={20} aria-hidden="true" />
        </div>
        <h2 className="font-display text-3xl font-semibold italic text-ink">
          Ucapan &amp; Doa
        </h2>
        <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-muted">
          wedding wishes
        </p>
      </div>

      {/* List wishes */}
      {list.length === 0 ? (
        <p className="mx-auto max-w-md text-center text-sm text-muted">
          Belum ada ucapan. Jadilah yang pertama!
        </p>
      ) : (
        <ul className="mx-auto max-w-xl space-y-4">
          {list.map((w) => (
            <li
              key={w.id}
              className="rounded-lg border border-rule/75 bg-surface px-6 py-5 shadow-[0_3px_15px_-4px_rgba(0,0,0,0.02)] transition duration-300 hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold uppercase text-accent">
                  {initials(w.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-ink truncate">
                      {w.name}
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">
                      {relative(w.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink/80 break-words">
                    {w.message}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Form tambah wish */}
      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="relative mx-auto mt-12 max-w-md rounded-lg border border-rule/75 bg-surface p-6 sm:p-8 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)]"
      >
        <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
          <Heart
            size={14}
            aria-hidden="true"
            className="text-accent"
            weight="fill"
          />
          Kirim Ucapan
        </h3>

        {/* Honeypot field — visually & AT hidden, di luar grid interaktif. */}
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

        <div className="mt-5 space-y-4">
          <input
            type="text"
            required
            maxLength={WISH_NAME_MAX}
            placeholder="Nama Anda"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-b border-rule/80 bg-transparent px-1 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none transition duration-300"
          />
          <textarea
            required
            rows={3}
            maxLength={WISH_MESSAGE_MAX}
            placeholder="Tulis doa & ucapan untuk pengantin…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full resize-none border-b border-rule/80 bg-transparent px-1 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none transition duration-300"
          />
        </div>

        {(clientError || serverError) ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
          >
            <p className="font-semibold">Gagal mengirim ucapan</p>
            <p className="mt-1 leading-relaxed">
              {serverError ?? clientError}
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-inverseInk shadow-sm transition duration-300 hover:bg-accent/90 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
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
              <span>Kirim Ucapan</span>
            </>
          )}
        </button>
      </form>
    </SectionShell>
  );
}

/**
 * Initials avatar: up to 2 uppercased letters dari kata pertama nama.
 * Mis. "Budi Santoso" → "BU".
 */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

/**
 * Format timestamp ISO ke bahasa natural Indonesia:
 *   <1 m   → "baru saja"
 *   <1 jam → "X menit lalu"
 *   <24 jam → "X jam lalu"
 *   <7 hari → "X hari lalu"
 *   else   → tanggal lengkap
 */
function relative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
