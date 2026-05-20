// ICS feed builder — RFC 5545
// Emits ONE VEVENT per 2-hour block (12 per day × 7 days = 84 events),
// each with a short SUMMARY showing the block's weather and a slim
// DESCRIPTION repeating the numbers. No external dependencies.
//
// Times are emitted in UTC ("Z" suffix) — we convert each Open-Meteo
// local timestamp to UTC using the forecast's utc_offset_seconds. This
// makes the feed timezone-correct in every client without needing a
// VTIMEZONE block.

import type { Forecast, HourSample } from "./weather";
import { describeCode } from "./i18n";

const CRLF = "\r\n";

function escText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Fold long lines at 75 octets per RFC 5545 §3.1.
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  out.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    out.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return out.join(CRLF);
}

// YYYYMMDDTHHMMSSZ — used for DTSTAMP / DTSTART / DTEND in UTC form
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

// Convert an Open-Meteo local timestamp ("2026-05-20T08:00") to a real UTC
// Date, given the location's offset from UTC in seconds.
function localToUtc(localIso: string, offsetSeconds: number): Date {
  // Treat the local string as UTC, then walk back by the offset.
  const asIfUtc = new Date(localIso + ":00Z");
  return new Date(asIfUtc.getTime() - offsetSeconds * 1000);
}

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Aggregate two adjacent hourly samples into a single 2-hour block.
 * Strategy:
 *   - temp:   average (rounded)
 *   - rain%:  max (worst-case)
 *   - wind:   average (rounded)
 *   - code:   the "worse" code (higher WMO number usually = worse weather,
 *             which is what users want to see in a calendar at a glance)
 */
function aggregateBlock(a: HourSample, b: HourSample) {
  const temp = Math.round((a.temperature + b.temperature) / 2);
  const rain = Math.max(a.precipitationProb, b.precipitationProb);
  const wind = Math.round((a.windSpeed + b.windSpeed) / 2);
  const code = a.weatherCode >= b.weatherCode ? a.weatherCode : b.weatherCode;
  return { temp, rain, wind, code };
}

// HH:00 → HH:00 label, e.g. "08:00 – 10:00"
function blockTimeLabel(localIso: string): string {
  const hh = parseInt(localIso.slice(11, 13), 10);
  const end = (hh + 2) % 24;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:00 – ${pad(end)}:00`;
}

function dayDateForUid(localIso: string): string {
  return localIso.slice(0, 10).replace(/-/g, "");
}
function hourForUid(localIso: string): string {
  return localIso.slice(11, 13);
}

export function buildIcs(forecast: Forecast, locationLabel: string): string {
  const now = new Date();
  const dtstamp = toIcalUtc(now);
  const slug = slugify(locationLabel);
  const offset = forecast.utcOffsetSeconds;

  const lines: string[] = [];
  const push = (l: string) => lines.push(fold(l));

  push("BEGIN:VCALENDAR");
  push("VERSION:2.0");
  push("PRODID:-//WeerAgenda//NL");
  push("CALSCALE:GREGORIAN");
  push("METHOD:PUBLISH");
  push(`X-WR-CALNAME:Weer · ${escText(locationLabel)}`);
  push(`X-WR-CALDESC:Weersverwachting per 2 uur voor ${escText(locationLabel)} · WeerAgenda`);
  push(`X-WR-TIMEZONE:${forecast.timezone}`);
  push("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
  push("X-PUBLISHED-TTL:PT1H");

  for (const day of forecast.days) {
    // Open-Meteo returns 24 hourly samples per day in local time; pair them
    // off into 12 two-hour blocks (00–02, 02–04, …, 22–24).
    const hours = day.hours;
    for (let h = 0; h < 24; h += 2) {
      const a = hours[h];
      const b = hours[h + 1];
      if (!a || !b) continue;

      const startUtc = localToUtc(a.time, offset);
      // end = start of the next pair, or +2h from start if we're at 22
      const nextLocalIso = hours[h + 2]?.time ?? plusHoursLocal(a.time, 2);
      const endUtc = localToUtc(nextLocalIso, offset);

      const block = aggregateBlock(a, b);
      const cond = describeCode(block.code);
      const summary = `${cond.emoji} ${block.temp}° · ${cond.label}`;

      const description = [
        cond.label,
        `${blockTimeLabel(a.time)} · ${locationLabel}`,
        ``,
        `Temperatuur   ${block.temp}°C`,
        `Regenkans     ${Math.round(block.rain)}%`,
        `Wind          ${block.wind} km/u`,
        ``,
        `Bron: Open-Meteo · ververst ieder uur`,
      ].join("\n");

      const uid = `weather-${dayDateForUid(a.time)}T${hourForUid(a.time)}-${slug}@weeragenda`;

      push("BEGIN:VEVENT");
      push(`UID:${uid}`);
      push(`DTSTAMP:${dtstamp}`);
      push(`DTSTART:${toIcalUtc(startUtc)}`);
      push(`DTEND:${toIcalUtc(endUtc)}`);
      push(`SUMMARY:${escText(summary)}`);
      push(`DESCRIPTION:${escText(description)}`);
      push(`CATEGORIES:Weer`);
      push("TRANSP:TRANSPARENT");
      push("END:VEVENT");
    }
  }

  push("END:VCALENDAR");
  return lines.join(CRLF) + CRLF;
}

// Add `n` hours to a local-time ISO like "2026-05-20T22:00".
// Used as a fallback for the last block of the last day, where no
// "next sample" exists in the forecast array.
function plusHoursLocal(localIso: string, n: number): string {
  const [date, time] = localIso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm));
  dt.setUTCHours(dt.getUTCHours() + n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
}

/** Build an error-state calendar containing a single explanatory event today. */
export function buildErrorIcs(reason: string, locationLabel: string): string {
  const now = new Date();
  const dtstamp = toIcalUtc(now);
  const today = now.toISOString().slice(0, 10);
  const tomorrowDate = new Date(now);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const tomorrow = tomorrowDate.toISOString().slice(0, 10);

  const toIcalDate = (iso: string) => iso.replace(/-/g, "");

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
