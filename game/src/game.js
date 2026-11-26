// Sky Courier — Island Run: the game itself.
// Wires the flight model, the island, the renderer, the HUD, the sound
// and the input into one loop, with a small state machine: title, flying,
// paused, and the debrief. Rings are threaded by passing through them;
// a sortie ends on a landing, a crash, or the last ring, and R flies it
// again. `?shot=start|play|end&seed=1` stages a deterministic view for
// screenshots: the title, a mid-flight ring, and the debrief.

import { MISSION_ORDER, MISSIONS, PLANE, SHOTS, VIEW } from './config.js';
import { freshPlane, landingCall, stepPlane } from './aircraft.js';
import { createAudio } from './audio.js';
import { drawEnd, drawHud, drawPaused, drawTitle } from './hud.js';
import { createInput } from './input.js';
import { clamp } from './random.js';
import { drawScene, makeCamera } from './render.js';
import { buildWorld } from './world.js';
import { createWeather, peakGustLine, updateWeather, weatherActive } from './weather.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || 1;
const shot = params.get('shot');

const input = createInput(canvas);
const audio = createAudio();

const game = {
  mode: 'title', // title | flying | paused | end
  missionId: 'ring-run',
  selected: 'ring-run',
  world: buildWorld('ring-run', seed),
  plane: freshPlane(),
  score: 0,
  ringsHit: 0,
  elapsed: 0,
  message: '',
  messageT: 0,
  endKind: 'done',
  endLines: [],
  weather: createWeather(0, seed),
  staged: Boolean(shot),
  bestScore: 0,
  bestMission: '',
};

function startSortie(missionId) {
  game.missionId = missionId;
  game.selected = missionId;
  game.world = buildWorld(missionId, seed);
  game.plane = freshPlane();
  game.plane.fuel = game.world.mission.fuel;
  game.score = 0;
  game.ringsHit = 0;
  game.elapsed = 0;
  game.message = game.world.mission.tag;
  game.messageT = 3;
  game.weather = createWeather(game.world.mission.wind, seed);
  game.mode = 'flying';
  audio.unlock();
  audio.click();
}

function nextRing() {
  return game.world.rings.find((r) => !r.hit) ?? null;
}

// A ring counts when the plane crosses its plane within the radius.
function checkRings() {
  const p = game.plane;
  for (const ring of game.world.rings) {
    if (ring.hit) continue;
    const dz = p.z - ring.z;
    if (Math.abs(dz) > p.speed * 0.05 + 4) continue;
    const dx = p.x - ring.x;
    const dy = p.y - ring.y;
    if (dx * dx + dy * dy < ring.r * ring.r) {
      ring.hit = true;
      game.ringsHit += 1;
      game.score += PLANE.ringScore;
      game.message = `RING ${ring.index + 1} — +${PLANE.ringScore}`;
      game.messageT = 2;
      audio.ring();
    }
  }
}

// Landing quality as stars, for the debrief: a greased touchdown earns
// three, a firm one earns a single star. Judged on the same sink rate
// and speed the landing call already measures.
function landingStars(p) {
  const sink = -p.vspeed;
  if (sink < 1.2 && p.speed < 38) return '★★★';
  if (sink < 2.6) return '★★';
  return '★';
}

// The best score of this session, kept in memory only — a quiet record
// to chase, not a leaderboard. It resets when the page reloads, which
// is the honest scope for a record nobody else can see.
function noteBest() {
  if (game.score > game.bestScore) {
    game.bestScore = game.score;
    game.bestMission = game.world.mission.name;
  }
}

// The debrief line for the session record, or '' when nothing worth
// remembering has been flown yet.
function bestLine() {
  if (game.bestScore <= 0) return '';
  return `BEST ${game.bestScore} — ${game.bestMission}`;
}

function finishSortie(kind) {
  const p = game.plane;
  game.endKind = kind;
  if (kind === 'landed') {
    const call = landingCall(p);
    game.score += PLANE.landingScore + call.bonus;
    noteBest();
    // Interactive flights only: the staged debrief shot must keep the
    // exact lines it was photographed with, so these extras stay out
    // of any ?shot= frame.
    const extras = [];
    if (!shot) {
      extras.push(`TOUCHDOWN ${landingStars(p)}`);
      const peak = peakGustLine(game.weather);
      if (peak) extras.push(peak);
      const best = bestLine();
      if (best) extras.push(best);
    }
    game.endLines = [
      `${call.word} — landing +${PLANE.landingScore}, style +${call.bonus}`,
      `Rings ${game.ringsHit}/${game.world.rings.length} · Time ${fmtTime(game.elapsed)}`,
      ...extras,
      `SCORE ${game.score}`,
      'ENTER fly again · 1/2/3 pick a sortie',
    ];
    audio.thud();
  } else if (kind === 'crash') {
    game.endLines = [
      `The island keeps the wreck. Rings ${game.ringsHit}/${game.world.rings.length}.`,
      `Time ${fmtTime(game.elapsed)} · SCORE ${game.score}`,
      'ENTER fly again · 1/2/3 pick a sortie',
    ];
    audio.crash();
  } else {
    noteBest();
    const best = !shot ? bestLine() : '';
    game.endLines = [
      `All ${game.world.rings.length} rings threaded in ${fmtTime(game.elapsed)}.`,
      ...(best ? [best] : []),
      `SCORE ${game.score}`,
      'ENTER fly again · 1/2/3 pick a sortie',
    ];
    audio.ring();
  }
  game.mode = 'end';
}

