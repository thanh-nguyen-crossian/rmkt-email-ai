// ============================================================================
// DATE → OCCASION / THEME recommender.
//
// Ported from the DEPLOYED EmailAuto Studio engine
// (emailauto-studio-main/lib/config/occasions.ts → occasionsInWindow):
//   • each occasion has a fixed date + a LEAD-UP window (windowDays BEFORE it);
//   • an occasion is "active" when the send date falls in
//     [date − windowDays  …  date]  (the exact day is included);
//   • daysUntil wraps the year boundary (late-Dec dates match New Year, etc.).
//
// Extended minimally with an optional `end` date so a multi-week event
// (FIFA World Cup 2026) stays active for the WHOLE tournament, not just its
// lead-up. Single-day holidays outrank an ongoing event when both are active.
// ============================================================================

export type MD = { month: number; day: number }; // month 1-12, day 1-31

export type Occasion = {
  id: string;
  theme: string; // theme label fed to the builder / content generator
  why: string; // short human reason shown under the Theme field
  date: MD; // the occasion day (or the range START when `end` is set)
  end?: MD; // optional inclusive range end — for multi-week events
  windowDays: number; // lead-up days BEFORE `date` the theme starts recommending
};

// Cumulative day-of-year offset per month (index 1-12; ignores leap year, ±1 day ok)
const MONTH_OFFSETS = [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const toDoy = (m: number, d: number) => MONTH_OFFSETS[m] + d;

// Same shape/spirit as the Studio's OCCASIONS list, trimmed to the themes this
// builder offers, PLUS the two requested additions (World Cup 2026, July 4th).
export const OCCASIONS: Occasion[] = [
  { id: 'new_year',     theme: 'New Year',     why: 'New Year lead-up',                       date: { month: 1,  day: 1  }, windowDays: 7  },
  { id: 'valentines',   theme: "Valentine's",  why: "Valentine's Day (14 Feb) lead-up",       date: { month: 2,  day: 14 }, windowDays: 10 },
  // FIFA World Cup 2026 (USA/Canada/Mexico): 11 Jun → 19 Jul 2026. Range event.
  { id: 'world_cup_26', theme: 'World Cup',    why: 'FIFA World Cup 2026 (11 Jun – 19 Jul)',  date: { month: 6,  day: 11 }, end: { month: 7, day: 19 }, windowDays: 14 },
  // US Independence Day — "ngày giải phóng Mỹ" 4 Jul. Single day.
  { id: 'independence', theme: 'July 4th',     why: 'US Independence Day (4 Jul)',            date: { month: 7,  day: 4  }, windowDays: 10 },
  { id: 'halloween',    theme: 'Halloween',    why: 'Halloween (31 Oct) lead-up',             date: { month: 10, day: 31 }, windowDays: 14 },
  { id: 'black_friday', theme: 'Black Friday', why: 'Black Friday week (27 Nov 2026)',        date: { month: 11, day: 27 }, windowDays: 10 },
  { id: 'christmas',    theme: 'Christmas',     why: 'Christmas (25 Dec) lead-up',             date: { month: 12, day: 25 }, windowDays: 21 },
];

/** Days from the send date until an occasion — 0 while inside a range event. */
function proximity(occ: Occasion, targetDoy: number): number {
  const start = toDoy(occ.date.month, occ.date.day);
  const end = occ.end ? toDoy(occ.end.month, occ.end.day) : start;
  if (targetDoy >= start && targetDoy <= end) return 0; // on the day / inside the event
  let daysUntil = start - targetDoy;
  if (daysUntil < 0) daysUntil += 365; // wrap the year boundary
  return daysUntil;
}

/** All occasions whose lead-up window (or event range) is active on month/day. */
export function occasionsInWindow(month: number, day: number): Occasion[] {
  const target = toDoy(month, day);
  return OCCASIONS.filter((occ) => {
    const start = toDoy(occ.date.month, occ.date.day);
    const end = occ.end ? toDoy(occ.end.month, occ.end.day) : start;
    if (target >= start && target <= end) return true; // inside the day / event
    let daysUntil = start - target;
    if (daysUntil < 0) daysUntil += 365;
    return daysUntil >= 0 && daysUntil <= occ.windowDays; // in the lead-up window
  });
}

/**
 * Pick ONE recommended theme for a send date.
 * A dated single-day holiday (e.g. July 4th) outranks an ongoing multi-week
 * event (World Cup) when both are active; otherwise the nearest one wins.
 * Falls back to a plain season label when no occasion is in window.
 */
export function recommendTheme(iso: string): { theme: string; why: string } {
  const d = new Date(iso + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const target = toDoy(month, day);
  const active = occasionsInWindow(month, day);
  if (active.length) {
    active.sort((a, b) => {
      const tierA = a.end ? 1 : 0; // range events rank AFTER single-day holidays
      const tierB = b.end ? 1 : 0;
      if (tierA !== tierB) return tierA - tierB;
      return proximity(a, target) - proximity(b, target); // then the nearest
    });
    return { theme: active[0].theme, why: active[0].why };
  }
  const season =
    month >= 6 && month <= 8 ? 'Summer' : month >= 3 && month <= 5 ? 'Spring' : month >= 9 && month <= 11 ? 'Fall' : 'Winter';
  return { theme: season, why: 'off-season — no holiday in window' };
}

// Theme dropdown options — every value recommendTheme() can return, plus the
// evergreen CRM themes a marketer may pick manually. (A controlled <select>
// needs its current value present here, so keep these in sync.)
export const THEME_OPTIONS = [
  'World Cup',
  'July 4th',
  "Valentine's",
  'Black Friday',
  'Halloween',
  'Christmas',
  'New Year',
  'Summer',
  'Spring',
  'Fall',
  'Winter',
  'Winback',
  'New Arrival',
  'Abandoned Cart',
  'Loyalty / VIP',
];
