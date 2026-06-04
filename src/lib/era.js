// In-world time. The realm's clock is the world's tick count: every tick is one
// "Year". Years are grouped into Ages of AGE_LENGTH years each, giving lineages
// an immersive reckoning ("Age II · Year 47") instead of real-world dates.

export const AGE_LENGTH = 100; // years (ticks) per Age

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
  const age = Math.floor(t / AGE_LENGTH) + 1;
  const year = t % AGE_LENGTH;
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
  return Math.max(0, Math.floor(endTick) - Math.floor(bornTick));
}

// ── Day / night cycle ───────────────────────────────────────────────────────
// A separate, faster ambient layer on top of the calendar: the sun wheels once
// every DAY_TICKS ticks. Sunrise sits at the start of the cycle, noon a quarter
// in, sunset at the half, midnight three-quarters in.

export const DAY_TICKS = 24;

const clamp01 = (n) => Math.max(0, Math.min(1, n));

// Resolve a tick to the state of the sky.
//   t        — position in the cycle, 0..1 (0 = sunrise)
//   daylight — 0 (deep night) .. 1 (full noon)
//   isNight  — true when torches should be lit
//   phase    — 'dawn' | 'day' | 'dusk' | 'night'
export function dayCycle(tick) {
  const ticks = Number(tick);
  // Before the first tick is known, sit at midday rather than flashing to night.
  const n = Number.isFinite(ticks) ? ticks : DAY_TICKS * 0.25;
  const t = (((n % DAY_TICKS) + DAY_TICKS) % DAY_TICKS) / DAY_TICKS;

  // Sun altitude peaks at t=0.25 (noon), bottoms at t=0.75 (midnight). Bias the
  // mapping so the short dawn/dusk windows still read as partly lit.
  const altitude = Math.sin(t * Math.PI * 2);      // -1..1
  const daylight = clamp01((altitude + 0.35) / 1.35);

  let phase;
  if (t < 0.08 || t >= 0.92) phase = 'dawn';
  else if (t < 0.42) phase = 'day';
  else if (t < 0.58) phase = 'dusk';
  else phase = 'night';

  return { t, daylight, isNight: daylight < 0.32, phase };
}
