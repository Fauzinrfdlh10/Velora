"use client";

import { useState } from "react";
import type { PublicInvitationData } from "@/types/invitation";
import type { ThemeConfig } from "@/lib/themes/types";
import { SectionShell } from "../section-shell";
import { Bank, Copy, Heart } from "../icons";

/**
 * Velora — Amplop Digital Placeholder (Client Component)
 * -------------------------------------------------------------------
 * Tampilkan daftar rekening pengantin dari `data.bankAccounts`.
 * Tombol "Salin" memanggil `navigator.clipboard.writeText` dengan
 * graceful fallback ke `alert()` (browser legacy / iframe sandbox).
 *
 * TAHAP 5: TIDAK ada form untuk TAMU mengirim amplop (sender flow
 * berbeda — bukan bagian dari undangan publik). Yang penting di sini:
 *   - Tamu bisa menyalin nomor rekening dengan 1 klik
 *   - Mask account number untuk mencegah shoulder-surfing di screenshot
 *
 * Nomor rekening tampil dengan mask: 4 digit pertama ••• 2 digit terakhir.
 */
export function AmplopPlaceholderSection({
  theme,
  data,
}: {
  theme: ThemeConfig;
  data: PublicInvitationData;
}) {
  const accounts = data.bankAccounts;
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  return (
    <SectionShell theme={theme} id="amplop" ariaLabel="Amplop Digital">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rule/80 bg-surface/50 text-accent backdrop-blur-sm shadow-sm">
          <Bank size={20} aria-hidden="true" />
        </div>
        <h2 className="font-display text-3xl font-semibold italic text-ink">
          Kado Digital
        </h2>
        <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-muted">
          amplop digital
        </p>
      </div>

      {accounts.length === 0 ? (
        <p className="mx-auto max-w-md text-center text-sm text-muted">
          Belum ada rekening yang ditambahkan oleh pengantin.
        </p>
      ) : (
        <div className="mx-auto max-w-lg space-y-5">
          {accounts.map((acct, i) => (
            <article
              key={`${acct.bank}-${acct.account_number}-${i}`}
              className="relative overflow-hidden rounded-lg border border-rule/75 bg-surface p-6 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] transition duration-300 hover:shadow-[0_8px_30px_-5px_rgba(0,0,0,0.04)]"
            >
              {/* Left accent color strip */}
              <div className="absolute left-0 inset-y-0 w-[4px] bg-accent/70" />
              
              <div className="pl-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
                  {acct.bank}
                </div>
                <div className="mt-1 text-base font-semibold text-ink">
                  {acct.account_name}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-canvas/60 border border-rule/45 px-4 py-3">
                  <code className="font-mono text-base font-semibold tabular-nums text-ink tracking-wider">
                    {maskAccount(acct.account_number)}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(acct.account_number);
                        setCopiedIndex(i);
                        setTimeout(
                          () =>
                            setCopiedIndex((cur) => (cur === i ? null : cur)),
                          1800,
                        );
                      } catch {
                        alert(`Nomor rekening: ${acct.account_number}`);
                      }
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/80 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-accent transition duration-300 hover:bg-accent hover:text-inverseInk shadow-sm"
                    aria-label={`Salin nomor rekening ${acct.bank}`}
                  >
                    <Copy size={12} aria-hidden="true" />
                    {copiedIndex === i ? "Tersalin!" : "Salin"}
                  </button>
                </div>

                {acct.notes ? (
                  <p className="mt-3 text-xs italic text-muted/80">{acct.notes}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-xs tracking-wide text-muted">
        Doa &amp; restu Anda sudah lebih dari cukup.
        <Heart
          size={12}
          aria-hidden="true"
          className="ml-1.5 inline align-[-0.05em] text-accent"
          weight="fill"
        />
      </p>
    </SectionShell>
  );
}

/**
 * Mask account number untuk preview — 4 digit pertama + middle
 * "••••" + 2 digit terakhir. Untuk akun panjang 10 digit standarnya.
 * Akun lain di-scale proportionally.
 */
function maskAccount(num: string): string {
  if (num.length <= 6) return num;
  const head = num.slice(0, 4);
  const tail = num.slice(-2);
  const middle = "•".repeat(Math.max(3, num.length - 6));
  return `${head}${middle}${tail}`;
}
