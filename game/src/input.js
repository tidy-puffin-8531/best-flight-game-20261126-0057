// Sky Courier — Island Run: keyboard and mouse.
// Arrows / WASD fly the plane, W/S work the throttle, G drops the gear,
// P pauses, M mutes, R restarts, Enter starts a sortie, 1/2/3 pick one.
// The mouse steers too: hold the left button and the plane banks toward
// the cursor. `pressed()` consumes a key once, so menu taps never repeat.

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0.5, y: 0.5, down: false, active: false };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = (e.clientY - r.top) / r.height;
    mouse.active = true;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouse.down = true;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });

  function axis(neg, pos) {
    return (keys.has(pos) ? 1 : 0) - (keys.has(neg) ? 1 : 0);
  }

  const clamp1 = (v) => Math.max(-1, Math.min(1, v));

  return {
    // -1..1 stick deflection for this frame: keyboard first, mouse while held.
    stick() {
      let pitch = axis('ArrowUp', 'ArrowDown') * -1; // up key = nose up
      let bank = axis('ArrowLeft', 'ArrowRight');
      let throttle = axis('KeyS', 'KeyW');
      if (mouse.down && mouse.active) {
        bank = (mouse.x - 0.5) * 2;
        pitch = (0.5 - mouse.y) * 1.4;
        throttle = 0; // mouse steers; throttle stays where it was
      }
      return { pitch: clamp1(pitch), bank: clamp1(bank), throttle };
    },
    pressed(codeName) {
      if (!keys.has(codeName)) return false;
      keys.delete(codeName);
      return true;
    },
    held(codeName) {
      return keys.has(codeName);
    },
  };
}
