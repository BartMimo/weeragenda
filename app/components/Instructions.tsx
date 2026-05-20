"use client";

import { useState, type ReactNode } from "react";

type Step = { t: string; d: ReactNode };

const STEPS_GOOGLE: Step[] = [
  {
    t: "Kopieer je iCal URL",
    d: "Tik op KOPIEER bij je gegenereerde feed hierboven.",
  },
  {
    t: "Open Google Calendar in een browser",
    d: (
      <>
        Ga naar <code>calendar.google.com</code> op je computer — dit werkt
        niet in de app.
      </>
    ),
  },
  {
    t: "Andere agenda's → Via URL toevoegen",
    d: (
      <>
        Klik links op <code>+</code> naast &quot;Andere agenda&apos;s&quot; en
        kies <code>Via URL</code>.
      </>
    ),
  },
  {
    t: "Plak en bevestig",
    d: "Plak de URL, klik op Agenda toevoegen. Google ververst ieder uur.",
  },
];

const STEPS_APPLE: Step[] = [
  {
    t: "Kopieer je iCal URL",
    d: "Of klik op \"Open in Apple Agenda\" voor automatisch toevoegen.",
  },
  {
    t: "Open de Agenda app",
    d: (
      <>
        Op Mac: menu <code>Bestand → Nieuw agenda-abonnement</code>.
      </>
    ),
  },
  {
    t: "Plak en abonneer",
    d: "Plak de URL en kies Abonneren.",
  },
  {
    t: "Stel ververs-frequentie in",
    d: (
      <>
        Kies <code>Iedere uur</code> en sla op. Klaar.
      </>
    ),
  },
];

export default function Instructions() {
  const [tab, setTab] = useState<"google" | "apple">("google");
  const steps = tab === "google" ? STEPS_GOOGLE : STEPS_APPLE;
  return (
    <section className="instructions" id="instructions">
      <div className="section-kicker">— Installatie</div>
      <h2 className="section-title">
        In <em>vier stappen</em> in je agenda.
      </h2>

      <div className="tabs" role="tablist">
        <button
          type="button"
          className={`tab ${tab === "google" ? "active" : ""}`}
          onClick={() => setTab("google")}
        >
          Google Calendar
        </button>
        <button
          type="button"
          className={`tab ${tab === "apple" ? "active" : ""}`}
          onClick={() => setTab("apple")}
        >
          Apple Agenda
        </button>
      </div>

      <div className="steps">
        {steps.map((s, i) => (
          <div className="step" key={i}>
            <div className="n">0{i + 1}</div>
            <div className="t">{s.t}</div>
            <div className="d">{s.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
