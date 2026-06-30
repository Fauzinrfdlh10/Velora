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
        <div className="mx-auto max-w-md text-center">
          <CheckCircle
            size={48}
            aria-hidden="true"
            className="mx-auto text-accent"
            weight="regular"
          />
          <h3 className="mt-4 font-display text-xl text-ink">Terima kasih.</h3>
          <p className="mt-2 text-sm text-muted">
            Konfirmasi Anda telah kami terima (saat ini hanya simulasi).
            Pada rilis berikutnya, data akan benar-benar tersimpan.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-6 text-[10px] uppercase tracking-[0.28em] text-muted underline-offset-4 hover:underline"
          >
            Ubah jawaban
          </button>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell theme={theme} id="rsvp" ariaLabel="Konfirmasi Kehadiran">
      <div className="mb-8 text-center">
        <h2 className="font-display text-2xl italic text-ink sm:text-3xl">
          Konfirmasi Kehadiran
        </h2>
        <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-muted">
          rsvp
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Tahap 5: dummy submit. Tahap 6+:Server Action → Supabase INSERT.
          console.log("[rsvp placeholder] submit", { choice, name, message });
          if (choice) setSubmitted(true);
        }}
        className="mx-auto max-w-md"
      >
        {/* Pilihan hadir */}
        <fieldset>
          <legend className="sr-only">Pilihan kehadiran</legend>
          <div className="grid grid-cols-3 gap-2">
            <ChoiceCard
              label="Hadir"
              icon={<CheckCircle size={22} aria-hidden="true" />}
              selected={choice === "attending"}
              onSelect={() => setChoice("attending")}
            />
            <ChoiceCard
              label="Tidak Hadir"
              icon={<XCircle size={22} aria-hidden="true" />}
              selected={choice === "not_attending"}
              onSelect={() => setChoice("not_attending")}
            />
            <ChoiceCard
              label="Mungkin"
              icon={<Question size={22} aria-hidden="true" />}
              selected={choice === "maybe"}
              onSelect={() => setChoice("maybe")}
            />
          </div>
        </fieldset>

        {/* Name + pesan opsional */}
        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-[0.28em] text-muted">
              Nama
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border-b border-rule bg-transparent px-0 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-[0.28em] text-muted">
              Pesan (opsional)
            </span>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full resize-none border-b border-rule bg-transparent px-0 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!choice}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-ink px-4 py-3 text-[10px] font-medium uppercase tracking-[0.28em] text-inverseInk transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PaperPlaneTilt size={16} aria-hidden="true" />
          Kirim Konfirmasi
        </button>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.28em] text-muted">
          placeholder — submission menyusul di tahap berikutnya
        </p>
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
      className={`rounded-sm border p-3 text-center transition ${
        selected
          ? "border-accent bg-accent text-inverseInk"
          : "border-rule bg-surface text-ink hover:border-ink"
      }`}
    >
      <div className="flex justify-center">{icon}</div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.18em]">{label}</div>
    </button>
  );
}
