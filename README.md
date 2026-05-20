# WeerAgenda

Personalized weather feeds for your calendar app. Type a city or Dutch postcode,
get a unique iCal URL, subscribe to it in Google Calendar / Apple Agenda / Outlook
— and every day shows up as an all-day event with the forecast in the title and an
hourly breakdown in the description.

- **Stack:** Next.js 14 (App Router) · TypeScript · zero database
- **Weather data:** [Open-Meteo](https://open-meteo.com) (free, no API key)
- **Deploy:** Vercel

## Routes

| Path | What it does |
|---|---|
| `GET /` | Landing page · Dutch UI · location input → iCal URL |
| `GET /api/ical?location=Amsterdam` | Returns `text/calendar; charset=utf-8` ICS feed, 7 days, refreshed hourly |

## ICS shape

- One `VEVENT` per day, all-day (`DTSTART;VALUE=DATE` / `DTEND;VALUE=DATE`)
- `SUMMARY` — `⛅ 12° / 19° — Amsterdam`
- `DESCRIPTION` — hourly table (06/09/12/15/18/21h) with condition, temp, rain%, wind
- `UID` — `weather-YYYYMMDD-{slug}@weeragenda`
- `REFRESH-INTERVAL;VALUE=DURATION:PT1H` + `X-PUBLISHED-TTL:PT1H` so Google/Apple
  poll hourly
- `CACHE-CONTROL: public, s-maxage=3600` so Vercel's edge cache holds it for an hour

## Local dev

```bash
pnpm install      # or npm install / yarn
pnpm dev          # http://localhost:3000
```

Try the feed directly:

```
http://localhost:3000/api/ical?location=Amsterdam
http://localhost:3000/api/ical?location=1011
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com) → **Add New… → Project** → import the repo.
3. Vercel detects Next.js automatically. No environment variables required.
4. Deploy. The feed lives at `https://<your-domain>/api/ical?location=Amsterdam`.

## Project layout

```
app/
  layout.tsx                 — fonts, ambient background, root metadata
  page.tsx                   — composes the landing page
  globals.css                — full design system (navy theme)
  components/
    TopBar.tsx               — status indicator + nav
    Generator.tsx            — client: form + result + agenda preview
    Instructions.tsx         — client: Google/Apple tabs
    Features.tsx             — static three-up
    Footer.tsx
  api/
    ical/route.ts            — the ICS endpoint
lib/
  geocode.ts                 — Open-Meteo geocoding (handles NL postcodes)
  weather.ts                 — Open-Meteo forecast client
  ics.ts                     — RFC 5545 builder (no deps)
  i18n.ts                    — WMO code → Dutch label + emoji
```

## How errors surface

If a location can't be geocoded, the API returns an ICS feed containing a single
explanatory event for today instead of an HTTP error — that way Google/Apple
keep the subscription alive and the user sees the message in their calendar.
The same goes for Open-Meteo outages.

## License

MIT.
