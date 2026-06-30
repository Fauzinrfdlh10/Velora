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
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rule/80 bg-surface/50 text-accent backdrop-blur-sm shadow-sm">
          <CalendarBlank size={20} aria-hidden="true" />
        </div>
        <h2 className="font-display text-3xl font-semibold italic text-ink">
          Detail Acara
        </h2>
        <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-muted">
          akad &amp; resepsi
        </p>
      </div>

      <div
        className={`mx-auto grid max-w-4xl gap-8 ${
          sameDay ? "md:grid-cols-2" : "grid-cols-1"
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
    <article className="relative overflow-hidden rounded-lg border border-rule/75 bg-surface p-8 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] transition duration-300 hover:shadow-[0_10px_35px_-5px_rgba(0,0,0,0.05)]">
      {/* Top accent highlighting line */}
      <div className="absolute top-0 inset-x-0 h-[4px] bg-accent/70" />

      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
          <CalendarBlank size={16} aria-hidden="true" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent">
          {kind}
        </span>
      </div>

      <div className="mt-5 font-display text-2xl font-semibold leading-snug text-ink sm:text-3xl">
        {formatEventDate(date)}
      </div>

      {location ? (
        <div className="mt-4 flex items-start gap-2.5 text-sm leading-relaxed text-muted">
          <MapPin
            size={16}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-accent/80"
          />
          <span>{location}</span>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {maps ? (
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-accent/85 px-4 py-2.5 text-xs font-semibold tracking-wide text-accent transition duration-300 hover:bg-accent hover:text-inverseInk shadow-sm w-full sm:w-auto"
          >
            Buka Maps
            <ArrowSquareOut size={14} aria-hidden="true" />
          </a>
        ) : null}
        <a
          href={gcalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-xs font-semibold tracking-wide text-inverseInk transition duration-300 hover:bg-accent/90 hover:shadow-md shadow-sm w-full sm:w-auto"
        >
          Google Calendar
          <ArrowSquareOut size={14} aria-hidden="true" />
        </a>
        <a
          href={icsHref}
          download
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rule px-4 py-2.5 text-xs font-medium tracking-wide text-muted transition duration-300 hover:border-ink hover:text-ink w-full sm:w-auto"
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
