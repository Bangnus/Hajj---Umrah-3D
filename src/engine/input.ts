/** Keyboard, mouse-drag orbit, wheel zoom and a touch joystick. */
export class Input {
  yaw = 0.7;
  pitch = 0.32;
  dist = 7;
  jog = false;
  enabled = true;

  private readonly keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private touchJog = false;

  constructor(canvas: HTMLCanvasElement, joystick: HTMLElement, knob: HTMLElement, jogBtn: HTMLElement) {
    addEventListener('keydown', (e) => {
      if (isTyping(e.target)) return;
      this.keys.add(e.code);
      if (e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    // Drag anywhere on the canvas to orbit the camera.
    let drag: { id: number; x: number; y: number } | null = null;
    canvas.addEventListener('pointerdown', (e) => {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      this.yaw -= (e.clientX - drag.x) * 0.006;
      this.pitch = clamp(this.pitch + (e.clientY - drag.y) * 0.004, 0.06, 1.25);
      drag.x = e.clientX; drag.y = e.clientY;
    });
    const end = (e: PointerEvent) => { if (drag?.id === e.pointerId) drag = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.dist = clamp(this.dist * (1 + Math.sign(e.deltaY) * 0.1), 2.5, 22);
    }, { passive: false });

    // Touch joystick.
    const R = 48;
    let jid: number | null = null;
    let cx = 0, cy = 0;
    const setKnob = (dx: number, dy: number) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };
    joystick.addEventListener('pointerdown', (e) => {
      jid = e.pointerId;
      const r = joystick.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      joystick.setPointerCapture(e.pointerId);
      move(e);
    });
    const move = (e: PointerEvent) => {
      if (e.pointerId !== jid) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
      setKnob(dx, dy);
      this.joy = { x: dx / R, y: -dy / R };
    };
    joystick.addEventListener('pointermove', move);
    const jend = (e: PointerEvent) => {
      if (e.pointerId !== jid) return;
      jid = null; this.joy = { x: 0, y: 0 }; setKnob(0, 0);
    };
    joystick.addEventListener('pointerup', jend);
    joystick.addEventListener('pointercancel', jend);
    jogBtn.addEventListener('click', () => {
      this.touchJog = !this.touchJog;
      jogBtn.classList.toggle('on', this.touchJog);
    });
  }

  /** Movement intent: x = right, y = forward, length ≤ 1. */
  axis(): { x: number; y: number } {
    if (!this.enabled) return { x: 0, y: 0 };
    const k = this.keys;
    let x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    x += this.joy.x; y += this.joy.y;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.jog = k.has('ShiftLeft') || k.has('ShiftRight') || this.touchJog;
    return { x, y };
  }
}

function isTyping(t: EventTarget | null) {
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
