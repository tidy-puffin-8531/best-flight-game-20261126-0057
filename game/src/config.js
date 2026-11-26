// Sky Courier — Island Run: tuning and mission palettes.
// One small prop plane, three sorties over one island chain. All art is
// drawn by the game's own canvas code; no image, sound or font file loads.

export const VIEW = { width: 1280, height: 800, horizon: 348 };

export const PLANE = {
  minSpeed: 26, // m/s: below this the wing stops flying and the nose drops
  maxSpeed: 88,
  cruiseSpeed: 58,
  maxBankDeg: 48, // how far the wings roll in a hard turn
  maxPitchDeg: 16, // nose up
  minPitchDeg: -14, // nose down
  turnRate: 0.55, // heading deg per second per degree of bank, scaled by speed
  climbFactor: 0.9,
  fuelBurn: 0.55, // fuel units per second at full throttle
  fuelIdle: 0.12, // fuel units per second at idle
  ringRadius: 26, // metres: a ring counts when the plane passes inside it
  ringScore: 100,
  landingScore: 500,
  startAltitude: 320, // metres above the island at takeoff
  startSpeed: 52, // m/s on the runway roll
};

export const MISSIONS = {
  'ring-run': {
    id: 'ring-run',
    name: 'Ring Run',
    tag: 'Day sortie — thread 8 gold rings over the islands',
    rings: 8,
    needLanding: false,
    fuel: 100,
    wind: 0,
    palette: {
      skyTop: '#2f6fd0', skyMid: '#7fb2e8', skyLow: '#cfe6f7',
      sun: '#fff3c4', sunCore: '#ffffff',
      mountainFar: '#7d9cc4', mountainNear: '#5a7ba6',
      groundFar: '#8fae6d', groundNear: '#6f9a52',
      fieldA: '#7fae5f', fieldB: '#a8b45e', fieldC: '#5d8f57', fieldD: '#c2b26a',
      river: '#4d8fd1', road: '#8a7a5c',
      runway: '#3c3f45', runwayMark: '#f2f2e8',
      cloud: 'rgba(255,255,255,0.92)',
      hud: '#0e1a2c',
    },
  },
  dusk: {
    id: 'dusk',
    name: 'Dusk Delivery',
    tag: 'Dusk sortie — 6 rings, then put her down on the island strip',
    rings: 6,
    needLanding: true,
    fuel: 100,
    wind: 0,
    palette: {
      skyTop: '#2c2a55', skyMid: '#b45a6e', skyLow: '#f2a35e',
      sun: '#ffcf7d', sunCore: '#fff0c0',
      mountainFar: '#6d5578', mountainNear: '#4c3d63',
      groundFar: '#6d7a52', groundNear: '#55663f',
      fieldA: '#66794a', fieldB: '#8a7a4e', fieldC: '#4d6b45', fieldD: '#9a8a58',
      river: '#7a6fb0', road: '#6e5f4c',
      runway: '#33333c', runwayMark: '#f2e8c8',
      cloud: 'rgba(255,214,178,0.85)',
      hud: '#160f24',
    },
  },
  storm: {
    id: 'storm',
    name: 'Storm Run',
    tag: 'Grey-weather sortie — 8 rings, gusting crosswind, bring her home',
    rings: 8,
    needLanding: true,
    fuel: 120,
    wind: 9,
    palette: {
      skyTop: '#3a4550', skyMid: '#6d7c88', skyLow: '#a9b4b6',
      sun: '#e8e4d2', sunCore: '#f4f1e2',
      mountainFar: '#5d6a72', mountainNear: '#46545c',
      groundFar: '#71806a', groundNear: '#5b6e54',
      fieldA: '#647d5c', fieldB: '#7d8a58', fieldC: '#4f6b52', fieldD: '#8d8a5f',
      river: '#5d7d92', road: '#6e6a5c',
      runway: '#34383d', runwayMark: '#e8e8da',
      cloud: 'rgba(228,232,232,0.9)',
      hud: '#10161c',
    },
  },
};

export const MISSION_ORDER = ['ring-run', 'dusk', 'storm'];

// Deterministic staged views for screenshots: ?shot=start|play|end&seed=1
export const SHOTS = {
  start: { mission: 'ring-run', ringsHit: 0 },
  play: { mission: 'ring-run', ringsHit: 3 }, // mid-flight, ring 4 ahead
  end: { mission: 'dusk', ringsHit: 6 }, // debrief after a landing
};
