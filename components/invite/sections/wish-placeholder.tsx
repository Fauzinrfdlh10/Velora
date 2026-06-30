"use client";

import { useState } from "react";
import type { PublicInvitationData } from "@/types/invitation";
import type { ThemeConfig } from "@/lib/themes/types";
import { SectionShell } from "../section-shell";
import { Quotes, PaperPlaneTilt, Heart } from "../icons";

/**
 * Velora — Wedding Wish Placeholder (Client Component)
 * -------------------------------------------------------------------
 * Tampilkan list wishes dari `data.wishes` (newest first) plus form
 * untuk menambah wish baru secara in-memory.
 *
 * TAHAP 5: submit HANYA update local state, TIDAK persist ke DB.
 * Tahap berikutnya:Server Action → INSERT ke public.wishes.
 *
 * Avatar = inisial nama (max 2 huruf). Timestamp relative:
 *   <1 m → "baru saja", <1 jam → "X menit lalu", dst.
 * Hitung pakai Date.now() di client, hence "use client".
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
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !message.trim()) return;
          console.log("[wish placeholder] submit", { name, message });
          setList((cur) => [
            {
              id: `local-${Date.now()}`,
              name: name.trim(),
              message: message.trim(),
              created_at: new Date().toISOString(),
            },
            ...cur,
          ]);
          setName("");
          setMessage("");
        }}
        className="mx-auto mt-12 max-w-md rounded-lg border border-rule/75 bg-surface p-6 sm:p-8 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)]"
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
        <div className="mt-5 space-y-4">
          <input
            type="text"
            required
            placeholder="Nama Anda"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-b border-rule/80 bg-transparent px-1 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none transition duration-300"
          />
          <textarea
            required
            rows={3}
            placeholder="Tulis doa & ucapan untuk pengantin…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full resize-none border-b border-rule/80 bg-transparent px-1 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none transition duration-300"
          />
        </div>
        <button
          type="submit"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-inverseInk shadow-sm transition duration-300 hover:bg-accent/90 hover:shadow"
        >
          <PaperPlaneTilt size={14} aria-hidden="true" />
          Kirim Ucapan
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
