import type { Beat } from '../../journey/prayer';
import type { Profile, StageDef } from '../../journey/types';
import * as audio from '../../engine/audio';
import { tr } from '../../i18n';
import { $, displayName, esc, ritualName } from './template';

/** Step-by-step prayer guide with a minimum time per position. */
export function showPrayerModal(
  overlay: HTMLElement,
  closeOverlays: () => void,
  beats: Beat[],
  onBeat: (b: Beat) => void,
  onDone: () => void,
) {
  let i = 0;
  let timer = 0;
  overlay.hidden = false;
  overlay.innerHTML = `
    <div class="modal prayer">
      <div class="step-pill" id="pzStep"></div>
      <h3 id="pzTitle"></h3>
      <p id="pzText"></p>
      <div class="bar"><div id="pzFill"></div></div>
      <button class="btn primary" id="pzNext"></button>
    </div>`;
  const show = () => {
    const b = beats[i];
    onBeat(b);
    $(overlay, '#pzStep').textContent = tr('ละหมาด 2 ร็อกอะฮ์ · {i} / {n}', { i: i + 1, n: beats.length });
    $(overlay, '#pzTitle').textContent = b.title;
    $(overlay, '#pzText').textContent = b.text;
    const btn = $<HTMLButtonElement>(overlay, '#pzNext');
    btn.textContent = i === beats.length - 1 ? tr('เสร็จสิ้น') : tr('ท่าถัดไป →');
    btn.disabled = true;
    const fill = $(overlay, '#pzFill');
    fill.style.transition = 'none';
    fill.style.width = '0%';
    void fill.offsetWidth;
    fill.style.transition = `width ${b.min}s linear`;
    fill.style.width = '100%';
    clearTimeout(timer);
    timer = window.setTimeout(() => { btn.disabled = false; }, b.min * 1000);
  };
  $(overlay, '#pzNext').onclick = () => {
    if (i < beats.length - 1) { i++; show(); return; }
    clearTimeout(timer);
    closeOverlays();
    onDone();
  };
  show();
}

/** Drink Zamzam in three sips. */
export function showZamzamModal(overlay: HTMLElement, closeOverlays: () => void, onDone: () => void) {
  let sips = 0;
  overlay.hidden = false;
  overlay.innerHTML = `
    <div class="modal zamzam">
      <div class="water">💧</div>
      <h3>${tr('ดื่มน้ำซัมซัม')}</h3>
      <p>${tr('กล่าว "บิสมิลลาฮ์" หันหน้าไปทางกิบลัต ดื่มสามอึก แล้วกล่าว "อัลฮัมดุลิลลาฮ์" ขอดุอาอ์ตามที่ต้องการขณะดื่ม')}</p>
      <button class="btn primary" id="zzBtn">${tr('ดื่มอึกที่ {n} / 3', { n: 1 })}</button>
    </div>`;
  const btn = $<HTMLButtonElement>(overlay, '#zzBtn');
  btn.onclick = () => {
    sips++;
    if (sips < 3) {
      btn.disabled = true;
      btn.textContent = tr('ดื่มอึกที่ {n} / 3', { n: sips + 1 });
      setTimeout(() => { btn.disabled = false; }, 1200);
      return;
    }
    btn.textContent = tr('อัลฮัมดุลิลลาฮ์ ✓');
    btn.disabled = true;
    setTimeout(() => { closeOverlays(); onDone(); }, 900);
  };
}

export function showCompletionModal(
  root: HTMLElement,
  overlay: HTMLElement,
  closeOverlays: () => void,
  ritualKey: string,
  stopDuaSpeech: () => void,
  stages: StageDef[],
  profile: Profile,
  onRestart: () => void,
) {
  const name = displayName(profile.name);
  const ritual = ritualName(ritualKey);
  overlay.hidden = false;
  overlay.innerHTML = `
    <div class="modal complete">
      <div class="big-ar" lang="ar" dir="rtl">الْحَمْدُ لِلَّهِ</div>
      <h2>${tr('อัลฮัมดุลิลลาฮ์')}</h2>
      <p class="lead">${esc(tr('{name} ทำพิธี{ritual}ครบทุกขั้นตอนแล้ว ขออัลลอฮ์ทรงรับการงานของคุณ', { name, ritual }))}</p>
      <blockquote>
        <p lang="ar" dir="rtl">وَأَتِمُّوا الْحَجَّ وَالْعُمْرَةَ لِلَّهِ</p>
        <p>${tr('"และจงทำฮัจญ์และอุมเราะฮ์ให้สมบูรณ์เพื่ออัลลอฮ์" — อัลบะเกาะเราะฮ์ 2:196')}</p>
      </blockquote>
      <ol class="done-list">${stages.map((s) => `<li>✓ ${s.icon} ${esc(s.title)}</li>`).join('')}</ol>
      <button class="btn accent cert-btn" id="certBtn">${tr('🎓 รับใบประกาศ')}</button>
      <div class="row">
        <button class="btn ghost" id="homeBtn">${tr('กลับหน้าแรก')}</button>
        <button class="btn primary" id="againBtn">${tr('ฝึกอีกครั้ง')}</button>
      </div>
    </div>`;
  $(root, '#progressFill').style.width = '100%';
  stopDuaSpeech();
  audio.sfx('complete');
  audio.narrate(tr('อัลฮัมดุลิลลาฮ์ คุณ{name} ทำพิธี{ritual}ครบทุกขั้นตอนแล้ว ขออัลลอฮ์ทรงรับการงานของคุณ', { name, ritual }));
  const certTask = import('../certificate');
  $(overlay, '#certBtn').onclick = () => {
    void certTask.then((m) => m.openCertificate(root, { ritual: ritualKey, name, stages }));
  };
  $(overlay, '#againBtn').onclick = () => { closeOverlays(); onRestart(); };
  $(overlay, '#homeBtn').onclick = () => location.reload();
}
