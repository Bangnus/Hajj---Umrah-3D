import { AR, C, TH } from './dates';
import { khatam, starPath, type G } from './ornaments';

/** Split Thai text (no spaces between words) into graphemes/words for wrapping and ellipsis. */
function segments(text: string): string[] {
  try {
    const seg = new Intl.Segmenter('th', { granularity: 'word' });
    return Array.from(seg.segment(text), (s) => s.segment);
  } catch {
    return text.match(/[\s\S][ัิ-ฺ็-๎]*/g) ?? [text];
  }
}

export function ellipsize(g: G, text: string, max: number): string {
  if (g.measureText(text).width <= max) return text;
  const parts = segments(text);
  while (parts.length && g.measureText(parts.join('') + '…').width > max) parts.pop();
  return parts.join('') + '…';
}

export function wrap(g: G, text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const s of segments(text)) {
    if (cur && g.measureText(cur + s).width > max) { lines.push(cur.trimEnd()); cur = s.trimStart(); } else cur += s;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function fitFont(g: G, text: string, weight: number, size: number, min: number, max: number, family = TH) {
  let s = size;
  do { g.font = `${weight} ${s}px ${family}`; s -= 2; } while (s >= min && g.measureText(text).width > max);
}

export function check(g: G, x: number, y: number, r: number) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = C.green2;
  g.fill();
  g.beginPath();
  g.moveTo(x - r * 0.45, y + r * 0.02);
  g.lineTo(x - r * 0.1, y + r * 0.38);
  g.lineTo(x + r * 0.5, y - r * 0.35);
  g.strokeStyle = '#fff6d8';
  g.lineWidth = r * 0.28;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
  g.lineCap = 'butt';
}

export function seal(g: G, x: number, y: number, r: number, label: string) {
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = C.green;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = C.gold;
  g.stroke();
  g.beginPath();
  g.arc(x, y, r - 8, 0, Math.PI * 2);
  g.lineWidth = 1;
  g.stroke();
  starPath(g, x, y, r * 0.78, 16, 0.82);
  g.lineWidth = 1.2;
  g.stroke();
  khatam(g, x, y, r * 0.5, C.green2, C.gold, 2);
  g.fillStyle = C.gold;
  g.font = `700 ${Math.round(r * 0.34)}px ${AR}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.direction = 'rtl';
  g.fillText(label, x, y + 2);
  g.direction = 'ltr';
  g.restore();
}
