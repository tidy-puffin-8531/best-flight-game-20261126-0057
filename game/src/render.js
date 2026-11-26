// Sky Courier — Island Run: every pixel the judge sees.
// A chase view over a patchwork island: sky and sun, mountain ridges on
// the horizon, perspective ground bands that follow the terrain height,
// fields, river and road, the strip and the gold rings ahead, the little
// plane banking in the middle of it all. All 2-D canvas, all drawn here.

import { VIEW } from './config.js';
import { clamp, degToRad, lerp, noise1, wrapAngle } from './random.js';

const FOCAL = 760; // perspective focal length, in screen pixels
const CX = VIEW.width / 2;

export function makeCamera(plane, extra = {}) {
  return {
    x: plane.x,
    y: plane.y + 6,
    z: plane.z - 26, // the camera trails 26 m behind the plane
    heading: plane.heading,
    pitch: plane.pitch * 0.55,
    ...extra,
  };
}

// Project a world point into screen space. Returns null behind the camera.
export function project(x, y, z, cam) {
  const dx = x - cam.x;
  const dy = y - cam.y;
  const dz = z - cam.z;
  const hr = degToRad(cam.heading);
  const forward = dz * Math.cos(hr) + dx * Math.sin(hr);
  if (forward < 4) return null;
  const right = dx * Math.cos(hr) - dz * Math.sin(hr);
  const horizonY = VIEW.horizon + cam.pitch * 3.2;
  return {
    x: CX + (right * FOCAL) / forward,
    y: horizonY - (dy * FOCAL) / forward,
    d: forward,
    scale: FOCAL / forward,
  };
}

function sky(ctx, palette, sunX, sunY) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.horizon + 60);
  g.addColorStop(0, palette.skyTop);
  g.addColorStop(0.55, palette.skyMid);
  g.addColorStop(1, palette.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.horizon + 80);
  // Sun with a soft halo.
  const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 120);
  halo.addColorStop(0, palette.sunCore);
  halo.addColorStop(0.25, palette.sun);
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
}

function mountains(ctx, palette, cam) {
  // Two ridges: the far one drifts slowly with heading, the near one more.
  for (const [color, amp, base, shift] of [
    [palette.mountainFar, 74, 0, 2.2],
    [palette.mountainNear, 46, 26, 5.0],
  ]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, VIEW.horizon + 2);
    for (let sx = 0; sx <= VIEW.width; sx += 16) {
      const n = noise1(sx * 0.004 + cam.heading * shift * 0.02, 99) * 0.6
        + noise1(sx * 0.013 + cam.heading * shift * 0.05, 41) * 0.4;
      ctx.lineTo(sx, VIEW.horizon + 2 - base - n * amp);
    }
    ctx.lineTo(VIEW.width, VIEW.horizon + 2);
    ctx.closePath();
    ctx.fill();
  }
}

function groundBands(ctx, world, cam) {
  const p = world.mission.palette;
  const horizonY = VIEW.horizon + cam.pitch * 3.2;
  // Depth bands, near ones thin and far ones deep: a log ladder.
  const depths = [];
  let d = 34;
  while (d < 4200) {
    depths.push(d);
    d *= 1.24;
  }
  depths.push(4200);
  for (let i = depths.length - 1; i >= 1; i--) {
    const dFar = depths[i];
    const dNear = depths[i - 1];
    const zMid = cam.z + (dFar + dNear) / 2;
    const cz = Math.floor(zMid / 220);
    // Columns across the view: each field cell is one quad, lifted to the
    // terrain height at the cell centre so the ground rolls with the hills.
    for (let cx = -9; cx <= 9; cx++) {
      const x0 = cx * 220;
      const x1 = x0 + 220;
      const gy = world.heightAt(x0 + 110, zMid);
      const a = project(x0, gy, cam.z + dNear, cam);
      const b = project(x1, gy, cam.z + dNear, cam);
      const c = project(x1, gy, cam.z + dFar, cam);
      const e = project(x0, gy, cam.z + dFar, cam);
      if (!a || !b || !c || !e) continue;
      const rx = world.riverX(zMid);
      let fill = world.fieldColor(cx, cz);
      if (Math.abs(rx - (x0 + 110)) < 70) fill = p.river;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, Math.min(c.y, VIEW.height));
      ctx.lineTo(e.x, Math.min(e.y, VIEW.height));
      ctx.closePath();
      ctx.fill();
    }
  }
  // The road: a pale ribbon running north on the east side.
  ctx.strokeStyle = p.road;
  ctx.lineWidth = 3;
  ctx.beginPath();
  let started = false;
  for (let z = cam.z + 40; z < cam.z + 2600; z += 90) {
    const pt = project(430, world.heightAt(430, z) + 1, z, cam);
    if (!pt) continue;
    if (!started) {
      ctx.moveTo(pt.x, pt.y);
      started = true;
    } else ctx.lineTo(pt.x, pt.y);
  }
  ctx.stroke();
  // Far ground wash below the horizon so no sky peeks through at the edges.
  ctx.fillStyle = p.groundFar;
  ctx.fillRect(0, horizonY, VIEW.width, 2);
}

