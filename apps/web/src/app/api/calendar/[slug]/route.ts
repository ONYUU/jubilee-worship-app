import { slugSchema } from "@jubilee/domain";
import { getPublicContent } from "@/lib/data/repository";

const CALENDAR_CACHE_CONTROL = "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";
const CALENDAR_NOT_FOUND_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

function escapeIcs(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function toIcsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const parsedSlug = slugSchema.safeParse((await params).slug);
  if (!parsedSlug.success) {
    return new Response("일정을 찾을 수 없습니다.", {
      status: 404,
      headers: { "Cache-Control": CALENDAR_NOT_FOUND_CACHE_CONTROL }
    });
  }

  const slug = parsedSlug.data;
  const { events } = await getPublicContent();
  const event = events.find((item) => item.slug === slug && item.published);

  if (!event || event.status === "cancelled") {
    return new Response("일정을 찾을 수 없습니다.", {
      status: 404,
      headers: { "Cache-Control": CALENDAR_NOT_FOUND_CACHE_CONTROL }
    });
  }

  const end = event.endsAt
    ? new Date(event.endsAt)
    : new Date(new Date(event.startsAt).getTime() + 2 * 60 * 60 * 1000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jubilee Worship//Website//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.slug}@sundoo.org`,
    `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
    `DTSTART:${toIcsDate(event.startsAt)}`,
    `DTEND:${toIcsDate(end.toISOString())}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `LOCATION:${escapeIcs(`${event.venueName}, ${event.address}`)}`,
    `URL:${escapeIcs(event.sourceUrl)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ];

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": CALENDAR_CACHE_CONTROL
    }
  });
}
