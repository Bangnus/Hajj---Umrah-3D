import { C, H, W } from './dates';

// ---------------------------------------------------------------- drawing helpers

export type G = CanvasRenderingContext2D;

export function starPath(g: G, x: number, y: number, r: number, points = 8, inner = 0.42, rot = 0) {
  g.beginPath();
  for (let k = 0; k < points * 2; k++) {
    const a = rot + (k * Math.PI) / points - Math.PI / 2;
    const rr = k % 2 ? r * inner : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (k) g.lineTo(px, py); else g.moveTo(px, py);
  }
  g.closePath();
}

/** Rub el Hizb style 8-point star: two overlapping squares. */
export function khatam(g: G, x: number, y: number, r: number, fill: string, stroke: string, lw: number) {
  starPath(g, x, y, r, 8, 0.76);
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = lw;
  g.strokeStyle = stroke;
  for (const rot of [0, Math.PI / 4]) {
    g.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = rot + (k * Math.PI) / 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (k) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.closePath();
    g.stroke();
  }
}

function rosette(g: G, x: number, y: number, r: number) {
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = C.green2;
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = C.gold;
  g.stroke();
  starPath(g, x, y, r * 0.88, 8, 0.55, Math.PI / 8);
  g.strokeStyle = C.gold;
  g.lineWidth = 1.5;
  g.stroke();
  khatam(g, x, y, r * 0.62, C.green, C.gold, 2);
  starPath(g, x, y, r * 0.26, 8, 0.5);
  g.fillStyle = C.gold;
  g.fill();
  g.restore();
}

function diamond(g: G, x: number, y: number, r: number, fill: string) {
  g.beginPath();
  g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

/** Repeating star band along one side, between the corner rosettes. */
function band(g: G, x0: number, y0: number, x1: number, y1: number, bw: number) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.round(len / (bw * 1.25)));
  const step = len / n;
  const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
  const nx = -uy, ny = ux;
  // Interlaced zig-zag behind the stars.
  g.save();
  g.strokeStyle = 'rgba(201,166,64,.55)';
  g.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    g.beginPath();
    for (let k = 0; k <= n * 2; k++) {
      const t = (k * step) / 2;
      const off = (k % 2 ? side : -side) * bw * 0.3;
      const px = x0 + ux * t + nx * off, py = y0 + uy * t + ny * off;
      if (k) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.stroke();
  }
  g.restore();
  for (let k = 0; k < n; k++) {
    const t = step * (k + 0.5);
    khatam(g, x0 + ux * t, y0 + uy * t, bw * 0.3, C.green2, C.gold, 1.8);
    starPath(g, x0 + ux * t, y0 + uy * t, bw * 0.1, 8, 0.5);
    g.fillStyle = C.gold;
    g.fill();
    if (k) diamond(g, x0 + ux * step * k, y0 + uy * step * k, bw * 0.09, C.gold);
  }
}

export function border(g: G) {
  const o = 26, bw = 60;
  // Dark band.
  g.fillStyle = C.green;
  g.fillRect(o, o, W - 2 * o, bw);
  g.fillRect(o, H - o - bw, W - 2 * o, bw);
  g.fillRect(o, o, bw, H - 2 * o);
  g.fillRect(W - o - bw, o, bw, H - 2 * o);
  // Gold rules on both edges of the band.
  g.strokeStyle = C.gold;
  g.lineWidth = 3;
  g.strokeRect(o, o, W - 2 * o, H - 2 * o);
  g.lineWidth = 2;
  g.strokeRect(o + bw, o + bw, W - 2 * (o + bw), H - 2 * (o + bw));
  g.lineWidth = 1;
  g.strokeRect(o + 6, o + 6, W - 2 * (o + 6), H - 2 * (o + 6));
  const c = o + bw / 2;
  band(g, c + bw / 2, c, W - c - bw / 2, c, bw);
  band(g, c + bw / 2, H - c, W - c - bw / 2, H - c, bw);
  band(g, c, c + bw / 2, c, H - c - bw / 2, bw);
  band(g, W - c, c + bw / 2, W - c, H - c - bw / 2, bw);
  for (const [x, y] of [[c, c], [W - c, c], [c, H - c], [W - c, H - c]]) rosette(g, x, y, bw * 0.62);
  // Inner fine double rule with small corner stars.
  const i = o + bw + 14;
  g.strokeStyle = C.gold;
  g.lineWidth = 1.5;
  g.strokeRect(i, i, W - 2 * i, H - 2 * i);
  g.lineWidth = 0.8;
  g.strokeRect(i + 5, i + 5, W - 2 * (i + 5), H - 2 * (i + 5));
  for (const [x, y] of [[i, i], [W - i, i], [i, H - i], [W - i, H - i]]) {
    khatam(g, x, y, 13, C.paper, C.goldDark, 1.5);
    starPath(g, x, y, 5, 8, 0.5);
    g.fillStyle = C.goldDark;
    g.fill();
  }
}

/** Faint 12-fold rosette behind the text. */
export function watermark(g: G, x: number, y: number, r: number) {
  g.save();
  g.globalAlpha = 0.07;
  g.strokeStyle = C.goldDark;
  g.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    starPath(g, x, y, r * (1 - k * 0.22), 12, 0.72, (k * Math.PI) / 12);
    g.stroke();
  }
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    g.beginPath();
    g.arc(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.5, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
}

export function divider(g: G, y: number, half: number) {
  g.save();
  g.strokeStyle = C.gold;
  g.lineWidth = 2;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(W / 2 + s * 26, y);
    g.lineTo(W / 2 + s * half, y);
    g.stroke();
    diamond(g, W / 2 + s * half, y, 5, C.gold);
    diamond(g, W / 2 + s * (half * 0.55), y, 4, C.gold);
  }
  khatam(g, W / 2, y, 16, C.paper, C.goldDark, 2);
  starPath(g, W / 2, y, 6, 8, 0.5);
  g.fillStyle = C.goldDark;
  g.fill();
  g.restore();
}
