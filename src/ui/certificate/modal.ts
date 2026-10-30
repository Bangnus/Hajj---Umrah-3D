import { tr } from '../../i18n';
import { ritualName, slug, type CertOptions } from './dates';
import { drawCertificate } from './render';

async function fontsReady() {
  const loads = [`700 60px "Noto Sans Thai"`, `600 24px "Noto Sans Thai"`, `500 24px "Noto Sans Thai"`, `400 24px "Noto Sans Thai"`, `400 40px Amiri`, `700 40px Amiri`]
    .map((f) => document.fonts?.load(f, 'กขฅ تقبل').catch(() => undefined));
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 3000))]);
}

/** Open the certificate modal on top of everything. Returns a function that closes it. */
export function openCertificate(host: HTMLElement, o: CertOptions): () => void {
  const ritual = ritualName(o.ritual);
  const el = document.createElement('div');
  el.className = 'overlay cert-overlay';
  el.innerHTML = `
    <div class="modal cert" role="dialog" aria-modal="true" aria-label="${tr('ใบประกาศ')}">
      <div class="cert-head">
        <h3>${tr('🎓 ใบประกาศการฝึกพิธี{ritual}', { ritual })}</h3>
        <button class="icon-btn small" data-act="x" aria-label="${tr('ปิด')}">×</button>
      </div>
      <div class="cert-frame"><canvas aria-label="${tr('ภาพใบประกาศ')}"></canvas><div class="cert-loading">${tr('กำลังเตรียมใบประกาศ…')}</div></div>
      <label class="field"><span>${tr('ชื่อบนใบประกาศ')}</span><input maxlength="40" /></label>
      <p class="cert-note">${tr('ใบประกาศนี้ใช้เพื่อการเรียนรู้เท่านั้น ไม่ใช่เอกสารรับรองการทำพิธีจริง')}</p>
      <div class="row">
        <button class="btn ghost" data-act="close">${tr('ปิด')}</button>
        <button class="btn ghost" data-act="share" hidden>${tr('แชร์')}</button>
        <button class="btn primary" data-act="png">${tr('⬇ ดาวน์โหลด PNG')}</button>
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
        await navigator.share({
          files: [file],
          title: tr('ใบประกาศการฝึกพิธี{ritual}', { ritual }),
          text: tr('ฝึกพิธี{ritual}ครบทุกขั้นตอนแล้ว อัลฮัมดุลิลลาฮ์ (ใช้เพื่อการเรียนรู้)', { ritual }),
        });
      } catch { /* cancelled or unsupported */ }
    }
  });
  return close;
}
