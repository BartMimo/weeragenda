// WMO Weather interpretation codes → Dutch labels + emoji
// https://open-meteo.com/en/docs (see "WMO Weather interpretation codes")

export type Condition = {
  label: string;
  emoji: string;
};

const TABLE: Record<number, Condition> = {
  0:  { label: "Helder",              emoji: "☀" },
  1:  { label: "Overwegend helder",   emoji: "🌤" },
  2:  { label: "Half bewolkt",        emoji: "⛅" },
  3:  { label: "Bewolkt",             emoji: "☁" },
  45: { label: "Mist",                emoji: "🌫" },
  48: { label: "IJzige mist",         emoji: "🌫" },
  51: { label: "Lichte motregen",     emoji: "🌦" },
  53: { label: "Motregen",            emoji: "🌦" },
  55: { label: "Dichte motregen",     emoji: "🌧" },
  56: { label: "Lichte ijzige motregen", emoji: "🌧" },
  57: { label: "Dichte ijzige motregen", emoji: "🌧" },
  61: { label: "Lichte regen",        emoji: "🌦" },
  63: { label: "Regen",               emoji: "🌧" },
  65: { label: "Zware regen",         emoji: "🌧" },
  66: { label: "Lichte ijzel",        emoji: "🌧" },
  67: { label: "Zware ijzel",         emoji: "🌧" },
  71: { label: "Lichte sneeuw",       emoji: "🌨" },
  73: { label: "Sneeuw",              emoji: "🌨" },
  75: { label: "Zware sneeuw",        emoji: "❄" },
  77: { label: "Sneeuwkorrels",       emoji: "🌨" },
  80: { label: "Lichte buien",        emoji: "🌦" },
  81: { label: "Buien",               emoji: "🌧" },
  82: { label: "Hevige buien",        emoji: "⛈" },
  85: { label: "Lichte sneeuwbuien",  emoji: "🌨" },
  86: { label: "Sneeuwbuien",         emoji: "❄" },
  95: { label: "Onweer",              emoji: "⛈" },
  96: { label: "Onweer met hagel",    emoji: "⛈" },
  99: { label: "Zwaar onweer met hagel", emoji: "⛈" },
};

export function describeCode(code: number): Condition {
  return TABLE[code] ?? { label: "Onbekend", emoji: "·" };
}

export const DAY_NAMES_NL = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
export const DAY_SHORT_NL = ["zo", "ma", "di", "wo", "do", "vr", "za"];
export const MONTHS_NL = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
