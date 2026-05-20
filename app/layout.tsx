import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WeerAgenda — Het weer in jouw Agenda",
  description:
    "Eén iCal-link en jouw agenda toont elke 2 uur het weer, 7 dagen vooruit. Werkt in Google Calendar, Apple Agenda en Outlook.",
  metadataBase: new URL("https://weeragenda.app"),
  openGraph: {
    title: "WeerAgenda",
    description: "Het weer in jouw Agenda.",
    locale: "nl_NL",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="nl"
      data-theme="navy"
      className={`${instrumentSerif.variable} ${jetbrainsMono.variable} ${inter.variable}`}
    >
      <body>
        <div className="ambient" aria-hidden="true">
          <div className="clouds">
            <div className="cloud c1" />
            <div className="cloud c2" />
            <div className="cloud c3" />
            <div className="cloud c4" />
          </div>
        </div>
        <div className="grain" aria-hidden="true" />
        <div className="page">{children}</div>
      </body>
    </html>
  );
}
