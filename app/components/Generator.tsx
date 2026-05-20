"use client";

import { useMemo, useRef, useState } from "react";
import { DAY_SHORT_NL, MONTHS_NL, describeCode } from "@/lib/i18n";

type Picked = {
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

// --- seeded mock data for the landing-page preview only.
// The real feed at /api/ical uses live Open-Meteo data.

function seededRand(seed: number, i: number) {
  const x = Math.sin(seed * 1000 + i * 13.37) * 10000;
  return x - Math.floor(x);
}

const PREVIEW_HOURS = [8, 12, 16, 20];

type MockBlock = {
  hour: number;
  code: number;
  temp: number;
  rain: number;
  wind: number;
};

type MockDay = {
  date: Date;
  hi: number;
  lo: number;
  blocks: MockBlock[];
};

function mockForecast(loc: string): MockDay[] {
  const seed = [...(loc || "amsterdam")].reduce((a, c) => a + c.charCodeAt(0), 0);
  const codes = [0, 1, 2, 3, 45, 61, 63, 80, 95];
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const baseHi = Math.round(10 + seededRand(seed, i + 1) * 18);
    const baseLo = baseHi - Math.round(3 + seededRand(seed, i + 2) * 5);

    const blocks: MockBlock[] = PREVIEW_HOURS.map((hour, j) => {
      // warmer mid-day, colder morning/evening
      const curveT = Math.sin(((hour - 4) / 16) * Math.PI);
      const temp = Math.round(baseLo + (baseHi - baseLo) * (0.3 + 0.7 * curveT));
      const code = codes[Math.floor(seededRand(seed, i * 10 + j) * codes.length)];
      const rain = Math.round(seededRand(seed, i * 10 + j + 5) * 90);
      const wind = Math.round(6 + seededRand(seed, i * 10 + j + 9) * 20);
      return { hour, code, temp, rain, wind };
    });
    return { date: d, hi: baseHi, lo: baseLo, blocks };
  });
}

function titleCase(s: string) {
  return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function locationLine(p: Picked) {
  const parts = [p.name];
  if (p.admin1 && p.admin1 !== p.name) parts.push(p.admin1);
  if (p.country) parts.push(p.country);
  return parts.join(", ");
}

function fmtPop(n?: number) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M inw.`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k inw.`;
  return `${n} inw.`;
}

