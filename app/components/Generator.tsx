"use client";

import { useMemo, useRef, useState } from "react";
import { DAY_SHORT_NL, MONTHS_NL, describeCode } from "@/lib/i18n";

// --- mock data for the marketing "what your calendar looks like" preview.
// (The real feed served at /api/ical uses live Open-Meteo data.)

type MockCond = { code: number };
function seededRand(seed: number, i: number) {
  const x = Math.sin(seed * 1000 + i * 13.37) * 10000;
  return x - Math.floor(x);
}

function mockForecast(loc: string) {
  const seed = [...(loc || "amsterdam")].reduce((a, c) => a + c.charCodeAt(0), 0);
  const codes = [0, 1, 2, 3, 45, 61, 63, 80, 95];
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const code = codes[Math.floor(seededRand(seed, i) * codes.length)];
    const hi = Math.round(10 + seededRand(seed, i + 1) * 18);
    const lo = hi - Math.round(3 + seededRand(seed, i + 2) * 5);
    const rain = Math.round(seededRand(seed, i + 3) * 95);
    const wind = Math.round(5 + seededRand(seed, i + 4) * 25);
    return { date: d, code, hi, lo, rain, wind };
  });
}

function slugify(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCase(s: string) {
  return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

export default function Generator({ originUrl }: { originUrl: string }) {
  const [loc, setLoc] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const q = loc.trim();
    if (!q) {
      setError("Voer een plaats of postcode in om door te gaan.");
      return;
    }
    if (q.length < 3) {
      setError(`We konden "${q}" niet vinden. Probeer een Nederlandse stad of postcode.`);
      return;
    }
    setLoading(true);
    // brief delay so the loading state is visible
    await new Promise(r => setTimeout(r, 500));
    setLoading(false);
    setSubmitted(q);
  };

  const pick = (v: string) => {
    setLoc(v);
    inputRef.current?.focus();
  };

  const previewLoc = submitted || "Amsterdam";

  return (
    <>
      <section className="hero">
        <div className="eyebrow"><span className="bar" />WeerAgenda · v1.0</div>
        <h1 className="headline">
          Je weer. <em>In je agenda.</em>
        </h1>
        <p className="subhead">
          Eén iCal-link en je agenda toont 7 dagen weersverwachting,
          ieder uur ververst. Geen app. Geen account. Werkt in Google Calendar,
          Apple Agenda en Outlook.
        </p>

        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="input-wrap">
              <input
                ref={inputRef}
                className="input"
                placeholder="Plaats of postcode — bijv. Amsterdam of 1011"
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spin" />
                  Ophalen…
                </>
              ) : (
                <>
                  Maak feed
                  <span className="btn-arrow" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="hint">
          <span>Probeer</span>
          <button type="button" className="chip" onClick={() => pick("Amsterdam")}>Amsterdam</button>
          <button type="button" className="chip" onClick={() => pick("Rotterdam")}>Rotterdam</button>
          <button type="button" className="chip" onClick={() => pick("Utrecht")}>Utrecht</button>
          <button type="button" className="chip" onClick={() => pick("1011 AB")}>1011 AB</button>
        </div>

        {error && <div className="error">⚠ {error}</div>}
      </section>

      {submitted && <Result location={submitted} originUrl={originUrl} />}

      <AgendaPreview location={previewLoc} />
    </>
  );
}

function Result({ location, originUrl }: { location: string; originUrl: string }) {
  const [copied, setCopied] = useState(false);
  const slug = slugify(location);
  const url = `${originUrl}/api/ical?location=${encodeURIComponent(location)}`;
  const webcal = url.replace(/^https?:/, "webcal:");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const displayName = titleCase(location);
  const forecast = useMemo(() => mockForecast(location), [location]);

  return (
    <section className="hero" style={{ paddingTop: 0 }}>
      <div className="result-shell">
        <div className="panel">
          <div className="panel-label">
            <span>Jouw iCal feed</span>
            <span>UID · weeragenda/{slug}</span>
          </div>
          <div className="url-block">
            <div className="url-text">{url}</div>
            <button className={`copy-btn ${copied ? "ok" : ""}`} onClick={copy}>
              {copied ? "GEKOPIEERD" : "KOPIEER"}
            </button>
          </div>

          <div className="quick-actions">
            <a href={webcal}>
              <span>Open in Apple Agenda</span>
              <span className="ext" />
            </a>
            <a
              href={`https://calendar.google.com/calendar/u/0/r/settings/addbyurl?cid=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>Open in Google Calendar</span>
              <span className="ext" />
            </a>
          </div>

          <div className="meta-grid">
            <div className="meta-cell">
              <div className="k">Locatie</div>
              <div className="v">{displayName}</div>
            </div>
            <div className="meta-cell">
              <div className="k">Verversing</div>
              <div className="v">PT1H · ieder uur</div>
            </div>
            <div className="meta-cell">
              <div className="k">Vooruitzicht</div>
              <div className="v">7 dagen · all-day</div>
            </div>
          </div>
        </div>

        <div className="panel preview">
          <div className="preview-head">
            <div className="preview-title">{displayName}</div>
            <div className="preview-sub">Voorbeeld · 7d</div>
          </div>
          <div className="week">
            {forecast.map((d, i) => {
              const cond = describeCode(d.code);
              return (
                <div className="day" key={i}>
                  <div className="when">
                    <b>{DAY_SHORT_NL[d.date.getDay()]}</b>
                    <small>
                      {String(d.date.getDate()).padStart(2, "0")}.
                      {String(d.date.getMonth() + 1).padStart(2, "0")}
                    </small>
                  </div>
                  <div className="summary">
                    <span className="icon">{cond.emoji}</span>
                    <span>{cond.label}</span>
                  </div>
                  <div className="stats">
                    <b>{d.hi}°</b> / {d.lo}° &nbsp;·&nbsp; {d.rain}% &nbsp;·&nbsp; {d.wind} km/u
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function AgendaPreview({ location }: { location: string }) {
  const displayName = titleCase(location);
  const forecast = useMemo(() => mockForecast(location), [location]);
  const [selected, setSelected] = useState(0);

  const hourly = useMemo(() => {
    const day = forecast[selected];
    const seed = [...(location + selected)].reduce((a, c) => a + c.charCodeAt(0), 0);
    const codes = [0, 1, 2, 3, 45, 61, 80];
    const hours = [6, 9, 12, 15, 18, 21];
    return hours.map((h, i) => {
      const code = codes[Math.floor(seededRand(seed, i + 1) * codes.length)];
      const temp = Math.round(day.lo + (day.hi - day.lo) * (0.3 + seededRand(seed, i + 2) * 0.7));
      const rain = Math.round(seededRand(seed, i + 3) * (day.rain + 10));
      return { h, code, temp, rain };
    });
  }, [forecast, selected, location]);

  const day = forecast[selected];
  const dayCond = describeCode(day.code);
  const summary = `${dayCond.emoji} ${day.lo}° / ${day.hi}° — ${displayName}`;

  const otherEvents = [
    { dow: 1, t: "Standup", cls: "blue" },
    { dow: 1, t: "Lunch met Sanne", cls: "green" },
    { dow: 2, t: "Design review", cls: "purple" },
    { dow: 3, t: "Tandarts", cls: "blue" },
    { dow: 4, t: "Sprint planning", cls: "purple" },
    { dow: 5, t: "Vrijdagmiddagborrel", cls: "green" },
    { dow: 6, t: "Tennis · Vondelpark", cls: "blue" },
  ];

  const fmtRange = () => {
    const a = forecast[0].date;
    const b = forecast[6].date;
    return `${a.getDate()} ${MONTHS_NL[a.getMonth()]} – ${b.getDate()} ${MONTHS_NL[b.getMonth()]}`;
  };

  return (
    <section className="agenda-section" id="preview">
      <div className="section-kicker">— Hoe het eruit ziet</div>
      <h2 className="section-title">
        Naast je <em>vergaderingen</em>.
      </h2>
      <p className="agenda-intro">
        Elke dag krijgt één hele-dag event bovenaan met emoji, minimum- en
        maximumtemperatuur. Klik een dag aan om de uurlijkse uitsplitsing te
        zien die in de event-beschrijving staat.
      </p>

      <div className="agenda-shell">
        <div className="gcal">
          <div className="gcal-chrome">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div className="dots">
                <span /><span /><span />
              </div>
              <span>calendar.google.com</span>
            </div>
            <span>{fmtRange()}</span>
          </div>

          <div className="gcal-grid">
            <div className="gcal-rail">
              <div className="hour">09</div>
              <div className="hour">12</div>
              <div className="hour">15</div>
              <div className="hour">18</div>
            </div>
            {forecast.map((d, i) => {
              const cond = describeCode(d.code);
              const isToday = i === 0;
              return (
                <div className="gcal-col" key={i}>
                  <div className="gcal-col-head">
                    <div className="dow">{DAY_SHORT_NL[d.date.getDay()]}</div>
                    <div className={`dnum ${isToday ? "today" : ""}`}>{d.date.getDate()}</div>
                  </div>
                  <button
                    type="button"
                    className={`gcal-chip ${selected === i ? "active" : ""}`}
                    onClick={() => setSelected(i)}
                    title={`${cond.emoji} ${d.lo}° / ${d.hi}° — ${displayName}`}
                  >
                    {cond.emoji} {d.lo}° / {d.hi}°
                  </button>
                  {otherEvents
                    .filter((e) => e.dow === i)
                    .map((e, j) => (
                      <div key={j} className={`gcal-block ${e.cls}`}>{e.t}</div>
                    ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="gcal-event">
          <div className="gcal-event-head">
            <div className="gcal-event-bar" />
            <div className="gcal-event-title">{summary}</div>
            <div className="gcal-event-meta">
              <span className="pill">Hele dag</span>
              <span>
                {DAY_SHORT_NL[day.date.getDay()]}{" "}
                {String(day.date.getDate()).padStart(2, "0")}.
                {String(day.date.getMonth() + 1).padStart(2, "0")}
              </span>
              <span>{dayCond.label}</span>
            </div>
          </div>
          <div className="gcal-event-body">
            <div className="field">Beschrijving · uurlijks</div>
            <div className="hourly">
              {hourly.map((h, i) => {
                const cond = describeCode(h.code);
                return (
                  <div className="h-row" key={i}>
                    <div className="h-cell time">{String(h.h).padStart(2, "0")}:00</div>
                    <div className="h-cell icon">{cond.emoji}</div>
                    <div className="h-cell cond">{cond.label}</div>
                    <div className="h-cell stat">
                      <b style={{ color: "var(--fg)" }}>{h.temp}°</b> ·{" "}
                      <span className="rain">{h.rain}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="gcal-event-foot">
              <span>wind {day.wind} km/u · zw</span>
              <span>bron · open-meteo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
