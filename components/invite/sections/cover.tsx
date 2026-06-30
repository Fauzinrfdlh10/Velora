import type { PublicInvitationData } from "@/types/invitation";
import type { ThemeConfig } from "@/lib/themes/types";
import { SectionShell } from "../section-shell";
import { ArrowDown } from "../icons";

/**
 * Velora — Cover Section (RSC)
 * -------------------------------------------------------------------
 * Hero paling atas halaman — kicker "The Wedding of", nama pengantin
 * dalam display font, ringkasan tanggal & lokasi, scroll hint, dan
 * sapaan personal berciri khas Indonesia ("Kepada Yth.").
 *
 * Ditambahkan ornamen floral line art (SVG inline) untuk memperkuat
 * tema Modern Heritage tanpa menambah beban download gambar (RSC-friendly).
 */
export function CoverSection({
  theme,
  data,
}: {
  theme: ThemeConfig;
  data: PublicInvitationData;
}) {
  const { client, guestName } = data;
  const dateLabel = formatCoverDate(client.resepsi_date ?? client.akad_date);
  const locationLabel = client.resepsi_location ?? client.akad_location;

  return (
    <SectionShell
      theme={theme}
      id="cover"
      ariaLabel="Sampul Undangan"
      className="relative overflow-hidden"
    >
      {/* Background Ornaments */}
      <FloralOrnamentLeft />
      <FloralOrnamentRight />

      <div className="relative z-10 flex min-h-[85vh] flex-col items-center justify-center text-center">
        {/* Double-line Border Box Frame */}
        <div className="absolute inset-0 border border-rule/65 pointer-events-none m-4 md:m-8" />
        <div className="absolute inset-0 border border-rule/30 pointer-events-none m-5 md:m-9" />

        <div className="max-w-xl px-6 py-12">
          {/* Culturally appropriate greeting */}
          {guestName ? (
            <div className="mb-8 inline-block rounded-full border border-rule bg-surface/40 px-6 py-2 backdrop-blur-sm shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
                Kpd. Yth. Bapak/Ibu/Saudara/i
              </p>
              <p className="mt-0.5 text-sm font-semibold tracking-wider text-accent uppercase">
                {guestName}
              </p>
            </div>
          ) : null}

          {/* Kicker */}
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.4em] text-muted/90">
            The Wedding of
          </p>

          {/* Hero Names */}
          <h1 className="font-display text-[2.5rem] font-medium leading-[1.05] tracking-tight text-ink sm:text-[4rem] md:text-[5rem]">
            <span className="block">{client.groom_name}</span>
            <span className="my-3 inline-block font-display text-4xl italic text-accent/70 sm:text-6xl">
              &amp;
            </span>
            <span className="block">{client.bride_name}</span>
          </h1>

          {/* Golden Separator */}
          <div className="my-8 flex items-center justify-center gap-3 text-accent">
            <span className="h-[1px] w-8 bg-rule" />
            <span className="text-xs">✦</span>
            <span className="h-[1px] w-8 bg-rule" />
          </div>

          {/* Date & Location */}
          {(dateLabel || locationLabel) && (
            <div className="flex flex-col items-center gap-1.5 text-sm text-muted">
              {dateLabel ? (
                <p className="font-semibold tabular-nums tracking-widest text-ink uppercase text-xs">
                  {dateLabel}
                </p>
              ) : null}
              {locationLabel ? (
                <p className="text-xs max-w-sm leading-relaxed tracking-wide">
                  {locationLabel}
                </p>
              ) : null}
            </div>
          )}

          {/* Scroll hint */}
          <div className="mt-16 flex flex-col items-center gap-2 text-muted">
            <span className="text-[9px] uppercase tracking-[0.35em] text-muted/80">
              Scroll Down
            </span>
            <div className="animate-bounce">
              <ArrowDown size={16} className="text-accent" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

function FloralOrnamentLeft() {
  return (
    <svg
      className="absolute left-0 top-10 h-32 w-32 text-accent/15 select-none pointer-events-none md:h-56 md:w-56"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.75"
    >
      <path d="M 0,10 Q 35,20 45,65" />
      <path d="M 12,14 Q 5,2 0,5 Q 5,12 12,14" fill="currentColor" fillOpacity="0.05" />
      <path d="M 23,22 Q 22,8 14,10 Q 18,20 23,22" fill="currentColor" fillOpacity="0.05" />
      <path d="M 33,32 Q 38,20 28,18 Q 30,28 33,32" fill="currentColor" fillOpacity="0.05" />
      <path d="M 38,45 Q 49,38 42,28 Q 36,36 38,45" fill="currentColor" fillOpacity="0.05" />
      <path d="M 43,58 Q 58,58 54,44 Q 45,48 43,58" fill="currentColor" fillOpacity="0.05" />
    </svg>
  );
}

function FloralOrnamentRight() {
  return (
    <svg
      className="absolute right-0 bottom-10 h-32 w-32 text-accent/15 scale-x-[-1] scale-y-[-1] select-none pointer-events-none md:h-56 md:w-56"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.75"
    >
      <path d="M 0,10 Q 35,20 45,65" />
      <path d="M 12,14 Q 5,2 0,5 Q 5,12 12,14" fill="currentColor" fillOpacity="0.05" />
      <path d="M 23,22 Q 22,8 14,10 Q 18,20 23,22" fill="currentColor" fillOpacity="0.05" />
      <path d="M 33,32 Q 38,20 28,18 Q 30,28 33,32" fill="currentColor" fillOpacity="0.05" />
      <path d="M 38,45 Q 49,38 42,28 Q 36,36 38,45" fill="currentColor" fillOpacity="0.05" />
      <path d="M 43,58 Q 58,58 54,44 Q 45,48 43,58" fill="currentColor" fillOpacity="0.05" />
    </svg>
  );
}

/**
 * Format tanggal ke gaya editorial Indonesia: "12 · 12 · 2025".
 * Return null jika input invalid / null.
 */
function formatCoverDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d
      .toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, " · ");
  } catch {
    return null;
  }
}
