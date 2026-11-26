// Sky Courier — Island Run: the island itself.
// One seeded island per mission: rolling hills, patchwork fields, a
// winding river, a road, an airstrip, and the gold rings the pilot
// threads. The flight model and the renderer both read from here, so the
// world the pilot flies and the world the screenshots show are the same.

import { MISSIONS, PLANE } from './config.js';
import { clamp, hash2, mulberry32, noise1 } from './random.js';

export const RUNWAY = {
  x: 0, // centre line of the strip, metres east of the route start
  zStart: 5200, // near threshold (where a landing begins)
  zEnd: 5800, // far threshold
  width: 42,
  heading: 0, // the strip runs due north, same as the route
};

export const FIELD_SIZE = 220; // metres per patchwork cell

function makeRings(mission, rng) {
  const rings = [];
  const count = mission.rings;
  const span = RUNWAY.zStart - 900; // rings sit between takeoff and the strip
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / (count + 1);
    const z = 500 + t * span;
    const x = (rng() - 0.5) * 560;
    const y = 130 + rng() * 260;
    rings.push({ x, y, z, r: PLANE.ringRadius, hit: false, index: i });
  }
  return rings;
}

function makeClouds(mission, rng) {
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      x: (rng() - 0.5) * 5200,
      z: 300 + rng() * 6400,
      y: 480 + rng() * 320,
      s: 60 + rng() * 130,
      puffs: 3 + Math.floor(rng() * 3),
    });
  }
  return clouds;
}

export function buildWorld(missionId, seed) {
  const mission = MISSIONS[missionId] ?? MISSIONS['ring-run'];
  const rng = mulberry32(seed * 7919 + 13);
  const world = {
    mission,
    seed,
    rings: makeRings(mission, rng),
    clouds: makeClouds(mission, rng),
    runway: RUNWAY,
  };

  // Terrain height in metres. Gentle near the route corridor (|x| < 200)
  // so the strip and the rings stay flyable; hills rise to either side,
  // and a ridge closes the far north so the horizon reads as land.
  world.heightAt = function heightAt(x, z) {
    const hill = 26 * noise1(x * 0.0016 + z * 0.0009, seed)
      + 14 * noise1(x * 0.004 - z * 0.0013, seed + 5)
      + 8 * noise1(z * 0.006 + x * 0.002, seed + 11);
    const corridor = clamp((Math.abs(x) - 200) / 420, 0, 1);
    const ridge = clamp((z - 6400) / 900, 0, 1) * 90;
    const south = clamp((600 - z) / 700, 0, 1) * 30;
    return hill * corridor + ridge + south;
  };

  // The river winds down the west side of the island, crossing the route
  // low so the pilot sees it glittering below on the way out.
  world.riverX = function riverX(z) {
    return -330 + 170 * Math.sin(z * 0.00045 + 1.2) + 60 * Math.sin(z * 0.0016 + 4.0);
  };
  world.riverHalfWidth = 16;

  // Patchwork field colour for a ground cell, from the cell hash.
  world.fieldColor = function fieldColor(cx, cz) {
    const h = hash2(cx, cz, seed);
    const p = mission.palette;
    if (h < 0.3) return p.fieldA;
    if (h < 0.55) return p.fieldB;
    if (h < 0.8) return p.fieldC;
    return p.fieldD;
  };

  // A few tree clumps per cell, placed by hash so they never move.
  world.treesIn = function treesIn(cx, cz) {
    const trees = [];
    const n = Math.floor(hash2(cx, cz, seed + 31) * 4);
    for (let i = 0; i < n; i++) {
      const hx = hash2(cx * 3 + i, cz, seed + 57);
      const hz = hash2(cx, cz * 3 + i, seed + 83);
      trees.push({
        x: cx * FIELD_SIZE + hx * FIELD_SIZE,
        z: cz * FIELD_SIZE + hz * FIELD_SIZE,
        s: 6 + hash2(cx + i, cz + i, seed + 97) * 7,
      });
    }
    return trees;
  };

  return world;
}
