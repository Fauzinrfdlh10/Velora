import type { PublicInvitationData } from "@/types/invitation";
import type { ThemeConfig } from "@/lib/themes/types";
import { SectionShell } from "../section-shell";
import { ArrowDown } from "../icons";

/**
 * Velora — Cover Section (RSC)
 * -------------------------------------------------------------------
 * Hero paling atas halaman — kicker "The Wedding of", nama pengantin
 * dalam display font, ringkasan tanggal & lokasi, scroll hint, dan
 * (kalau `?to=Nama` diberikan) sapaan personal "Dear Nama, you are
 * warmly invited".
 *
 * Layout single column center. Mobile: fluid typography. Desktop:
 * display font scale up via `sm:` breakpoints. Tidak ada parallax
 * atau animasi cascade — sesuai prinsip motion 'secukupnya'.
 *
 * Tanggal tampil = resepsi_date kalau ada, fallback ke akad_date.
 * Lokasi tampil = resepsi_location kalau ada, fallback ke akad_location.
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
    <SectionShell theme={theme} id="cover" ariaLabel="Sampul Undangan">
      <div className="flex min-h-[78vh] flex-col items-center justify-center text-center">
        {/* Personal greeting — tampil hanya jika `?to=Nama` */}
        {guestName ? (
          <p className="mb-6 text-sm italic text-muted">
            Dear{" "}
            <span className="font-medium not-italic text-ink">{guestName}</span>,
            you are warmly invited ✦
          </p>
        ) : null}

        {/* Kicker */}
        <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-muted">
          The Wedding of
        </p>

        {/* Hero nama pengantin */}
        <h1 className="font-display text-[2.25rem] font-medium leading-[1.05] tracking-tight text-ink sm:text-[3.5rem] md:text-[4.5rem]">
          <span className="block">{client.groom_name}</span>
          <span className="my-2 inline-block font-display text-3xl italic text-muted sm:text-5xl md:text-6xl">
            &amp;
          </span>
          <span className="block">{client.bride_name}</span>
        </h1>

        {/* Date + location ringkas */}
        {(dateLabel || locationLabel) && (
          <div className="mt-8 flex flex-col items-center gap-1 text-sm text-muted">
            {dateLabel ? (
              <p className="font-medium tabular-nums tracking-wide text-ink">
                {dateLabel}
              </p>
            ) : null}
            {locationLabel ? <p>{locationLabel}</p> : null}
          </div>
        )}

        {/* Scroll hint */}
        <div className="mt-12 flex flex-col items-center gap-2 text-muted">
          <span className="text-[10px] uppercase tracking-[0.32em]">Scroll</span>
          <ArrowDown size={18} aria-hidden="true" />
        </div>
      </div>
    </SectionShell>
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
