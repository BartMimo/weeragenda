// GET /api/ical?lat=52.37&lon=4.89&name=Amsterdam&tz=Europe/Amsterdam
// GET /api/ical?location=Amsterdam       (legacy — runs geocode itself)
//
// Returns a text/calendar feed for any Google Calendar / Apple Agenda /
// Outlook client to subscribe to. When lat/lon are provided we skip the
// geocoder entirely — that's what the landing-page picker uses so the
// generated URLs are always unambiguous (no "Bergen NL" vs "Bergen NO"
// ever surprising the user later).

import { NextRequest } from "next/server";
import { geocode } from "@/lib/geocode";
import { getForecast } from "@/lib/weather";
import type { GeoResult } from "@/lib/geocode";
import { buildIcs, buildErrorIcs } from "@/lib/ics";

export const revalidate = 3600;
export const runtime = "nodejs";

function icsHeaders() {
  return {
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400, max-age=3600",
    "Content-Disposition": `inline; filename="weeragenda.ics"`,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const latStr = url.searchParams.get("lat");
  const lonStr = url.searchParams.get("lon");
  const name = (url.searchParams.get("name") || "").trim();
  const tz = (url.searchParams.get("tz") || "").trim();
  const location = (url.searchParams.get("location") || "").trim();

  let geo: GeoResult | null = null;
  let label = name || location;

  // Path A — explicit coordinates from the picker
  if (latStr && lonStr) {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new Response(
        buildErrorIcs("Ongeldige coördinaten in URL.", label || "?"),
        { status: 400, headers: icsHeaders() }
      );
    }
    geo = {
      id: `${name}-${lat}-${lon}`,
      name: name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      country: "",
      countryCode: "",
      latitude: lat,
      longitude: lon,
      timezone: tz || "Europe/Amsterdam",
    };
    if (!label) label = geo.name;
  }
  // Path B — legacy ?location=… : geocode ourselves
  else if (location) {
    geo = await geocode(location);
    if (!geo) {
      return new Response(
        buildErrorIcs(
          `We konden "${location}" niet vinden. Probeer een Nederlandse plaats of postcode.`,
          location
        ),
        { status: 404, headers: icsHeaders() }
      );
    }
    label = geo.name;
  }
  // Nothing usable
  else {
    return new Response(
      buildErrorIcs(
        "Geen locatie opgegeven. Gebruik ?lat=…&lon=…&name=… of ?location=Amsterdam.",
        ""
      ),
      { status: 400, headers: icsHeaders() }
    );
  }

  try {
    const forecast = await getForecast(geo);
    const ics = buildIcs(forecast, label);
    return new Response(ics, { status: 200, headers: icsHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return new Response(
      buildErrorIcs(`Open-Meteo gaf een fout terug: ${message}`, label),
      // 200 — so subscribers don't drop the feed; the event explains the issue
      { status: 200, headers: icsHeaders() }
    );
  }
}