export default function Generator({ originUrl }: { originUrl: string }) {
  const [loc, setLoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [alts, setAlts] = useState<Picked[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const q = loc.trim();
    if (!q) {
      setError("Voer een plaats of postcode in om door te gaan.");
      return;
    }
    if (q.length < 2) {
      setError(`Voer minstens twee tekens in.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { results: Picked[] };
      const results = data.results ?? [];
      if (!results.length) {
        setPicked(null);
        setAlts([]);
        setError(`We konden "${q}" niet vinden. Probeer een andere plaats of postcode.`);
      } else {
        setPicked(results[0]);
        setAlts(results.slice(1));
      }
    } catch {
      setError("Er ging iets mis bij het opzoeken. Probeer het zo nog eens.");
    } finally {
      setLoading(false);
    }
  };

  const pick = (v: string) => {
    setLoc(v);
    inputRef.current?.focus();
  };

  const previewLoc = picked?.name || "Amsterdam";

  return (
    <>
      <section className="hero">
        <div className="eyebrow"><span className="bar" />WeerAgenda · v1.0</div>
        <h1 className="headline">
          Het weer in <em>jouw Agenda</em>.
        </h1>
        <p className="subhead">
          Eén iCal-link en jouw agenda toont elke 2 uur het weer, 7 dagen
          vooruit. Ieder uur ververst. Geen app. Geen account. Werkt in
          Google Calendar, Apple Agenda en Outlook.
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
                  Zoeken…
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

      {picked && (
        <Result
          picked={picked}
          alternatives={alts}
          onPick={(p) => {
            setPicked(p);
            setAlts((prev) => {
              const merged = [picked, ...prev].filter(x => x.id !== p.id);
              return merged;
            });
          }}
          originUrl={originUrl}
        />
      )}

      <AgendaPreview location={previewLoc} />
    </>
  );
}

function Result({
  picked,
  alternatives,
  onPick,
  originUrl,
}: {
  picked: Picked;
  alternatives: Picked[];
  onPick: (p: Picked) => void;
  originUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showAlts, setShowAlts] = useState(false);

  const params = new URLSearchParams({
    lat: picked.latitude.toFixed(4),
    lon: picked.longitude.toFixed(4),
    name: picked.name,
    tz: picked.timezone,
  });
  const url = `${originUrl}/api/ical?${params.toString()}`;
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

  const displayName = titleCase(picked.name);
  const forecast = useMemo(() => mockForecast(picked.name), [picked.name]);

  return (
    <section className="hero" style={{ paddingTop: 0 }}>
      <div className="result-shell">
        <div className="panel">
          <div className="panel-label">
            <span>Jouw iCal feed</span>
            <span>{picked.countryCode || "—"} · {picked.latitude.toFixed(2)}, {picked.longitude.toFixed(2)}</span>
          </div>

          <div className="picked-row">
            <div className="picked-mark">✓</div>
            <div className="picked-info">
              <div className="picked-name">{locationLine(picked)}</div>
              <div className="picked-meta">
                {fmtPop(picked.population) && <span>{fmtPop(picked.population)}</span>}
                <span>tz: {picked.timezone}</span>
              </div>
            </div>
            {alternatives.length > 0 && (
              <button
                type="button"
                className="picked-switch"
                onClick={() => setShowAlts((s) => !s)}
                aria-expanded={showAlts}
              >
                {showAlts ? "Sluit" : "Andere?"}
              </button>
            )}
          </div>

          {showAlts && alternatives.length > 0 && (
            <div className="alts">
              <div className="alts-label">Bedoel je een van deze?</div>
              {alternatives.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="alt-row"
                  onClick={() => { onPick(a); setShowAlts(false); }}
                >
                  <span className="alt-name">{locationLine(a)}</span>
                  <span className="alt-meta">
                    {fmtPop(a.population) ?? "—"}
                    <span className="alt-dot">·</span>
                    {a.latitude.toFixed(2)}, {a.longitude.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}

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
              <div className="v">7d · 2-uurs blok</div>
            </div>
          </div>
        </div>

        <div className="panel preview">
          <div className="preview-head">
            <div className="preview-title">{displayName}</div>
            <div className="preview-sub">Daggemiddelden · 7d</div>
          </div>
          <div className="week">
            {forecast.map((d, i) => {
              // pick a "headline" block for each day — the warmest of the four
              const headline = d.blocks.reduce((m, b) => (b.temp > m.temp ? b : m), d.blocks[0]);
              const cond = describeCode(headline.code);
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
                    <b>{d.hi}°</b> / {d.lo}° &nbsp;·&nbsp; {headline.rain}% &nbsp;·&nbsp; {headline.wind} km/u
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
  const [sel, setSel] = useState<{ day: number; block: number }>({ day: 0, block: 1 });

  const day = forecast[sel.day];
  const block = day.blocks[sel.block];
  const cond = describeCode(block.code);
  const startHH = String(block.hour).padStart(2, "0");
  const endHH = String((block.hour + 2) % 24).padStart(2, "0");
  const summary = `${cond.emoji} ${block.temp}° · ${cond.label}`;

  const otherEvents = [
    { dow: 1, t: "Standup", cls: "blue" },
    { dow: 2, t: "Design review", cls: "purple" },
    { dow: 3, t: "Tandarts", cls: "blue" },
    { dow: 4, t: "Sprint planning", cls: "purple" },
    { dow: 5, t: "Vrijdagmiddagborrel", cls: "green" },
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
        Elke <em>twee uur</em> een update.
      </h2>
      <p className="agenda-intro">
        Geen massieve hele-dag balk: je krijgt twaalf compacte blokjes per dag,
        elk met de emoji, temperatuur en weerconditie voor die 2 uur. Klik
        een blokje om te zien wat erin staat.
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
            {forecast.map((d, i) => {
              const isToday = i === 0;
              return (
                <div className="gcal-col" key={i}>
                  <div className="gcal-col-head">
                    <div className="dow">{DAY_SHORT_NL[d.date.getDay()]}</div>
                    <div className={`dnum ${isToday ? "today" : ""}`}>{d.date.getDate()}</div>
                  </div>

                  <div className="block-stack">
                    {d.blocks.map((b, j) => {
                      const bCond = describeCode(b.code);
                      const active = sel.day === i && sel.block === j;
                      return (
                        <button
                          key={j}
                          type="button"
                          className={`block-pill ${active ? "active" : ""}`}
                          onClick={() => setSel({ day: i, block: j })}
                          title={`${String(b.hour).padStart(2, "0")}:00 ${bCond.emoji} ${b.temp}° · ${bCond.label}`}
                        >
                          <span className="bp-time">{String(b.hour).padStart(2, "0")}</span>
                          <span className="bp-emoji">{bCond.emoji}</span>
                          <span className="bp-temp">{b.temp}°</span>
                        </button>
                      );
                    })}
                  </div>

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
              <span className="pill">{startHH}:00 – {endHH}:00</span>
              <span>
                {DAY_SHORT_NL[day.date.getDay()]}{" "}
                {String(day.date.getDate()).padStart(2, "0")}.
                {String(day.date.getMonth() + 1).padStart(2, "0")}
              </span>
              <span>{displayName}</span>
            </div>
          </div>
          <div className="gcal-event-body">
            <div className="field">Beschrijving</div>
            <div className="stat-list">
              <div className="stat-row">
                <span className="stat-k">Temperatuur</span>
                <span className="stat-v"><b>{block.temp}°C</b></span>
              </div>
              <div className="stat-row">
                <span className="stat-k">Regenkans</span>
                <span className="stat-v"><b className="rain">{block.rain}%</b></span>
              </div>
              <div className="stat-row">
                <span className="stat-k">Wind</span>
                <span className="stat-v"><b>{block.wind} km/u</b></span>
              </div>
              <div className="stat-row">
                <span className="stat-k">Conditie</span>
                <span className="stat-v">{cond.label}</span>
              </div>
            </div>
            <div className="gcal-event-foot">
              <span>1 van 12 blokken · {DAY_SHORT_NL[day.date.getDay()]}</span>
              <span>bron · open-meteo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
