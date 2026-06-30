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
      <div className="mb-8 text-center">
        <Bank
          size={28}
          aria-hidden="true"
          className="mx-auto mb-3 text-accent"
        />
        <h2 className="font-display text-2xl italic text-ink sm:text-3xl">
          Amplop Digital
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
        <div className="mx-auto max-w-xl space-y-4">
          {accounts.map((acct, i) => (
            <article
              key={`${acct.bank}-${acct.account_number}-${i}`}
              className="rounded-sm border-y border-rule bg-surface px-5 py-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-accent">
                    {acct.bank}
                  </div>
                  <div className="mt-1 text-sm font-medium text-ink">
                    {acct.account_name}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-sm bg-canvas px-3 py-2.5">
                <code className="font-mono text-base tabular-nums text-ink">
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
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-ink px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-ink transition hover:bg-ink hover:text-inverseInk"
                  aria-label={`Salin nomor rekening ${acct.bank}`}
                >
                  <Copy size={14} aria-hidden="true" />
                  {copiedIndex === i ? "Tersalin" : "Salin"}
                </button>
              </div>

              {acct.notes ? (
                <p className="mt-3 text-xs italic text-muted">{acct.notes}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted">
        Doa &amp; restu Anda sudah lebih dari cukup.
        <Heart
          size={12}
          aria-hidden="true"
          className="ml-1 inline align-[-0.1em] text-accent"
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
