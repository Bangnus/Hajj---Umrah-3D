import { tr } from '../../i18n';
import { AR, C, H, hijriDate, localDate, ritualName, TH, W, type CertOptions } from './dates';
import { check, ellipsize, fitFont, seal, wrap } from './helpers';
import { border, divider, watermark } from './ornaments';

export function drawCertificate(canvas: HTMLCanvasElement, o: CertOptions) {
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  if (!g) return;
  const date = o.date ?? new Date();
  const ritual = ritualName(o.ritual);

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

  const title = tr('ประกาศนียบัตรการฝึกพิธี{ritual}', { ritual });
  g.fillStyle = C.green;
  fitFont(g, title, 700, 60, 40, maxW);
  g.fillText(title, W / 2, 272);
  divider(g, 306, 300);

  g.fillStyle = C.muted;
  g.font = `400 28px ${TH}`;
  g.fillText(tr('ขอมอบประกาศนียบัตรนี้ให้แก่'), W / 2, 364);

  const name = o.name.trim() || tr('ผู้แสวงบุญ');
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
  const intro = tr('ซึ่งได้ฝึกพิธี{ritual}ด้วยโปรแกรมจำลอง 3 มิติ ครบทุกขั้นตอน ดังต่อไปนี้', { ritual });
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
  g.fillText(tr('“ขออัลลอฮ์ทรงรับการงานของท่าน”'), W / 2, duaY + 40);

  // Dates (left), seal (centre), programme name (right).
  const hijri = hijriDate(date);
  g.textAlign = 'left';
  g.fillStyle = C.ink;
  g.font = `600 24px ${TH}`;
  g.fillText(localDate(date), 190, dateY);
  if (hijri) {
    g.fillStyle = C.muted;
    g.font = `400 22px ${TH}`;
    g.fillText(tr('ตรงกับ {hijri}', { hijri }), 190, dateY + 34);
  }
  g.strokeStyle = C.gold;
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(190, dateY - 36); g.lineTo(560, dateY - 36); g.stroke();

  seal(g, W / 2, dateY - 16, 48, o.ritual === 'ฮัจญ์' ? 'حَجّ' : 'عُمْرَة');

  g.textAlign = 'right';
  g.fillStyle = C.ink;
  g.font = `600 24px ${TH}`;
  g.fillText(tr('จำลองอุมเราะฮ์และฮัจญ์ 3 มิติ'), W - 190, dateY);
  g.fillStyle = C.muted;
  g.font = `400 22px ${TH}`;
  g.fillText(tr('โปรแกรมฝึกพิธีเพื่อการเรียนรู้'), W - 190, dateY + 34);
  g.beginPath(); g.moveTo(W - 560, dateY - 36); g.lineTo(W - 190, dateY - 36); g.stroke();

  // Learning-only note.
  const note = tr('ใบประกาศนี้ใช้เพื่อการเรียนรู้เท่านั้น ไม่ใช่เอกสารรับรองการทำพิธีจริง');
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
