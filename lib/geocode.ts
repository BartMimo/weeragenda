// Open-Meteo Geocoding API client
// Docs: https://open-meteo.com/en/docs/geocoding-api
//
// Two entrypoints:
//   searchLocations(q, { limit })  — returns up to N candidates, NL-preferred
//   geocode(q)                     — returns the single best candidate or null

const GEO_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";

export type GeoResult = {
  /** stable-ish key built from name + lat/lng — for React lists */
  id: string;
  name: string;
  country: string;
  countryCode: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population?: number;
};

type ApiHit = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
  population?: number;
  postcodes?: string[];
};

const DUTCH_POSTCODE_RE = /^\s*(\d{4})\s*([A-Za-z]{2})?\s*$/;

function toResult(hit: ApiHit): GeoResult {
  return {
    id: `${hit.name}-${hit.latitude.toFixed(3)}-${hit.longitude.toFixed(3)}`,
    name: hit.name,
    country: hit.country ?? "",
    countryCode: hit.country_code ?? "",
    admin1: hit.admin1,
    latitude: hit.latitude,
    longitude: hit.longitude,
    timezone: hit.timezone ?? "Europe/Amsterdam",
    population: hit.population,
  };
}

async function fetchHits(params: URLSearchParams): Promise<ApiHit[]> {
  try {
    const res = await fetch(`${GEO_ENDPOINT}?${params.toString()}`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: ApiHit[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

/**
 * Return up to `limit` candidates, NL-preferred.
 *
 * Strategy:
 *  - Postcode-like query → restrict to NL.
 *  - Otherwise → fetch a wider global list, then float NL hits to the top
 *    (by population, desc), then everything else (by population, desc).
 */
export async function searchLocations(
  query: string,
  opts?: { limit?: number }
): Promise<GeoResult[]> {
  const q = (query || "").trim();
  if (!q) return [];
  const limit = opts?.limit ?? 6;
  const isDutchPostcode = DUTCH_POSTCODE_RE.test(q);

  if (isDutchPostcode) {
    const four = q.replace(DUTCH_POSTCODE_RE, "$1");
    const params = new URLSearchParams({
      name: four,
      count: "10",
      language: "nl",
      format: "json",
      countryCode: "NL",
    });
    const hits = await fetchHits(params);
    // Prefer hits that actually list this postcode
    const exact = hits.filter(h => (h.postcodes ?? []).some(p => p.startsWith(four)));
    const ordered = exact.length ? [...exact, ...hits.filter(h => !exact.includes(h))] : hits;
    return ordered.slice(0, limit).map(toResult);
  }

  // City name: fetch wider list, sort NL-first
  const params = new URLSearchParams({
    name: q,
    count: "10",
    language: "nl",
    format: "json",
  });
  const hits = await fetchHits(params);
  if (!hits.length) return [];

  const popDesc = (a: ApiHit, b: ApiHit) =>
    (b.population ?? 0) - (a.population ?? 0);
  const nl = hits.filter(h => h.country_code === "NL").sort(popDesc);
  const rest = hits.filter(h => h.country_code !== "NL").sort(popDesc);
  return [...nl, ...rest].slice(0, limit).map(toResult);
}

/** Legacy single-result entry — keep for backwards compatibility. */
export async function geocode(query: string): Promise<GeoResult | null> {
  const list = await searchLocations(query, { limit: 1 });
  return list[0] ?? null;
}
