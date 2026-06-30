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

  const days = Math.max(0, Math.floor(remaining / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((remaining / (1000 * 60 * 60)) % 24));
  const minutes = Math.max(0, Math.floor((remaining / (1000 * 60)) % 60));
  const seconds = Math.max(0, Math.floor((remaining / 1000) % 60));

  return (
    <SectionShell theme={theme} id="countdown" ariaLabel="Hitung Mundur">
      <CountdownHeader />
      <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Cell value={days} label="Hari" />
        <Cell value={hours} label="Jam" />
        <Cell value={minutes} label="Menit" />
        <Cell value={seconds} label="Detik" />
      </div>
    </SectionShell>
  );
}

function CountdownHeader() {
  return (
    <div className="text-center">
      <Clock
        size={28}
        aria-hidden="true"
        className="mx-auto mb-4 text-accent"
      />
      <h2 className="font-display text-2xl italic text-ink sm:text-3xl">
        Counting the days
      </h2>
      <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-muted">
        menuju hari bahagia
      </p>
    </div>
  );
}

function Cell({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, "0");
  return (
    <div className="rounded-sm border-y border-rule bg-surface px-3 py-6 text-center">
      <div
        aria-live="polite"
        className="font-display text-5xl font-medium tabular-nums text-ink transition-opacity duration-200 sm:text-6xl"
      >
        {display}
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.28em] text-muted">
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
