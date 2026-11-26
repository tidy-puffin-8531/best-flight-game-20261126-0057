// Sky Courier — Island Run: weather.
// A sortie's sky is more than a palette. On the storm run the crosswind
// wanders, gusting one way and then the other, and a good pilot watches
// the forecast instead of fighting every shove. This module owns that
// wandering: a steady base wind, a gust that is re-rolled every few
// seconds, a short forecast for the HUD, and the strongest gust of the
// sortie for the debrief. Everything is seeded, so the same seed flies
// the same sky. Staged screenshot frames never step the weather — the
// loop is frozen there — so the photographed views stay exactly as shot.

import { mulberry32 } from './random.js';

// A fresh sky for one sortie. `baseWind` is the mission's steady
// crosswind in m/s; 0 means still air and the weather stays out of the
// way entirely. The seed drives the gust dice so replays match.
export function createWeather(baseWind, seed) {
  return {
    base: baseWind,
    gust: 0, // current extra push, m/s; + shoves the plane east
    gustT: 0, // seconds until the gust is re-rolled
    nextGust: 0, // the gust waiting after this one
    nextIn: 0, // seconds until that next gust arrives
    peak: 0, // strongest total crosswind felt this sortie, m/s
    roll: mulberry32(((seed * 7919 + Math.round(baseWind * 131)) >>> 0)),
  };
}

// Step the sky forward one frame. Returns the total crosswind to push
// the plane with this frame. In still air this is always 0 and the
// flight model never notices the weather exists.
export function updateWeather(w, dt) {
  if (w.base <= 0) return 0;
  w.gustT -= dt;
  if (w.gustT <= 0) {
    // The forecast gust arrives; roll the one after it and start its clock.
    w.gust = w.nextGust;
    w.nextGust = (w.roll() - 0.5) * 2 * w.base;
    w.gustT = 2 + w.roll() * 3;
    w.nextIn = w.gustT;
  } else {
    w.nextIn = Math.max(0, w.nextIn - dt);
  }
  const total = w.base + w.gust;
  if (Math.abs(total) > w.peak) w.peak = Math.abs(total);
  return total;
}

// True when this sky ever gusts — the HUD only shows a forecast then,
// and the debrief only remembers a peak gust then.
export function weatherActive(w) {
  return w.base > 0;
}

// A one-word read on the sky, for the forecast panel's headline.
export function windWord(w) {
  const total = Math.abs(w.base + w.gust);
  if (total < 2) return 'CALM';
  if (total < 6) return 'BREEZY';
  if (total < 11) return 'GUSTY';
  return 'HOWLING';
}

// What the HUD shows: the gust blowing now and the one coming next, in
// plain words, so the pilot can lean into the next shove early.
// `strong` flags a gust worth bracing for; `push` is the signed
// crosswind in m/s, for the little direction arrow.
export function gustForecast(w) {
  const now = Math.round(w.base + w.gust);
  const next = Math.round(w.base + w.nextGust);
  const dir = (v) => (v > 0.5 ? 'E' : v < -0.5 ? 'W' : '—');
  return {
    now: `WIND ${Math.abs(now)} m/s ${dir(now)}`,
    next: `NEXT ${Math.abs(next)} m/s ${dir(next)} IN ${Math.max(1, Math.ceil(w.nextIn))}s`,
    push: now,
    strong: Math.abs(w.gust) > w.base * 0.6,
  };
}

// A debrief line for the windiest moment of a gusty sortie, or '' in
// still air — the calm sorties have no gust worth remembering.
export function peakGustLine(w) {
  if (w.base <= 0 || w.peak < 1) return '';
  return `PEAK GUST ${Math.round(w.peak)} m/s`;
}
