import type { Saved } from '../../journey/progress';
import type { Profile } from '../../journey/types';
import { getLang, setLang, tr, type Lang } from '../../i18n';
import { $, displayName, esc, isDefaultName } from './template';

/** Start screen. Resolves with the profile and the stage to start from. */
export function showCreator(
  root: HTMLElement,
  saved: Saved | null,
  savedStageTitle?: string,
  onModeChange?: (mode: Profile['mode']) => void,
): Promise<{ profile: Profile; stage: number }> {
  return new Promise((resolve) => {
    const p: Profile = saved
      ? { ...saved.profile }
      : { name: '', gender: 'male', mode: 'umrah', route: 'miqat-first', hajjType: 'tamattu' };
    const el = document.createElement('div');
    el.className = 'creator';
    el.innerHTML = `
      <div class="creator-card">
        <div class="seg lang-seg" id="langSeg">
          <button data-lang="th" class="${getLang() === 'th' ? 'on' : ''}">ไทย</button>
          <button data-lang="en" class="${getLang() === 'en' ? 'on' : ''}">English</button>
        </div>
        <div class="bismillah" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <h1>${tr('จำลองอุมเราะฮ์และฮัจญ์ 3 มิติ')}</h1>
        <p class="lead">${tr('ฝึกพิธีทีละขั้นตอน พร้อมดุอาอ์ คำอ่าน และความหมายภาษาไทย')}</p>
        ${saved && savedStageTitle ? `
          <div class="resume">
            <div><b>${tr('เดินทางต่อ')}</b><small>${esc(displayName(saved.profile.name))} · ${saved.profile.mode === 'hajj' ? tr('ฮัจญ์') : tr('อุมเราะฮ์')} · ${esc(tr('ขั้นที่ {n} {title}', { n: saved.stageIndex + 1, title: savedStageTitle }))}</small></div>
            <button class="btn primary" id="resumeBtn">${tr('ทำต่อ →')}</button>
          </div>` : ''}
        <label class="field"><span>${tr('ชื่อของคุณ')}</span><input id="nameInput" maxlength="16" placeholder="${tr('ผู้แสวงบุญ')}" value="${esc(isDefaultName(p.name) ? '' : p.name)}" /></label>
        <div class="field"><span>${tr('เพศ (มีผลต่อชุดอิห์รอมและข้อปฏิบัติบางอย่าง)')}</span>
          <div class="seg" data-key="gender">
            <button data-v="male">${tr('👳 ชาย')}</button>
            <button data-v="female">${tr('🧕 หญิง')}</button>
          </div>
        </div>
        <div class="field"><span>${tr('พิธีที่จะฝึก')}</span>
          <div class="seg" data-key="mode">
            <button data-v="umrah">${tr('🕋 อุมเราะฮ์')}</button>
            <button data-v="hajj">${tr('🏕️ ฮัจญ์')}</button>
          </div>
        </div>
        <div class="field" data-show="umrah"><span>${tr('เส้นทาง')}</span>
          <div class="seg" data-key="route">
            <button data-v="miqat-first">${tr('✈️ มีกอตก่อน')}</button>
            <button data-v="madinah-first">${tr('🕌 มะดีนะฮ์ก่อน')}</button>
          </div>
          <small class="field-note" data-note="route"></small>
        </div>
        <div class="field" data-show="hajj"><span>${tr('ประเภทฮัจญ์')}</span>
          <div class="seg three" data-key="hajjType">
            <button data-v="tamattu">${tr('ตะมัตตุอ์')}</button>
            <button data-v="ifrad">${tr('อิฟรอด')}</button>
            <button data-v="qiran">${tr('กิรอน')}</button>
          </div>
          <small class="field-note" data-note="hajjType"></small>
        </div>
        <button class="btn primary big" id="startBtn">${saved ? tr('เริ่มเดินทางใหม่ →') : tr('เริ่มเดินทาง →')}</button>
        <p class="disclaimer">${tr('เพื่อการเรียนรู้เบื้องต้นเท่านั้น ควรศึกษารายละเอียดเพิ่มเติมกับผู้รู้หรือคณะของคุณ')}</p>
      </div>`;
    root.appendChild(el);
    // Switching language rebuilds everything (UI and 3D labels) by reloading.
    el.querySelectorAll<HTMLButtonElement>('#langSeg button').forEach((b) => {
      b.onclick = () => { if (b.dataset.lang !== getLang()) { setLang(b.dataset.lang as Lang); location.reload(); } };
    });
    const NOTES: Record<string, Record<string, string>> = {
      route: {
        'miqat-first': tr('เนียตอุมเราะฮ์บนเครื่องบินก่อนถึงเจดดาห์ ทำอุมเราะฮ์ที่มักกะฮ์ แล้วไปเยือนมะดีนะฮ์'),
        'madinah-first': tr('ไปเยือนมะดีนะฮ์ก่อน แล้วเนียตที่มีกอตบิอ์รอะลี (ซุลหุลัยฟะฮ์) ระหว่างทางไปมักกะฮ์'),
      },
      hajjType: {
        tamattu: tr('ทำอุมเราะฮ์ก่อน พักจากอิห์รอม แล้วครองอิห์รอมฮัจญ์ใหม่ในวันที่ 8 — ต้องเสียดัม (แบบที่คนไทยส่วนใหญ่ทำ)'),
        ifrad: tr('ครองอิห์รอมเพื่อฮัจญ์อย่างเดียวจากมีกอต — ไม่ต้องเสียดัม'),
        qiran: tr('ครองอิห์รอมเพื่ออุมเราะฮ์และฮัจญ์ควบกันจากมีกอต — ต้องเสียดัม'),
      },
    };
    const paint = () => {
      el.querySelectorAll<HTMLElement>('.seg[data-key]').forEach((seg) => {
        const key = seg.dataset.key as keyof Profile;
        seg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.classList.toggle('on', b.dataset.v === p[key]));
      });
      el.querySelectorAll<HTMLElement>('[data-show]').forEach((f) => { f.hidden = f.dataset.show !== p.mode; });
      el.querySelectorAll<HTMLElement>('[data-note]').forEach((n) => { n.textContent = NOTES[n.dataset.note!][p[n.dataset.note as 'route' | 'hajjType']]; });
    };
    el.querySelectorAll<HTMLElement>('.seg[data-key]').forEach((seg) => seg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
      b.onclick = () => {
        (p as unknown as Record<string, string>)[seg.dataset.key!] = b.dataset.v!;
        if (seg.dataset.key === 'mode') onModeChange?.(p.mode);
        paint();
      };
    }));
    paint();
    const done = (profile: Profile, stage: number) => {
      el.remove();
      resolve({ profile, stage });
    };
    $(el, '#startBtn').onclick = () => {
      p.name = ($<HTMLInputElement>(el, '#nameInput').value.trim() || tr('ผู้แสวงบุญ')).slice(0, 16);
      done(p, 0);
    };
    const rb = el.querySelector<HTMLElement>('#resumeBtn');
    if (rb && saved) rb.onclick = () => done({ ...saved.profile }, saved.stageIndex);
  });
}
