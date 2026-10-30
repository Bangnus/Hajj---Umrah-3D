/**
 * Learning certificate shown at the end of a journey: a canvas drawing (no images) with an
 * Islamic geometric border, the pilgrim's editable name, completed stages and Thai/Hijri dates.
 * It is for learning only, never proof of a real Umrah/Hajj.
 */

export interface CertOptions {
  /** Thai ritual name: "อุมเราะฮ์" or "ฮัจญ์". */
  ritual: string;
  name: string;
  stages: { title: string }[];
  date?: Date;
}

const W = 1600;
const H = 1130;
const C = {
  paper: '#fbf6e8',
  paperEdge: '#efe2c0',
  green: '#0d3b33',
  green2: '#14524a',
  gold: '#c9a640',
  goldDark: '#8f7120',
  ink: '#22332f',
  muted: '#5c6d67',
  note: '#8a3b2b',
};
const TH = '"Noto Sans Thai", system-ui, sans-serif';
const AR = 'Amiri, "Noto Naskh Arabic", serif';

const HIJRI_MONTHS = ['มุฮัรร็อม', 'ศ็อฟัร', 'ร็อบีอุลเอาวัล', 'ร็อบีอุษษานี', 'ญุมาดัลอูลา', 'ญุมาดัลอาคิเราะฮ์',
  'รอญับ', 'ชะอ์บาน', 'รอมฎอน', 'เชาวาล', 'ซุลเกาะอ์ดะฮ์', 'ซุลหิจญะฮ์'];

