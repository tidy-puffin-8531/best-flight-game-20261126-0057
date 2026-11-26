// Sky Courier — Island Run: small deterministic random helpers.
// The island is generated from one seed, so a screenshot seed always draws
// the same hills, fields, river and rings. Nothing here calls Math.random.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A stable 0..1 hash of two integer cell coordinates: field colours,
// tree clumps and cloud puffs all hang off this, never off Math.random.
export function hash2(x, z, seed) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 974634211)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Smooth 1-D value noise from a seeded hash: rolling hills without a table.
export function noise1(t, seed) {
  const i = Math.floor(t);
  const f = t - i;
  const a = hash2(i, seed, 7);
  const b = hash2(i + 1, seed, 7);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

// Two-octave value noise: a coarse swell plus a finer ripple.
export function fbm1(t, seed) {
  return noise1(t, seed) * 0.65 + noise1(t * 2.7 + 11.3, seed + 3) * 0.35;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function degToRad(d) {
  return (d * Math.PI) / 180;
}

// Wrap an angle to (-180, 180].
export function wrapAngle(d) {
  let a = d % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return a;
}

// Nearest multiple of `step` at or below the wrapped heading, for compass ticks.
export function floorStep(angle, step) {
  return Math.floor(wrapAngle(angle) / step) * step;
}
