// In-world time. The realm's clock is the world's tick count (one tick ≈ one real
// minute). Ticks roll up into in-world days and years so lineages get an immersive
// reckoning ("Age II · Year 47") instead of real-world dates.
//
//   DAY_TICKS      = 60     → one in-world day ≈ 1 real hour
//   TICKS_PER_YEAR = 21900  → 365 in-world days ≈ 365 real hours per year
//   AGE_LENGTH     = 100    → years per Age

export const DAY_TICKS = 60;            // ticks per in-world day
export const TICKS_PER_YEAR = 21900;    // ticks per in-world year (365 × DAY_TICKS)
export const AGE_LENGTH = 100;          // years per Age

const ROMAN = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function toRoman(n) {
  let out = '';
  let v = Math.max(1, Math.floor(n));
  for (const [val, sym] of ROMAN) while (v >= val) { out += sym; v -= val; }
  return out;
}

// A single tick → { age, year } and a display label.
export function reckon(tick) {
  const t = Math.max(0, Math.floor(Number(tick) || 0));
  const years = Math.floor(t / TICKS_PER_YEAR);
  const age = Math.floor(years / AGE_LENGTH) + 1;
  const year = years % AGE_LENGTH;
  return { age, year };
}

// "Age II · Year 47". Returns null when no tick is recorded (legacy life).
export function eraLabel(tick) {
  if (tick === null || tick === undefined) return null;
  const { age, year } = reckon(tick);
  return `Age ${toRoman(age)} · Year ${year}`;
}

// Whole years lived between two ticks (death/current minus birth).
export function span(bornTick, endTick) {
  if (bornTick === null || bornTick === undefined) return null;
  if (endTick === null || endTick === undefined) return null;
  return Math.max(0, Math.floor((Math.floor(endTick) - Math.floor(bornTick)) / TICKS_PER_YEAR));
}

// ── Day / night cycle ───────────────────────────────────────────────────────
// A faster ambient layer on top of the calendar: the sun wheels once every
// DAY_TICKS ticks. The cycle is split so the FIRST half is day and the second
// half is night — a freshly seeded world (tickCount near 0) therefore opens at
// dawn and climbs into daylight, instead of reading as perpetual night.
//   t=0.00 sunrise · t=0.25 noon · t=0.50 sunset · t=0.75 midnight

const clamp01 = (n) => Math.max(0, Math.min(1, n));

// Resolve a tick to the state of the sky.
//   t        — position in the cycle, 0..1 (0 = sunrise)
//   daylight — 0 (deep night) .. 1 (full noon)
//   isNight  — true when torches should be lit / the layout flips dark
//   phase    — 'dawn' | 'day' | 'dusk' | 'night'
export function dayCycle(tick) {
  const ticks = Number(tick);
  // Before the first tick is known, sit in the morning rather than flashing dark.
  const n = Number.isFinite(ticks) ? ticks : DAY_TICKS * 0.15;
  const t = (((n % DAY_TICKS) + DAY_TICKS) % DAY_TICKS) / DAY_TICKS;

  // Sun altitude peaks at noon (t=0.25), bottoms at midnight (t=0.75).
  const altitude = Math.sin(t * Math.PI * 2);      // -1..1
  const daylight = clamp01((altitude + 0.5) / 1.5);

  // Day is the first half of the cycle, night the second. Night is when the sun
  // is below the horizon (t in (0.5, 1.0)).
  const isNight = t >= 0.5;

  let phase;
  if (t < 0.06) phase = 'dawn';
  else if (t < 0.44) phase = 'day';
  else if (t < 0.56) phase = 'dusk';
  else phase = 'night';

  return { t, daylight, isNight, phase };
}