export function thaiDate(d: Date): string {
  try {
    return `วันที่ ${new Intl.DateTimeFormat('th-TH-u-ca-buddhist', { day: 'numeric', month: 'long', year: 'numeric' }).format(d).replace(/(\d{4})$/, 'พ.ศ. $1')}`;
  } catch {
    return `วันที่ ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
  }
}

/** Hijri date in Thai, or '' when the browser has no Islamic calendar. */
export function hijriDate(d: Date): string {
  for (const cal of ['islamic-umalqura', 'islamic', 'islamic-civil']) {
    try {
      const f = new Intl.DateTimeFormat(`en-u-ca-${cal}-nu-latn`, { day: 'numeric', month: 'numeric', year: 'numeric' });
      if (!f.resolvedOptions().calendar.startsWith('islamic')) continue;
      const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
      const day = Number(parts.day), month = Number(parts.month), year = Number(String(parts.year).replace(/\D/g, ''));
      if (!day || !month || !year || month > 12) continue;
      return `${day} ${HIJRI_MONTHS[month - 1]} ฮ.ศ. ${year}`;
    } catch { /* try next */ }
  }
  try {
    const f = new Intl.DateTimeFormat('th-TH-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' });
    if (f.resolvedOptions().calendar.startsWith('islamic')) return f.format(d);
  } catch { /* none */ }
  return '';
}

// ---------------------------------------------------------------- drawing helpers

type G = CanvasRenderingContext2D;

function starPath(g: G, x: number, y: number, r: number, points = 8, inner = 0.42, rot = 0) {
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
function khatam(g: G, x: number, y: number, r: number, fill: string, stroke: string, lw: number) {
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

function border(g: G) {
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
function watermark(g: G, x: number, y: number, r: number) {
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

function divider(g: G, y: number, half: number) {
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

/** Split Thai text (no spaces between words) into graphemes/words for wrapping and ellipsis. */
function segments(text: string): string[] {
  try {
    const seg = new Intl.Segmenter('th', { granularity: 'word' });
    return Array.from(seg.segment(text), (s) => s.segment);
  } catch {
    return text.match(/[\s\S][ัิ-ฺ็-๎]*/g) ?? [text];
  }
}

function ellipsize(g: G, text: string, max: number): string {
  if (g.measureText(text).width <= max) return text;
  const parts = segments(text);
  while (parts.length && g.measureText(parts.join('') + '…').width > max) parts.pop();
  return parts.join('') + '…';
}

function wrap(g: G, text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const s of segments(text)) {
    if (cur && g.measureText(cur + s).width > max) { lines.push(cur.trimEnd()); cur = s.trimStart(); } else cur += s;
  }
  if (cur) lines.push(cur);
  return lines;
}

function fitFont(g: G, text: string, weight: number, size: number, min: number, max: number, family = TH) {
  let s = size;
  do { g.font = `${weight} ${s}px ${family}`; s -= 2; } while (s >= min && g.measureText(text).width > max);
}

function check(g: G, x: number, y: number, r: number) {
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

function seal(g: G, x: number, y: number, r: number, label: string) {
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

export function drawCertificate(canvas: HTMLCanvasElement, o: CertOptions) {
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  if (!g) return;
  const date = o.date ?? new Date();

  // Paper.
  const bg = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, C.paper);
  bg.addColorStop(1, C.paperEdge);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  watermark(g, W / 2, H / 2 + 40, 330);
  border(g);

  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  const maxW = W - 340;

  g.fillStyle = C.goldDark;
  g.font = `400 40px ${AR}`;
  g.direction = 'rtl';
  g.fillText('بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', W / 2, 190);
  g.direction = 'ltr';

  const title = `ประกาศนียบัตรการฝึกพิธี${o.ritual}`;
  g.fillStyle = C.green;
  fitFont(g, title, 700, 60, 40, maxW);
  g.fillText(title, W / 2, 272);
  divider(g, 306, 300);

  g.fillStyle = C.muted;
  g.font = `400 28px ${TH}`;
  g.fillText('ขอมอบประกาศนียบัตรนี้ให้แก่', W / 2, 364);

  const name = o.name.trim() || 'ผู้แสวงบุญ';
  g.fillStyle = C.green;
  fitFont(g, name, 700, 76, 36, 1000);
  g.fillText(name, W / 2, 448);
  g.strokeStyle = C.gold;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(W / 2 - 340, 474);
  g.lineTo(W / 2 + 340, 474);
  g.stroke();

  g.fillStyle = C.ink;
  g.font = `400 27px ${TH}`;
  const intro = `ซึ่งได้ฝึกพิธี${o.ritual}ด้วยโปรแกรมจำลอง 3 มิติ ครบทุกขั้นตอน ดังต่อไปนี้`;
  wrap(g, intro, maxW).forEach((l, k) => g.fillText(l, W / 2, 524 + k * 36));

  // Completed stages in a grid.
  const n = o.stages.length;
  const cols = n <= 3 ? Math.max(1, n) : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const rowH = rows > 4 ? 34 : 42;
  const fs = rows > 4 ? 19 : cols === 4 ? 21 : 23;
  const gridW = cols >= 3 ? 1260 : 900;
  const colW = gridW / cols;
  const top = 576;
  g.textAlign = 'left';
  g.font = `500 ${fs}px ${TH}`;
  o.stages.forEach((s, k) => {
    // Fill column by column so reading order goes down then across.
    const col = Math.floor(k / rows), row = k % rows;
    const x = W / 2 - gridW / 2 + col * colW + 16;
    const y = top + row * rowH;
    check(g, x + 12, y - fs * 0.36, 12);
    g.fillStyle = C.ink;
    g.fillText(ellipsize(g, `${k + 1}. ${s.title}`, colW - 52), x + 34, y);
  });
  const listEnd = top + (rows - 1) * rowH;

  // Du'a, centred between the stage list and the date row.
  const dateY = 930;
  const duaY = Math.min(Math.max(listEnd + 76, (listEnd + dateY) / 2 - 8), dateY - 74);
  g.textAlign = 'center';
  g.fillStyle = C.goldDark;
  g.font = `700 42px ${AR}`;
  g.direction = 'rtl';
  g.fillText('تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ', W / 2, duaY);
  g.direction = 'ltr';
  g.fillStyle = C.ink;
  g.font = `500 25px ${TH}`;
  g.fillText('“ขออัลลอฮ์ทรงรับการงานของท่าน”', W / 2, duaY + 40);

  // Dates (left), seal (centre), programme name (right).
  const hijri = hijriDate(date);
  g.textAlign = 'left';
  g.fillStyle = C.ink;
  g.font = `600 24px ${TH}`;
  g.fillText(thaiDate(date), 190, dateY);
  if (hijri) {
    g.fillStyle = C.muted;
    g.font = `400 22px ${TH}`;
    g.fillText(`ตรงกับ ${hijri}`, 190, dateY + 34);
  }
  g.strokeStyle = C.gold;
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(190, dateY - 36); g.lineTo(560, dateY - 36); g.stroke();

  seal(g, W / 2, dateY - 16, 48, o.ritual === 'ฮัจญ์' ? 'حَجّ' : 'عُمْرَة');

  g.textAlign = 'right';
  g.fillStyle = C.ink;
  g.font = `600 24px ${TH}`;
  g.fillText('จำลองอุมเราะฮ์และฮัจญ์ 3 มิติ', W - 190, dateY);
  g.fillStyle = C.muted;
  g.font = `400 22px ${TH}`;
  g.fillText('โปรแกรมฝึกพิธีเพื่อการเรียนรู้', W - 190, dateY + 34);
  g.beginPath(); g.moveTo(W - 560, dateY - 36); g.lineTo(W - 190, dateY - 36); g.stroke();

  // Learning-only note.
  const note = 'ใบประกาศนี้ใช้เพื่อการเรียนรู้เท่านั้น ไม่ใช่เอกสารรับรองการทำพิธีจริง';
  g.textAlign = 'center';
  g.font = `600 21px ${TH}`;
  const nw = g.measureText(note).width + 44;
  const ny = 1002;
  g.fillStyle = 'rgba(138,59,43,.08)';
  g.strokeStyle = 'rgba(138,59,43,.45)';
  g.lineWidth = 1.2;
  g.beginPath();
  if (typeof g.roundRect === 'function') g.roundRect(W / 2 - nw / 2, ny - 27, nw, 38, 19);
  else g.rect(W / 2 - nw / 2, ny - 27, nw, 38);
  g.fill();
  g.stroke();
  g.fillStyle = C.note;
  g.fillText(note, W / 2, ny);
}

async function fontsReady() {
  const loads = [`700 60px "Noto Sans Thai"`, `600 24px "Noto Sans Thai"`, `500 24px "Noto Sans Thai"`, `400 24px "Noto Sans Thai"`, `400 40px Amiri`, `700 40px Amiri`]
    .map((f) => document.fonts?.load(f, 'กขฅ تقبل').catch(() => undefined));
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 3000))]);
}

function slug(ritual: string) { return ritual === 'ฮัจญ์' ? 'hajj' : 'umrah'; }

/** Open the certificate modal on top of everything. Returns a function that closes it. */
export function openCertificate(host: HTMLElement, o: CertOptions): () => void {
  const el = document.createElement('div');
  el.className = 'overlay cert-overlay';
  el.innerHTML = `
    <div class="modal cert" role="dialog" aria-modal="true" aria-label="ใบประกาศ">
      <div class="cert-head">
        <h3>🎓 ใบประกาศการฝึกพิธี${o.ritual}</h3>
        <button class="icon-btn small" data-act="x" aria-label="ปิด">×</button>
      </div>
      <div class="cert-frame"><canvas aria-label="ภาพใบประกาศ"></canvas><div class="cert-loading">กำลังเตรียมใบประกาศ…</div></div>
      <label class="field"><span>ชื่อบนใบประกาศ</span><input maxlength="40" /></label>
      <p class="cert-note">ใบประกาศนี้ใช้เพื่อการเรียนรู้เท่านั้น ไม่ใช่เอกสารรับรองการทำพิธีจริง</p>
      <div class="row">
        <button class="btn ghost" data-act="close">ปิด</button>
        <button class="btn ghost" data-act="share" hidden>แชร์</button>
        <button class="btn primary" data-act="png">⬇ ดาวน์โหลด PNG</button>
      </div>
    </div>`;
  host.appendChild(el);
  const canvas = el.querySelector('canvas')!;
  const input = el.querySelector('input')!;
  const loading = el.querySelector<HTMLElement>('.cert-loading')!;
  const shareBtn = el.querySelector<HTMLButtonElement>('[data-act="share"]')!;
  input.value = o.name;
  const date = o.date ?? new Date();
  let ready = false;
  let raf = 0;
  const render = () => { if (ready) drawCertificate(canvas, { ...o, name: input.value, date }); };
  input.addEventListener('input', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); });
  fontsReady().then(() => { ready = true; render(); loading.remove(); });

  const fileName = () => `certificate-${slug(o.ritual)}-${date.toISOString().slice(0, 10)}.png`;
  const toBlob = () => new Promise<Blob | null>((res) => {
    try { canvas.toBlob(res, 'image/png'); } catch { res(null); }
  });

  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'probe.png', { type: 'image/png' });
    shareBtn.hidden = !(typeof navigator.share === 'function' && navigator.canShare?.({ files: [probe] }));
  } catch { shareBtn.hidden = true; }

  const close = () => { cancelAnimationFrame(raf); el.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey);
  el.addEventListener('click', async (e) => {
    if (e.target === el) { close(); return; }
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'x' || act === 'close') close();
    if (act === 'png' && ready) {
      const blob = await toBlob();
      const a = document.createElement('a');
      const url = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png');
      a.href = url;
      a.download = fileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (blob) setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    if (act === 'share' && ready) {
      const blob = await toBlob();
      if (!blob) return;
      const file = new File([blob], fileName(), { type: 'image/png' });
      try {
        await navigator.share({ files: [file], title: `ใบประกาศการฝึกพิธี${o.ritual}`, text: `ฝึกพิธี${o.ritual}ครบทุกขั้นตอนแล้ว อัลฮัมดุลิลลาฮ์ (ใช้เพื่อการเรียนรู้)` });
      } catch { /* cancelled or unsupported */ }
    }
  });
  return close;
}
