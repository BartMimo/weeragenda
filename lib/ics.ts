// ICS feed builder — RFC 5545
// Emits one all-day event per forecast day, with an hourly breakdown
// in the DESCRIPTION. No external dependencies.

import type { Forecast } from "./weather";
import { describeCode, DAY_SHORT_NL } from "./i18n";

// CRLF line ending per RFC 5545 §3.1
const CRLF = "\r\n";

// Escape a string for use in an ICS property value (TEXT type).
// RFC 5545 §3.3.11
function escText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Fold long lines at 75 octets per RFC 5545 §3.1.
// We approximate by character count — works for ASCII; for multibyte UTF-8
// we under-fold (still valid, just shorter lines).
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  out.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) {
    out.push(" " + line.slice(i, i + 74)); // continuation = leading space
    i += 74;
  }
  return out.join(CRLF);
}

// YYYYMMDD for DTSTART;VALUE=DATE
function toIcalDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

// YYYYMMDDTHHMMSSZ for DTSTAMP (always UTC)
function toIcalUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

// add N days to a YYYY-MM-DD string
function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Pick a subset of hours to show in the description so it stays readable.
// We aim for 06–21 every 3h, falling back to whatever we have.
function pickShowcaseHours(hours: { time: string }[]): number[] {
  const targets = [6, 9, 12, 15, 18, 21];
  const idx: number[] = [];
  for (const t of targets) {
    const i = hours.findIndex(h => {
      const hh = parseInt(h.time.slice(11, 13), 10);
      return hh === t;
    });
    if (i >= 0) idx.push(i);
  }
  return idx;
}

function buildDescription(day: Forecast["days"][number]): string {
  const lines: string[] = [];
  lines.push("Uurlijkse verwachting");
  lines.push("----------------------");
  const idx = pickShowcaseHours(day.hours);
  for (const i of idx) {
    const h = day.hours[i];
    const hh = h.time.slice(11, 16);
    const cond = describeCode(h.weatherCode);
    const temp = Math.round(h.temperature);
    const rain = Math.round(h.precipitationProb);
    const wind = Math.round(h.windSpeed);
    lines.push(
      `${hh}  ${cond.emoji}  ${temp}°C  ·  ${rain}% regen  ·  ${wind} km/u`
    );
    lines.push(`        ${cond.label}`);
  }
  lines.push("");
  lines.push(`Bron: Open-Meteo · ververst ieder uur`);
  return lines.join("\n");
}

export function buildIcs(forecast: Forecast, locationLabel: string): string {
  const now = new Date();
  const dtstamp = toIcalUtc(now);
  const slug = slugify(locationLabel);

  const lines: string[] = [];
  const push = (l: string) => lines.push(fold(l));

  push("BEGIN:VCALENDAR");
  push("VERSION:2.0");
  push("PRODID:-//WeerAgenda//NL");
  push("CALSCALE:GREGORIAN");
  push("METHOD:PUBLISH");
  push(`X-WR-CALNAME:Weer · ${escText(locationLabel)}`);
  push(`X-WR-CALDESC:Daagse weersverwachting voor ${escText(locationLabel)} · WeerAgenda`);
  push(`X-WR-TIMEZONE:${forecast.timezone}`);
  push("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
  push("X-PUBLISHED-TTL:PT1H");

  for (const day of forecast.days) {
    const cond = describeCode(day.weatherCode);
    const hi = Math.round(day.tempMax);
    const lo = Math.round(day.tempMin);
    const summary = `${cond.emoji} ${lo}° / ${hi}° — ${locationLabel}`;

    const uid = `weather-${toIcalDate(day.date)}-${slug}@weeragenda`;
    const dtstart = toIcalDate(day.date);
    const dtend = toIcalDate(addDaysIso(day.date, 1));

    push("BEGIN:VEVENT");
    push(`UID:${uid}`);
    push(`DTSTAMP:${dtstamp}`);
    push(`DTSTART;VALUE=DATE:${dtstart}`);
    push(`DTEND;VALUE=DATE:${dtend}`);
    push(`SUMMARY:${escText(summary)}`);
    push(`DESCRIPTION:${escText(buildDescription(day))}`);
    push(`CATEGORIES:Weer`);
    push("TRANSP:TRANSPARENT");
    push("END:VEVENT");
  }

  push("END:VCALENDAR");
  return lines.join(CRLF) + CRLF;
}

/** Build an error-state calendar containing a single explanatory event today. */
export function buildErrorIcs(reason: string, locationLabel: string): string {
  const now = new Date();
  const dtstamp = toIcalUtc(now);
  const today = now.toISOString().slice(0, 10);
  const tomorrow = addDaysIso(today, 1);

  const lines: string[] = [];
  const push = (l: string) => lines.push(fold(l));
  push("BEGIN:VCALENDAR");
  push("VERSION:2.0");
  push("PRODID:-//WeerAgenda//NL");
  push("CALSCALE:GREGORIAN");
  push("METHOD:PUBLISH");
  push("X-WR-CALNAME:Weer · (tijdelijk niet beschikbaar)");
  push("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
  push("X-PUBLISHED-TTL:PT1H");

  push("BEGIN:VEVENT");
  push(`UID:weather-error-${toIcalDate(today)}-${slugify(locationLabel || "unknown")}@weeragenda`);
  push(`DTSTAMP:${dtstamp}`);
  push(`DTSTART;VALUE=DATE:${toIcalDate(today)}`);
  push(`DTEND;VALUE=DATE:${toIcalDate(tomorrow)}`);
  push(`SUMMARY:${escText("⚠ WeerAgenda — geen data")}`);
  push(`DESCRIPTION:${escText(
    `We konden de weersverwachting voor "${locationLabel}" nu niet ophalen.\n\nReden: ${reason}\n\nDe feed probeert het over een uur opnieuw.`
  )}`);
  push("TRANSP:TRANSPARENT");
  push("END:VEVENT");

  push("END:VCALENDAR");
  return lines.join(CRLF) + CRLF;
}