function runway(ctx, world, cam) {
  const r = world.runway;
  const p = world.mission.palette;
  const c1 = project(-r.width / 2, 2, r.zStart, cam);
  const c2 = project(r.width / 2, 2, r.zStart, cam);
  const c3 = project(r.width / 2, 2, r.zEnd, cam);
  const c4 = project(-r.width / 2, 2, r.zEnd, cam);
  if (!c1 || !c2 || !c3 || !c4) return;
  ctx.fillStyle = p.runway;
  ctx.beginPath();
  ctx.moveTo(c1.x, c1.y);
  ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(c3.x, c3.y);
  ctx.lineTo(c4.x, c4.y);
  ctx.closePath();
  ctx.fill();
  // Centreline dashes and the threshold bars.
  ctx.strokeStyle = p.runwayMark;
  ctx.lineWidth = 2;
  for (let z = r.zStart + 60; z < r.zEnd - 40; z += 120) {
    const a = project(0, 2.5, z, cam);
    const b = project(0, 2.5, z + 55, cam);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Threshold bars at the near end.
  ctx.lineWidth = 4;
  for (const off of [-14, -7, 0, 7, 14]) {
    const a = project(off - 2.5, 2.5, r.zStart + 18, cam);
    const b = project(off + 2.5, 2.5, r.zStart + 18, cam);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function rings(ctx, world, cam, nextIndex) {
  for (const ring of world.rings) {
    const pt = project(ring.x, ring.y, ring.z, cam);
    if (!pt || pt.d > 5200) continue;
    const rad = ring.r * pt.scale;
    if (rad < 2) continue;
    const isNext = ring.index === nextIndex;
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.lineWidth = isNext ? 7 : 4;
    ctx.strokeStyle = ring.hit ? 'rgba(120,220,120,0.85)' : isNext ? '#ffd94a' : 'rgba(255,217,74,0.55)';
    ctx.shadowColor = isNext ? '#ffcf3d' : 'transparent';
    ctx.shadowBlur = isNext ? 18 : 0;
    ctx.beginPath();
    ctx.ellipse(0, 0, rad, rad * 0.94, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rad * 0.82, rad * 0.77, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (isNext) {
      ctx.fillStyle = '#fff6c8';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${ring.index + 1}`, 0, -rad - 12);
    }
    ctx.restore();
  }
}

function clouds(ctx, world, cam) {
  const p = world.mission.palette;
  ctx.fillStyle = p.cloud;
  for (const c of world.clouds) {
    const pt = project(c.x, c.y, c.z, cam);
    if (!pt || pt.d > 6000) continue;
    const s = c.s * pt.scale;
    if (s < 4) continue;
    ctx.beginPath();
    for (let i = 0; i < c.puffs; i++) {
      const ox = (i - c.puffs / 2) * s * 0.55;
      const oy = Math.sin(i * 2.3) * s * 0.12;
      ctx.ellipse(pt.x + ox, pt.y + oy, s * 0.62, s * 0.3, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

function trees(ctx, world, cam) {
  // A few dark tree triangles near the route, for scale on the ground.
  ctx.fillStyle = '#2f5230';
  for (let cz = Math.floor((cam.z + 60) / 220); cz < Math.floor((cam.z + 1400) / 220); cz++) {
    for (let cx = -3; cx <= 3; cx++) {
      for (const t of world.treesIn(cx, cz)) {
        const gy = world.heightAt(t.x, t.z);
        const pt = project(t.x, gy, t.z, cam);
        if (!pt) continue;
        const s = t.s * pt.scale;
        if (s < 1.5 || s > 90) continue;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y - s * 2.4);
        ctx.lineTo(pt.x - s, pt.y);
        ctx.lineTo(pt.x + s, pt.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

function planeShadow(ctx, world, plane, cam) {
  const g = world.heightAt(plane.x, plane.z);
  const pt = project(plane.x, g + 1, plane.z, cam);
  if (!pt) return;
  const s = clamp(120 * pt.scale, 4, 130);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(pt.x, pt.y, s, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlane(ctx, plane) {
  // The little courier, seen from behind and slightly above, banking with
  // the turn. Drawn at the centre of the chase view.
  const x = CX;
  const y = 452 + plane.pitch * 1.6;
  const bank = degToRad(plane.bank);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bank);
  // Wings: long trapezoids with a slight dihedral, cream with red tips.
  ctx.fillStyle = '#f4ede0';
  ctx.beginPath();
  ctx.moveTo(-14, 6);
  ctx.lineTo(-168, 26);
  ctx.lineTo(-168, 40);
  ctx.lineTo(-12, 26);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 6);
  ctx.lineTo(168, 26);
  ctx.lineTo(168, 40);
  ctx.lineTo(12, 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c8442c';
  ctx.fillRect(-168, 26, 26, 14);
  ctx.fillRect(142, 26, 26, 14);
  // Wingtip navigation lights.
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(-170, 33, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#34d17b';
  ctx.beginPath();
  ctx.arc(170, 33, 5, 0, Math.PI * 2);
  ctx.fill();
  // Tailplane and fin.
  ctx.fillStyle = '#e8dcc4';
  ctx.beginPath();
  ctx.moveTo(-58, -18);
  ctx.lineTo(-96, -34);
  ctx.lineTo(-96, -24);
  ctx.lineTo(-52, -6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(58, -18);
  ctx.lineTo(96, -34);
  ctx.lineTo(96, -24);
  ctx.lineTo(52, -6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c8442c';
  ctx.beginPath();
  ctx.moveTo(-16, -58);
  ctx.lineTo(16, -58);
  ctx.lineTo(12, -8);
  ctx.lineTo(-12, -8);
  ctx.closePath();
  ctx.fill();
  // Fuselage: a rounded body, tail at the top of the frame, nose below.
  const body = ctx.createLinearGradient(-26, 0, 26, 0);
  body.addColorStop(0, '#d8c9a8');
  body.addColorStop(0.5, '#f7efdc');
  body.addColorStop(1, '#cbb98f');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-24, -52);
  ctx.quadraticCurveTo(-30, 10, -16, 66);
  ctx.quadraticCurveTo(0, 82, 16, 66);
  ctx.quadraticCurveTo(30, 10, 24, -52);
  ctx.quadraticCurveTo(0, -64, -24, -52);
  ctx.closePath();
  ctx.fill();
  // Cockpit hump and the pilot's window glint.
  ctx.fillStyle = '#2c4a6b';
  ctx.beginPath();
  ctx.ellipse(0, 18, 13, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,225,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-4, 10, 5, 9, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Registration stripe and the courier's little sun badge.
  ctx.fillStyle = '#c8442c';
  ctx.fillRect(-24, -6, 48, 5);
  ctx.fillStyle = '#f2a541';
  ctx.beginPath();
  ctx.arc(0, -34, 7, 0, Math.PI * 2);
  ctx.fill();
  // Landing light when the gear is down.
  if (plane.gearDown) {
    ctx.fillStyle = '#fff8d0';
    ctx.beginPath();
    ctx.arc(0, 74, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// One frame of the world, in draw order: sky, ridges, ground, strip,
// trees, rings, clouds, the plane's shadow, then the plane itself.
export function drawScene(ctx, world, plane, cam, nextRingIndex) {
  const p = world.mission.palette;
  sky(ctx, p, 985, 108);
  mountains(ctx, p, cam);
  groundBands(ctx, world, cam);
  runway(ctx, world, cam);
  trees(ctx, world, cam);
  rings(ctx, world, cam, nextRingIndex);
  clouds(ctx, world, cam);
  planeShadow(ctx, world, plane, cam);
  drawPlane(ctx, plane);
}
