import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMockInvitation } from "@/lib/mock/client";

/**
 * Velora — ICS Calendar File Route
 * -------------------------------------------------------------------
 * GET /api/ics/<slug>?event=akad|resepsi[&to=Nama]
 *
 * Generate file `.ics` (VCALENDAR + VEVENT) untuk di-import ke aplikasi
 * kalender OS (Apple Calendar, Outlook, Google Calendar import).
 * Safari / iOS otomatis download saat link di-tap dengan `download` attr.
 *
 * Query params:
 *   - event=akad|resepsi — selects which event to emit (default: akad)
 *   - to=Nama — opsional, include guest name di DESCRIPTION
 *
 * Mock mode: jika VELORA_USE_MOCK_CLIENT=1, gunakan mock client
 * sehingga preview tema bisa melakukan QA .ics download tanpa DB.
 */

type ClientLike = {
  groom_name: string;
  bride_name: string;
  akad_date: string | null;
  akad_location: string | null;
  resepsi_date: string | null;
  resepsi_location: string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const eventKind = (url.searchParams.get("event") ?? "akad").toLowerCase();
  const guest = url.searchParams.get("to") ?? "";
  const useMock = process.env.VELORA_USE_MOCK_CLIENT === "1";

  let client: ClientLike | null = null;

  if (useMock) {
    const m = getMockInvitation();
    client = {
      groom_name: m.client.groom_name,
      bride_name: m.client.bride_name,
      akad_date: m.client.akad_date,
      akad_location: m.client.akad_location,
      resepsi_date: m.client.resepsi_date,
      resepsi_location: m.client.resepsi_location,
    };
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_client_by_slug", {
      p_slug: slug,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) {
      return new NextResponse("Not found", { status: 404 });
    }
    client = {
      groom_name: row.groom_name,
      bride_name: row.bride_name,
      akad_date: row.akad_date,
      akad_location: row.akad_location,
      resepsi_date: row.resepsi_date,
      resepsi_location: row.resepsi_location,
    };
  }

  const event = pickEvent(client, eventKind);
  if (!event) {
    return new NextResponse("Event not found", { status: 404 });
  }

  const desc = guest
    ? `Undangan pernikahan ${event.title}.\\nTamu: ${guest}`
    : `Undangan pernikahan ${event.title}.`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Velora//ID//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${slug}-${eventKind}@velora.id`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(new Date(event.start))}`,
    `DTEND:${icsDate(new Date(event.end))}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(desc)}`,
    event.location ? `LOCATION:${escapeIcs(event.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .filter((line) => line !== "" || line === "")
    .join("\r\n");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-${eventKind}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}

function pickEvent(
  c: ClientLike,
  kind: string,
): {
  title: string;
  location: string | null;
  start: string;
  end: string;
} | null {
  if (kind === "akad" && c.akad_date) {
    const start = new Date(c.akad_date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // +2h
    return {
      title: `Akad Nikah — ${c.groom_name} & ${c.bride_name}`,
      location: c.akad_location,
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }
  if (kind === "resepsi" && c.resepsi_date) {
    const start = new Date(c.resepsi_date);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000); // +4h
    return {
      title: `Resepsi — ${c.groom_name} & ${c.bride_name}`,
      location: c.resepsi_location,
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }
  return null;
}

/** Format Date → ICS UTC stamp: YYYYMMDDTHHMMSSZ. */
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape karakter special ICS: backslash, newline, comma, semicolon. */
function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}
