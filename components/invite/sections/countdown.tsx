"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicInvitationData } from "@/types/invitation";
import type { ThemeConfig } from "@/lib/themes/types";
import { SectionShell } from "../section-shell";
import { Clock } from "../icons";

/**
 * Velora — Countdown Section (Client Component)
 * -------------------------------------------------------------------
 * Hitung mundur ke tanggal event. Karena Date.now() berbeda di
 * server (saat render) dan client (saat tick), kita hydrate dari
 * server-passed date lalu tick via useEffect.
 *
 * Target = tanggal TERAKHIR antara akad & resepsi (kalau keduanya
 * ada). Kalau hanya salah satu, pakai itu.
 *
 * "use client" di sini isolated — section lain tetap RSC.
 * Reduced-motion safe: lihat globals.css `@media (prefers-reduced-motion)`.
 */
export function CountdownSection({
  theme,
  data,
}: {
  theme: ThemeConfig;
  data: PublicInvitationData;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const targetIso = useMemo(() => {
    const a = data.client.akad_date;
    const r = data.client.resepsi_date;
    if (a && r) return r > a ? r : a;
    return r ?? a;
  }, [data.client.akad_date, data.client.resepsi_date]);

  const remaining = useCountdown(targetIso);

  if (!targetIso) {
    return (
      <SectionShell theme={theme} id="countdown" ariaLabel="Hitung Mundur">
        <CountdownHeader />
        <p className="mt-6 text-center text-sm text-muted">
          Tanggal acara belum ditentukan.
        </p>
      </SectionShell>
    );
  }

  // Tampilkan placeholder 00 sebelum mounted untuk menghindari hydration mismatch
  const days = mounted ? Math.max(0, Math.floor(remaining / (1000 * 60 * 60 * 24))) : 0;
  const hours = mounted ? Math.max(0, Math.floor((remaining / (1000 * 60 * 60)) % 24)) : 0;
  const minutes = mounted ? Math.max(0, Math.floor((remaining / (1000 * 60)) % 60)) : 0;
  const seconds = mounted ? Math.max(0, Math.floor((remaining / 1000) % 60)) : 0;

  return (
    <SectionShell theme={theme} id="countdown" ariaLabel="Hitung Mundur">
      <CountdownHeader />
      <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Cell value={days} label="Hari" placeholder={!mounted} />
        <Cell value={hours} label="Jam" placeholder={!mounted} />
        <Cell value={minutes} label="Menit" placeholder={!mounted} />
        <Cell value={seconds} label="Detik" placeholder={!mounted} />
      </div>
    </SectionShell>
  );
}

function CountdownHeader() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rule/80 bg-surface/50 text-accent backdrop-blur-sm shadow-sm">
        <Clock size={20} aria-hidden="true" />
      </div>
      <h2 className="font-display text-2xl font-semibold italic text-ink sm:text-3xl">
        Save the Date
      </h2>
      <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-muted">
        menuju hari bahagia
      </p>
    </div>
  );
}

function Cell({
  value,
  label,
  placeholder,
}: {
  value: number;
  label: string;
  placeholder?: boolean;
}) {
  const display = placeholder ? "00" : String(value).padStart(2, "0");
  return (
    <div className="relative overflow-hidden rounded-md border border-rule/70 bg-surface px-4 py-8 text-center shadow-[0_4px_20px_-6px_rgba(0,0,0,0.04)] transition hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.06)]">
      {/* Top subtle highlight line */}
      <div className="absolute top-0 inset-x-0 h-[3px] bg-accent/20" />
      <div
        aria-live="polite"
        className="font-display text-4xl font-medium tabular-nums text-accent transition-opacity duration-200 sm:text-5xl md:text-6xl"
      >
        {display}
      </div>
      <div className="mt-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-muted">
        {label}
      </div>
    </div>
  );
}

/**
 * Hook: hitung ms tersisa ke target ISO string. Set interval
 * 1 detik. Return 0 saat target null / terlewat. State di-init
 * dari Date.now() di client (avoid hydration mismatch).
 */
function useCountdown(targetIso: string | null): number {
  const target = targetIso ? new Date(targetIso).getTime() : null;
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (target === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (target === null) return 0;
  return Math.max(0, target - now);
}
