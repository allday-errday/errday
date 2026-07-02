import type { CalendarEvent } from "@/types/database";

const TZID = "Europe/Zurich";

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldLine(line: string) {
  if (line.length <= 73) {
    return line;
  }

  const parts: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    parts.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function compactDate(date: string) {
  return date.replace(/-/g, "");
}

function compactTime(time: string) {
  const [h = "00", m = "00", s = "00"] = time.split(":");
  return `${h.padStart(2, "0")}${m.padStart(2, "0")}${s.padStart(2, "0")}`;
}

function nextDateString(date: string) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function eventLines(event: CalendarEvent) {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.id}@errday`,
    `DTSTAMP:${compactDate(event.updated_at.slice(0, 10))}T${compactTime(event.updated_at.slice(11, 19) || "00:00:00")}Z`,
    `SUMMARY:${escapeText(event.title)}`,
  ];

  if (event.start_time) {
    lines.push(
      `DTSTART;TZID=${TZID}:${compactDate(event.date)}T${compactTime(event.start_time)}`,
    );
    if (event.end_time) {
      lines.push(
        `DTEND;TZID=${TZID}:${compactDate(event.date)}T${compactTime(event.end_time)}`,
      );
    }
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(event.date)}`);
    lines.push(`DTEND;VALUE=DATE:${compactDate(nextDateString(event.date))}`);
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }
  lines.push(`CATEGORIES:${escapeText(event.category)}`);

  if (event.reminder_minutes !== null && event.reminder_minutes >= 0) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(event.title)}`,
      `TRIGGER:-PT${event.reminder_minutes}M`,
      "END:VALARM",
    );
  }

  lines.push("END:VEVENT");
  return lines;
}

export function buildCalendarIcs(events: CalendarEvent[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Errday//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Errday",
    `X-WR-TIMEZONE:${TZID}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
    `BEGIN:VTIMEZONE`,
    `TZID:${TZID}`,
    "BEGIN:DAYLIGHT",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "DTSTART:19700329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "DTSTART:19701025T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "END:VTIMEZONE",
    ...events.flatMap(eventLines),
    "END:VCALENDAR",
  ];

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
