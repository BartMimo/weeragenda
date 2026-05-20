// Open-Meteo Geocoding API client
// Docs: https://open-meteo.com/en/docs/geocoding-api
//
// Accepts city names ("Amsterdam"), partial matches ("amst"), and Dutch
// postcodes ("1011", "1011 AB"). For 4-digit Dutch postcodes the geocoder
// works best when we also pass countryCode=NL.

const GEO_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";

export type GeoResult = {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

type ApiHit = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
  postcodes?: string[];
};

// Dutch 4-digit postcode (with optional 2-letter suffix)
const DUTCH_POSTCODE_RE = /^\s*(\d{4})\s*([A-Za-z]{2})?\s*$/;

export async function geocode(query: string): Promise<GeoResult | null> {
  const q = (query || "").trim();
  if (!q) return null;

  const isDutchPostcode = DUTCH_POSTCODE_RE.test(q);
  const cleanQ = isDutchPostcode
    ? q.replace(DUTCH_POSTCODE_RE, "$1")
    : q;

  const params = new URLSearchParams({
    name: cleanQ,
    count: isDutchPostcode ? "10" : "5",
    language: "nl",
    format: "json",
  });
  if (isDutchPostcode) params.set("countryCode", "NL");

  let res: Response;
  try {
    res = await fetch(`${GEO_ENDPOINT}?${params.toString()}`, {
      // keep server-side cache short — locations don't move
      next: { revalidate: 60 * 60 * 24 },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;
  const data = (await res.json()) as { results?: ApiHit[] };
  const hits = data.results ?? [];
  if (!hits.length) return null;

  // For postcodes, prefer a hit whose postcodes array actually contains it
  let hit: ApiHit | undefined;
  if (isDutchPostcode) {
    hit = hits.find(h =>
      (h.postcodes ?? []).some(p => p.startsWith(cleanQ))
    );
  }
  hit = hit ?? hits[0];

  return {
    name: hit.name,
    country: hit.country ?? "",
    admin1: hit.admin1,
    latitude: hit.latitude,
    longitude: hit.longitude,
    timezone: hit.timezone ?? "Europe/Amsterdam",
  };
}
