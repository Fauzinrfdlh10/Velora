"use client";

import { useState } from "react";
import type { ThemeConfig } from "@/lib/themes/types";
import { SectionShell } from "../section-shell";
import { CheckCircle, XCircle, Question, PaperPlaneTilt } from "../icons";

/**
 * Velora — RSVP Placeholder (Client Component)
 * -------------------------------------------------------------------
 * TAHAP 5: UI SAJA. Submit HANYA menampilkan success state lokal,
 * TIDAK insert ke database. Tahap berikutnya:Server Action →
 * INSERT ke public.rsvps.
 *
 * Layout: 3 kartu pilihan status (Hadir / Tidak Hadir / Mungkin) +
 * field nama & pesan opsional + tombol Kirim. Submit valid pilihan
 * dulu sebelum enable.
 */
type Choice = "attending" | "not_attending" | "maybe";

export function RsvpPlaceholderSection({ theme }: { theme: ThemeConfig }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
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
          <h3 className="font-display text-2xl font-semibold text-ink">Matur Nuwun / Terima Kasih</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Konfirmasi kehadiran Anda telah berhasil dicatat dalam simulasi.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-6 text-[9px] font-semibold uppercase tracking-[0.25em] text-accent underline underline-offset-4 hover:text-accent/80 transition"
          >
            Ubah jawaban
          </button>
        </div>
      </SectionShell>
    );
  }

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
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          console.log("[rsvp placeholder] submit", { choice, name, message });
          if (choice) setSubmitted(true);
        }}
        className="mx-auto max-w-md rounded-lg border border-rule/75 bg-surface p-6 sm:p-8 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)]"
      >
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

        {/* Name + pesan opsional */}
        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.25em] text-muted">
              Nama Lengkap
            </span>
            <input
              type="text"
              required
              placeholder="Masukkan nama Anda"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full border-b border-rule/80 bg-transparent px-1 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none transition duration-300"
            />
          </label>
          <label className="block">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.25em] text-muted">
              Pesan Tambahan (opsional)
            </span>
            <textarea
              rows={3}
              placeholder="Tulis ucapan selamat atau catatan..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2 w-full resize-none border-b border-rule/80 bg-transparent px-1 py-2 text-sm text-ink placeholder:text-muted/50 focus:border-accent focus:outline-none transition duration-300"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!choice}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-inverseInk shadow-sm transition duration-300 hover:bg-accent/90 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PaperPlaneTilt size={14} aria-hidden="true" />
          Kirim Konfirmasi
        </button>
      </form>
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
      <div className="mt-2 text-[9px] font-semibold uppercase tracking-[0.18em]">{label}</div>
    </button>
  );
}
