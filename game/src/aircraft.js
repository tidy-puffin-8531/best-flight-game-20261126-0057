// Sky Courier — Island Run: the flight model.
// A forgiving arcade model with real trade-offs: speed comes from
// throttle, lift needs speed, a bank turns the nose, and a slow wing
// sinks. Fuel turns every sortie into decisions — push the throttle and
// you arrive fast and thirsty; glide and you arrive late, or not at all.

import { PLANE } from './config.js';
import { clamp, degToRad, wrapAngle } from './random.js';

export function freshPlane() {
  return {
    x: 0, y: PLANE.startAltitude, z: 0, // metres: east, altitude, north along the route
    heading: 0, // degrees, 0 = north
    pitch: 0, // degrees, + = nose up
    bank: 0, // degrees, + = right wing down
    speed: PLANE.startSpeed, // m/s
    throttle: 0.62,
    fuel: 100,
    gearDown: false,
    vspeed: 0, // m/s vertical, for the HUD and the landing call
    stalled: false,
    crashed: false,
    landed: false,
    onGround: false,
  };
}

// One physics step. `ctl` is {pitch, bank, throttle} in -1..1, `wind` is
// the crosswind in m/s, and `ground` is the terrain height under the plane.
export function stepPlane(p, ctl, dt, wind, ground, runway) {
  if (p.crashed || p.landed) return p;

  // Throttle: the stick sets a target; the engine spools toward it.
  p.throttle = clamp(p.throttle + ctl.throttle * dt * 0.8, 0, 1);

  // Speed chases the throttle's target, with drag growing at the top end.
  const targetSpeed = PLANE.minSpeed + p.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  const drag = 0.35 + (p.speed / PLANE.maxSpeed) * 0.5;
  p.speed += (targetSpeed - p.speed) * drag * dt;
  p.speed = clamp(p.speed, 0, PLANE.maxSpeed + 6);

  // Bank and pitch ease toward the stick, so the plane feels weighted.
  // Pitch down is allowed a little further than pitch up.
  const targetBank = ctl.bank * PLANE.maxBankDeg;
  const targetPitch = ctl.pitch >= 0 ? ctl.pitch * PLANE.maxPitchDeg : ctl.pitch * -PLANE.minPitchDeg;
  p.bank += (targetBank - p.bank) * Math.min(1, dt * 3.2);
  p.pitch += (targetPitch - p.pitch) * Math.min(1, dt * 2.6);

  // A bank turns the heading; faster flight turns harder.
  const turn = p.bank * PLANE.turnRate * (p.speed / PLANE.cruiseSpeed);
  p.heading = wrapAngle(p.heading + turn * dt);

  // Lift: climb comes from pitch times speed. Below the stall speed the
  // wing quits and the nose drops whatever the stick says.
  p.stalled = p.speed < PLANE.minSpeed + 4;
  let climb = Math.sin(degToRad(p.pitch)) * p.speed * PLANE.climbFactor;
  if (p.stalled) climb -= (PLANE.minSpeed + 4 - p.speed) * 1.4;
  if (p.gearDown) climb -= 1.5; // the gear is a barn door in the wind
  p.vspeed = climb;
  p.y += climb * dt;

  // Forward motion follows the heading; the wind pushes the plane sideways.
  const hr = degToRad(p.heading);
  p.z += Math.cos(hr) * p.speed * dt;
  p.x += Math.sin(hr) * p.speed * dt + wind * dt;

  // Fuel: throttle drinks it; idling sips it.
  p.fuel -= (PLANE.fuelIdle + p.throttle * PLANE.fuelBurn) * dt;
  if (p.fuel <= 0) {
    p.fuel = 0;
    p.throttle = 0;
  }

  // The ground decides the ending: a gentle arrival on the strip is a
  // landing, anything else at speed is a crash.
  if (p.y <= ground + 2) {
    p.y = ground + 2;
    const onStrip = Math.abs(p.x - runway.x) < runway.width / 2
      && p.z > runway.zStart && p.z < runway.zEnd;
    const gentle = p.vspeed > -3.5 && p.speed < 46 && Math.abs(p.bank) < 12;
    if (onStrip && gentle) {
      p.landed = true;
      p.onGround = true;
    } else if (p.speed < 12 && p.vspeed > -2) {
      p.landed = true; // rolled to a stop on the grass, ungraceful but alive
      p.onGround = true;
    } else {
      p.crashed = true;
    }
  }
  return p;
}

// Landing quality for the debrief: sink rate and speed at touchdown.
export function landingCall(p) {
  const sink = -p.vspeed;
  if (sink < 1.2 && p.speed < 38) return { word: 'GREASED IT', bonus: 200 };
  if (sink < 2.6) return { word: 'GOOD LANDING', bonus: 100 };
  return { word: 'FIRM ARRIVAL', bonus: 40 };
}
