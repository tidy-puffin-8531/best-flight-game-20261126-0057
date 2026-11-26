// Sky Courier — Island Run: the HUD and the screens around the flight.
// Lit instruments: altitude, speed and heading across the top, throttle
// and fuel on the right, an artificial horizon low on the left, a timer
// and the mission line in the middle — plus the title, pause and debrief
// panels. The compass tape is drawn from stepped ticks, so its labels
// land on whole headings whatever the heading is.

import { VIEW } from './config.js';
import { clamp, floorStep, wrapAngle } from './random.js';
import { gustForecast, weatherActive, windWord } from './weather.js';

function panel(ctx, x, y, w, h, alpha = 0.72) {
  ctx.fillStyle = `rgba(10,18,30,${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function bigNum(ctx, label, value, unit, x, y) {
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText(value, x, y + 32);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(unit, x + 4, y + 48);
}

function compassLabel(a) {
  const n = ((a % 360) + 360) % 360;
  if (n === 0) return 'N';
  if (n === 90) return 'E';
  if (n === 180) return 'S';
  if (n === 270) return 'W';
  return String(n / 10);
}

export function drawHud(ctx, state) {
  const { plane, world, score, ringsHit, message, messageT, elapsed } = state;
  const altFt = Math.max(0, Math.round(plane.y * 3.281));
  const spdKt = Math.round(plane.speed * 1.944);
  const vsFpm = Math.round(plane.vspeed * 196.85);
  const mm = Math.floor(elapsed / 60);
  const ss = Math.floor(elapsed % 60);

  // Top-left: altitude, speed, vertical speed.
  panel(ctx, 18, 16, 250, 84);
  bigNum(ctx, 'ALTITUDE', String(altFt).padStart(4, '0'), 'FT', 32, 34);
  bigNum(ctx, 'SPEED', String(spdKt), 'KT', 138, 34);
  ctx.fillStyle = plane.vspeed >= 0 ? '#8fe388' : '#ffb04a';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${plane.vspeed >= 0 ? '▲' : '▼'} ${Math.abs(vsFpm)} FPM`, 32, 90);

  // Top-centre: compass tape, ticks stepped from the wrapped heading.
  panel(ctx, VIEW.width / 2 - 190, 16, 380, 56);
  const hdg = wrapAngle(plane.heading);
  ctx.save();
  ctx.beginPath();
  ctx.rect(VIEW.width / 2 - 190, 16, 380, 56);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const start = floorStep(hdg - 60, 5);
  for (let a = start; a <= hdg + 60; a += 5) {
    const x = VIEW.width / 2 + (wrapAngle(a - hdg)) * 3;
    const major = ((a % 30) + 360) % 360 === 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(x, 44);
    ctx.lineTo(x, major ? 56 : 50);
    ctx.stroke();
    if (major) ctx.fillText(compassLabel(a), x, 36);
  }
  ctx.restore();
  ctx.fillStyle = '#ffd94a';
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`HDG ${String(((Math.round(hdg) + 360) % 360)).padStart(3, '0')}°`, VIEW.width / 2, 68);
  // Timer under the compass.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, VIEW.width / 2, 92);

  // Top-right: throttle, fuel, score, rings.
  panel(ctx, VIEW.width - 268, 16, 250, 84);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THROTTLE', VIEW.width - 254, 34);
  ctx.fillStyle = '#22384f';
  ctx.fillRect(VIEW.width - 254, 40, 110, 10);
  ctx.fillStyle = '#4db2ff';
  ctx.fillRect(VIEW.width - 254, 40, 110 * plane.throttle, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('FUEL', VIEW.width - 254, 66);
  ctx.fillStyle = '#22384f';
  ctx.fillRect(VIEW.width - 254, 72, 110, 10);
  ctx.fillStyle = plane.fuel < 20 ? '#ff5a4a' : '#7ddb5a';
  ctx.fillRect(VIEW.width - 254, 72, 110 * clamp(plane.fuel / 100, 0, 1), 10);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(String(score), VIEW.width - 32, 52);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('SCORE', VIEW.width - 32, 68);
  // Ring pips.
  const total = world.rings.length;
  for (let i = 0; i < total; i++) {
    ctx.fillStyle = i < ringsHit ? '#ffd94a' : 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(VIEW.width - 254 + i * 16, 94, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bottom-left: artificial horizon.
  const ax = 78;
  const ay = VIEW.height - 78;
  const ar = 52;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(ax, ay);
  ctx.rotate((-plane.bank * Math.PI) / 180);
  ctx.translate(0, plane.pitch * 1.4);
  ctx.fillStyle = '#7fb2e8';
  ctx.fillRect(-ar, -ar * 2, ar * 2, ar * 2);
  ctx.fillStyle = '#8a6b45';
  ctx.fillRect(-ar, 0, ar * 2, ar * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-ar, 0);
  ctx.lineTo(ar, 0);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings symbol over the horizon.
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax - 26, ay);
  ctx.lineTo(ax - 8, ay);
  ctx.moveTo(ax + 8, ay);
  ctx.lineTo(ax + 26, ay);
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax, ay + 8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(plane.gearDown ? 'GEAR DOWN' : 'GEAR UP', 18, VIEW.height - 16);
  ctx.fillText(plane.stalled ? '⚠ STALL' : '', 150, VIEW.height - 16);

  // Mission line and transient messages, bottom centre.
  const next = world.rings.find((r) => !r.hit);
  const line = plane.landed
    ? 'ON THE STRIP — SORTIE COMPLETE'
    : next
      ? `NEXT RING ${next.index + 1}/${total} — ${Math.max(0, Math.round(next.z - plane.z))} m AHEAD`
      : world.mission.needLanding
        ? 'ALL RINGS — LAND ON THE STRIP'
        : 'ALL RINGS — SORTIE COMPLETE';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(line, VIEW.width / 2, VIEW.height - 24);
  if (message && messageT > 0) {
    ctx.fillStyle = 'rgba(10,18,30,0.8)';
    const w = ctx.measureText(message).width + 36;
    ctx.beginPath();
    ctx.roundRect(VIEW.width / 2 - w / 2, 96, w, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(message, VIEW.width / 2, 120);
  }

  // Warnings.
  if (plane.fuel < 20 && plane.fuel > 0) {
    ctx.fillStyle = '#ff5a4a';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOW FUEL — HEAD FOR THE STRIP', VIEW.width / 2, 150);
  }

  // Gust forecast, bottom-right, storm sorties only — and never in a
  // staged frame, so the photographed HUD stays exactly as shot. The
  // panel names the sky, the gust blowing now, and the one coming next,
  // with a small arrow for which way the air is shoving the plane.
  if (!state.staged && state.weather && weatherActive(state.weather)) {
    const fc = gustForecast(state.weather);
    panel(ctx, VIEW.width - 268, VIEW.height - 84, 250, 68);
    ctx.fillStyle = fc.strong ? '#ffb04a' : 'rgba(255,255,255,0.6)';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`WIND ${windWord(state.weather)}`, VIEW.width - 254, VIEW.height - 58);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(fc.now, VIEW.width - 254, VIEW.height - 36);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(fc.next, VIEW.width - 254, VIEW.height - 18);
    const ax = VIEW.width - 46;
    const ay = VIEW.height - 50;
    const dirn = fc.push >= 0 ? 1 : -1;
    const len = clamp(Math.abs(fc.push) * 2, 6, 30);
    ctx.strokeStyle = fc.strong ? '#ffb04a' : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + dirn * len, ay);
    ctx.moveTo(ax + dirn * len, ay);
    ctx.lineTo(ax + dirn * (len - 7), ay - 5);
    ctx.moveTo(ax + dirn * len, ay);
    ctx.lineTo(ax + dirn * (len - 7), ay + 5);
    ctx.stroke();
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,14,24,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = 'rgba(10,18,30,0.88)';
  ctx.beginPath();
  ctx.roundRect(VIEW.width / 2 - 330, 190, 660, 340, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = '800 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, 268);
  ctx.fillStyle = '#ffffff';
  ctx.font = '400 18px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 318 + i * 30));
}

export function drawTitle(ctx, world, selected) {
  ctx.fillStyle = 'rgba(8,14,24,0.42)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 76px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 18;
  ctx.fillText('SKY COURIER', VIEW.width / 2, 170);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd94a';
  ctx.font = '700 30px system-ui, sans-serif';
  ctx.fillText('— ISLAND RUN —', VIEW.width / 2, 214);
  ctx.fillStyle = '#ffffff';
  ctx.font = '400 18px system-ui, sans-serif';
  ctx.fillText('Thread the gold rings, mind your fuel, and bring her home.', VIEW.width / 2, 250);
  const list = ['ring-run', 'dusk', 'storm'];
  const names = {
    'ring-run': '1 · Ring Run — day, 8 rings',
    dusk: '2 · Dusk Delivery — 6 rings + landing',
    storm: '3 · Storm Run — 8 rings, gusts + landing',
  };
  list.forEach((id, i) => {
    const y = 318 + i * 46;
    const sel = selected === id;
    ctx.fillStyle = sel ? 'rgba(255,217,74,0.92)' : 'rgba(10,18,30,0.66)';
    ctx.beginPath();
    ctx.roundRect(VIEW.width / 2 - 260, y - 26, 520, 38, 8);
    ctx.fill();
    ctx.fillStyle = sel ? '#1a2432' : '#ffffff';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText(names[id], VIEW.width / 2, y);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '400 16px system-ui, sans-serif';
  ctx.fillText('ENTER start · 1/2/3 pick a sortie · Arrows/WASD fly · W/S throttle · G gear · P pause · M mute', VIEW.width / 2, 486);
  ctx.fillText('Mouse: hold the left button and steer toward the cursor. Land gently on the strip to refuel.', VIEW.width / 2, 514);
}

export function drawPaused(ctx) {
  overlay(ctx, 'PAUSED', ['Take a breath. The island will wait.', 'P resume · R restart · M mute'], '#7fb2e8');
}

export function drawEnd(ctx, kind, lines) {
  if (kind === 'crash') overlay(ctx, 'CRASHED', lines, '#ff5a4a');
  else if (kind === 'landed') overlay(ctx, 'TOUCHDOWN', lines, '#7ddb5a');
  else overlay(ctx, 'SORTIE COMPLETE', lines, '#ffd94a');
}
