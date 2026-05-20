// Open-Meteo Forecast API client.
// Docs: https://open-meteo.com/en/docs

import type { GeoResult } from "./geocode";

const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

export type HourSample = {
  /** Local ISO timestamp e.g. "2026-05-20T13:00" */
  time: string;
  temperature: number;        // °C
  precipitationProb: number;  // 0–100
  weatherCode: number;        // WMO
  windSpeed: number;          // km/h
};

export type DaySummary = {
  /** Local ISO date e.g. "2026-05-20" */
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbMax: number;
  windSpeedMax: number;
  hours: HourSample[]; // all 24 hourly samples for this date
};

export type Forecast = {
  location: GeoResult;
  fetchedAt: string;     // ISO
  timezone: string;
  /** Offset from UTC at the location, in seconds. Used to convert
   *  Open-Meteo's local-timestamped hourly samples to UTC for ICS. */
  utcOffsetSeconds: number;
  days: DaySummary[];    // length 7
};

type ApiResponse = {
  timezone: string;
  utc_offset_seconds: number;
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weathercode: number[];
    windspeed_10m: number[];
  };
  daily: {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    windspeed_10m_max: number[];
  };
};

export async function getForecast(loc: GeoResult): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    hourly: "temperature_2m,precipitation_probability,weathercode,windspeed_10m",
    daily: "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max",
    timezone: loc.timezone,
    forecast_days: "7",
    wind_speed_unit: "kmh",
    temperature_unit: "celsius",
  });

  const res = await fetch(`${FORECAST_ENDPOINT}?${params.toString()}`, {
    // refresh hourly — the ICS feed sets the same TTL
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) {
    throw new Error(`Open-Meteo responded ${res.status}`);
  }
  const data = (await res.json()) as ApiResponse;

  // bucket hourly samples by their ISO date prefix (yyyy-mm-dd)
  const hoursByDate = new Map<string, HourSample[]>();
  for (let i = 0; i < data.hourly.time.length; i++) {
    const t = data.hourly.time[i];
    const date = t.slice(0, 10);
    const sample: HourSample = {
      time: t,
      temperature: data.hourly.temperature_2m[i],
      precipitationProb: data.hourly.precipitation_probability[i] ?? 0,
      weatherCode: data.hourly.weathercode[i],
      windSpeed: data.hourly.windspeed_10m[i],
    };
    const arr = hoursByDate.get(date) ?? [];
    arr.push(sample);
    hoursByDate.set(date, arr);
  }

  const days: DaySummary[] = data.daily.time.map((date, i) => ({
    date,
    weatherCode: data.daily.weathercode[i],
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    precipitationProbMax: data.daily.precipitation_probability_max[i] ?? 0,
    windSpeedMax: data.daily.windspeed_10m_max[i],
    hours: hoursByDate.get(date) ?? [],
  }));

  return {
    location: loc,
    fetchedAt: new Date().toISOString(),
    timezone: data.timezone,
    utcOffsetSeconds: data.utc_offset_seconds,
    days,
  };
}
