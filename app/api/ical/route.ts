// GET /api/ical?location=Amsterdam
// Returns a text/calendar feed for any Google Calendar / Apple Agenda /
// Outlook client to subscribe to.

import { NextRequest } from "next/server";
import { geocode } from "@/lib/geocode";
import { getForecast } from "@/lib/weather";
import { buildIcs, buildErrorIcs } from "@/lib/ics";

// Cache the ICS at the edge for 1 hour. Google fetches the feed
// hourly anyway; this just keeps us off Open-Meteo's API for repeats.
export const revalidate = 3600;
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const location = (url.searchParams.get("location") || "").trim();

  if (!location) {
    return new Response(
      buildErrorIcs("Geen locatie opgegeven. Gebruik ?location=Amsterdam.", ""),
      {
        status: 400,
        headers: icsHeaders(),
      }
    );
  }

  try {
    const geo = await geocode(location);
    if (!geo) {
      return new Response(
        buildErrorIcs(
          `We konden "${location}" niet vinden. Probeer een Nederlandse plaats of postcode.`,
          location
        ),
        {
          status: 404,
          headers: icsHeaders(),
        }
      );
    }

    const forecast = await getForecast(geo);
    const label = humanLabel(geo.name, location);
    const ics = buildIcs(forecast, label);

    return new Response(ics, {
      status: 200,
      headers: icsHeaders(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    return new Response(
      buildErrorIcs(`Open-Meteo gaf een fout terug: ${message}`, location),
      {
        // 200 — so subscribers don't drop the feed; the event explains the issue
        status: 200,
        headers: icsHeaders(),
      }
    );
  }
}

function icsHeaders() {
  return {
    "Content-Type": "text/calendar; charset=utf-8",
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400, max-age=3600",
    "Content-Disposition": `inline; filename="weeragenda.ics"`,
  };
}

// Prefer the user's exact spelling for postcode lookups,
// fall back to the geocoder's canonical name.
function humanLabel(geocoded: string, original: string): string {
  const looksLikePostcode = /^\d{4}/.test(original.trim());
  if (looksLikePostcode) return `${geocoded}`;
  return geocoded;
}
