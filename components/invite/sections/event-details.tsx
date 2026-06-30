import type { PublicInvitationData } from "@/types/invitation";
import type { ThemeConfig } from "@/lib/themes/types";
import { SectionShell } from "../section-shell";
import { CalendarBlank, MapPin, ArrowSquareOut } from "../icons";

/**
 * Velora — Event Details Section (RSC)
 * -------------------------------------------------------------------
 * Tampilkan akad & resepsi rows lengkap dengan:
 *   - tanggal editorial ("Sabtu, 12 Desember 2025 · 10:00")
 *   - lokasi (kalau diisi)
 *   - 3 tombol aksi:
 *       - "Buka Maps" → anchor target=_blank (kalau maps_url diisi)
 *       - "Google Calendar" → template URL (langsung tambahkan di web)
 *       - "Unduh .ics" → route handler `/api/ics/[slug]` (universal)
 *
 * Skip section kalau tidak ada event sama sekali.
 *
 * Mobile: rows stacked. Desktop: 2-column jika tanggal sama,
 * stacked-rapat jika tanggal berbeda.
 */
export function EventDetailsSection({
  slug,
  theme,
  data,
  guestName,
}: {
  slug: string;
  theme: ThemeConfig;
  data: PublicInvitationData;
  guestName?: string | null;
}) {
  const { client } = data;

  const akad = client.akad_date
    ? {
        kind: "Akad" as const,
        date: client.akad_date,
        location: client.akad_location,
        maps: client.akad_maps_url,
      }
    : null;
  const resepsi = client.resepsi_date
    ? {
        kind: "Resepsi" as const,
        date: client.resepsi_date,
        location: client.resepsi_location,
        maps: client.resepsi_maps_url,
      }
    : null;

  if (!akad && !resepsi) return null;

  const sameDay = akad && resepsi && sameDayDates(akad.date, resepsi.date);

  return (
    <SectionShell theme={theme} id="event" ariaLabel="Detail Acara">
      <div className="mb-10 text-center">
        <h2 className="font-display text-2xl italic text-ink sm:text-3xl">
          Acara
        </h2>
        <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-muted">
          akad &amp; resepsi
        </p>
      </div>

      <div
        className={`mx-auto grid max-w-3xl gap-6 ${
          sameDay ? "md:grid-cols-2" : ""
        }`}
      >
        {akad ? (
          <EventRow
            slug={slug}
            kind={akad.kind}
            date={akad.date}
            location={akad.location}
            maps={akad.maps}
            guestName={guestName ?? null}
          />
        ) : null}
        {resepsi ? (
          <EventRow
            slug={slug}
            kind={resepsi.kind}
            date={resepsi.date}
            location={resepsi.location}
            maps={resepsi.maps}
            guestName={guestName ?? null}
          />
        ) : null}
      </div>
    </SectionShell>
  );
}

function sameDayDates(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function EventRow({
  slug,
  kind,
  date,
  location,
  maps,
  guestName,
}: {
  slug: string;
  kind: "Akad" | "Resepsi";
  date: string;
  location: string | null;
  maps: string | null;
  guestName: string | null;
}) {
  const icsHref = `/api/ics/${slug}?event=${kind.toLowerCase()}${
    guestName ? `&to=${encodeURIComponent(guestName)}` : ""
  }`;
  const gcalHref = buildGoogleCalendarUrl(kind, date, location);

  return (
    <article className="rounded-sm border border-rule bg-surface p-6">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-accent">
        <CalendarBlank size={16} aria-hidden="true" />
        <span>{kind}</span>
      </div>
      <div className="mt-3 font-display text-2xl text-ink sm:text-3xl">
        {formatEventDate(date)}
      </div>
      {location ? (
        <div className="mt-2 flex items-start gap-2 text-sm text-muted">
          <MapPin
            size={16}
            aria-hidden="true"
            className="mt-0.5 shrink-0"
          />
          <span>{location}</span>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {maps ? (
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm border border-ink px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-ink hover:text-inverseInk"
          >
            Buka Maps
            <ArrowSquareOut size={14} aria-hidden="true" />
          </a>
        ) : null}
        <a
          href={gcalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-sm bg-ink px-3 py-1.5 text-xs font-medium text-inverseInk transition hover:bg-accent"
        >
          Google Calendar
          <ArrowSquareOut size={14} aria-hidden="true" />
        </a>
        <a
          href={icsHref}
          download
          className="inline-flex items-center gap-1.5 rounded-sm border border-rule px-3 py-1.5 text-xs font-medium text-muted transition hover:border-ink hover:text-ink"
        >
          Unduh .ics
        </a>
      </div>
    </article>
  );
}

/**
 * Format tanggal event ke gaya editorial: "Sabtu, 12 Desember 2025 · 10:00".
 * Return string kosong jika invalid.
 */
function formatEventDate(iso: string): string {
  try {
    const d = new Date(iso);
    const day = d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${day} · ${time}`;
  } catch {
    return "";
  }
}

/**
 * Bangun URL Google Calendar template. Durasi default: 2 jam (akad)
 * dan 4 jam (resepsi).
 */
function buildGoogleCalendarUrl(
  kind: "Akad" | "Resepsi",
  iso: string,
  location: string | null,
): string {
  const d = new Date(iso);
  const fmt = (dt: Date) =>
    dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(
    d.getTime() + (kind === "Akad" ? 2 : 4) * 60 * 60 * 1000,
  );
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${kind} Pernikahan`,
    dates: `${fmt(d)}/${fmt(end)}`,
    location: location ?? "",
    details: "Undangan pernikahan dari Velora.",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
