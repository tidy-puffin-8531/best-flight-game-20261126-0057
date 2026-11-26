// Sky Courier — Island Run: synthesised sound, no audio files.
// An engine hum that follows throttle and speed, a two-note chime for a
// ring, a thud for a touchdown, a crunch for a crash and a click for the
// menus — all WebAudio oscillators, all guarded so a browser without audio
// (or a headless screenshot run) stays silent instead of throwing.

export function createAudio() {
  let ctx = null;
  let engine = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 52;
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 104;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      osc.start();
      osc2.start();
      engine = { osc, osc2 };
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    try {
      const t = ctx.currentTime + when;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch {
      /* silent */
    }
  }

  return {
    // Call from a user gesture (Enter / click) so the context may start.
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    setEngine(throttle, speed) {
      if (muted || !ctx || !engine) return;
      try {
        const f = 46 + throttle * 55 + speed * 0.25;
        engine.osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.08);
        engine.osc2.frequency.setTargetAtTime(f * 2, ctx.currentTime, 0.08);
        engineGain.gain.setTargetAtTime(0.028 + throttle * 0.05, ctx.currentTime, 0.1);
      } catch {
        /* silent */
      }
    },
    ring() {
      blip(880, 0.35, 'sine', 0.16);
      blip(1318, 0.4, 'sine', 0.12, 0.07);
    },
    thud() {
      blip(70, 0.3, 'sine', 0.25);
      blip(140, 0.18, 'triangle', 0.12, 0.02);
    },
    crash() {
      blip(160, 0.5, 'sawtooth', 0.2);
      blip(55, 0.7, 'sine', 0.25, 0.05);
    },
    click() {
      blip(660, 0.08, 'square', 0.05);
    },
    toggleMute() {
      muted = !muted;
      if (ctx && engineGain) {
        try {
          engineGain.gain.value = muted ? 0 : 0.05;
        } catch {
          /* silent */
        }
      }
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