function fmtTime(t) {
  const mm = Math.floor(t / 60);
  const ss = Math.floor(t % 60);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function update(dt) {
  const p = game.plane;
  if (game.mode !== 'flying') return;
  game.elapsed += dt;
  if (game.messageT > 0) game.messageT -= dt;

  // The weather owns the crosswind now: a steady base plus a wandering
  // gust, re-rolled every few seconds on storm sorties. In still air
  // this returns 0 and the flight model never notices it.
  const wind = updateWeather(game.weather, dt);
  const ctl = input.stick();
  stepPlane(p, ctl, dt, wind, game.world.heightAt(p.x, p.z), game.world.runway);
  audio.setEngine(p.throttle, p.speed);
  checkRings();

  if (p.crashed) finishSortie('crash');
  else if (p.landed) finishSortie('landed');
  else if (!nextRing() && !game.world.mission.needLanding) finishSortie('done');
  else if (!nextRing() && game.world.mission.needLanding) {
    game.message = 'ALL RINGS — LAND ON THE STRIP';
    game.messageT = Math.max(game.messageT, 0.5);
  }
  if (p.fuel <= 0 && !p.crashed && !p.landed) {
    game.message = 'OUT OF FUEL — GLIDE HER DOWN';
    game.messageT = Math.max(game.messageT, 0.5);
  }
}

function handleKeys() {
  if (input.pressed('KeyM')) audio.toggleMute();
  if (game.mode === 'title') {
    if (input.pressed('Digit1')) { game.selected = 'ring-run'; audio.click(); }
    if (input.pressed('Digit2')) { game.selected = 'dusk'; audio.click(); }
    if (input.pressed('Digit3')) { game.selected = 'storm'; audio.click(); }
    if (input.pressed('Enter') || input.pressed('Space')) startSortie(game.selected);
    return;
  }
  if (game.mode === 'flying') {
    if (input.pressed('KeyP') || input.pressed('Escape')) { game.mode = 'paused'; audio.click(); }
    if (input.pressed('KeyG')) {
      game.plane.gearDown = !game.plane.gearDown;
      game.message = game.plane.gearDown ? 'GEAR DOWN' : 'GEAR UP';
      game.messageT = 1.5;
      audio.click();
    }
    if (input.pressed('KeyR')) startSortie(game.missionId);
    return;
  }
  if (game.mode === 'paused') {
    if (input.pressed('KeyP') || input.pressed('Escape')) { game.mode = 'flying'; audio.click(); }
    if (input.pressed('KeyR')) startSortie(game.missionId);
    return;
  }
  if (game.mode === 'end') {
    if (input.pressed('Enter') || input.pressed('Space') || input.pressed('KeyR')) {
      startSortie(game.missionId);
    }
    if (input.pressed('Digit1')) startSortie('ring-run');
    if (input.pressed('Digit2')) startSortie('dusk');
    if (input.pressed('Digit3')) startSortie('storm');
  }
}

function draw() {
  const p = game.plane;
  const cam = makeCamera(p);
  const next = nextRing();
  drawScene(ctx, game.world, p, cam, next ? next.index : -1);
  if (game.mode === 'title') {
    drawTitle(ctx, game.world, game.selected);
  } else if (game.mode === 'paused') {
    drawHud(ctx, game);
    drawPaused(ctx);
  } else if (game.mode === 'end') {
    drawHud(ctx, game);
    drawEnd(ctx, game.endKind, game.endLines);
  } else {
    drawHud(ctx, game);
  }
}

// Deterministic staged views for screenshots. The play shot parks the
// plane just short of ring 4, wings level, so the ring fills the frame;
// the end shot lands the plane and opens the debrief.
function stageShot(name) {
  const cfg = SHOTS[name];
  if (!cfg) return;
  const mission = MISSIONS[cfg.mission];
  if (name === 'start') {
    game.mode = 'title';
    game.selected = cfg.mission;
    game.world = buildWorld(cfg.mission, seed);
    game.plane = freshPlane();
    return;
  }
  startSortie(cfg.mission);
  for (let i = 0; i < cfg.ringsHit; i++) {
    const ring = game.world.rings[i];
    ring.hit = true;
    game.ringsHit += 1;
    game.score += PLANE.ringScore;
  }
  const p = game.plane;
  if (name === 'play') {
    const ring = game.world.rings[cfg.ringsHit];
    p.x = ring.x;
    p.y = ring.y;
    p.z = ring.z - 420;
    p.heading = 0;
    p.bank = 0;
    p.pitch = 0;
    p.speed = 58;
    p.throttle = 0.7;
    p.fuel = 82;
    game.elapsed = 47;
    game.message = `RING ${cfg.ringsHit} — +${PLANE.ringScore}`;
    game.messageT = 2;
  } else if (name === 'end') {
    p.x = 0;
    p.y = 2;
    p.z = 5500;
    p.speed = 0;
    p.throttle = 0;
    p.fuel = 34;
    p.landed = true;
    p.onGround = true;
    game.elapsed = 214;
    finishSortie('landed'); // adds the landing + style bonus and the lines
    game.message = '';
    game.messageT = 0; // no mission tag over the debrief
  }
}

let last = performance.now();
const frozenShot = Boolean(shot && SHOTS[shot]); // staged shots hold still
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  handleKeys();
  if (!frozenShot) update(dt);
  draw();
  requestAnimationFrame(frame);
}

if (shot && SHOTS[shot]) {
  stageShot(shot);
  // One staged frame, then keep the loop running so the shot stays live.
  draw();
}
requestAnimationFrame(frame);
