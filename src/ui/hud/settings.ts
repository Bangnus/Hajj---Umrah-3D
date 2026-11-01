import type { Settings } from '../../journey/types';
import * as audio from '../../engine/audio';
import { getLang, setLang, tr, type Lang } from '../../i18n';
import { $, esc } from './template';

export function bindSettingsModal(
  root: HTMLElement,
  overlay: HTMLElement,
  closeOverlays: () => void,
  isDuaSpeaking: () => boolean,
  get: () => Settings,
  set: (s: Settings) => void,
  reset: () => void,
) {
  audio.bindSettings(get);
  $(root, '#settingsBtn').onclick = () => {
    const s = get();
    const tts = audio.ttsSupported();
    const nl = audio.narrationLang();
    const voiceRow = (lang: audio.VoiceLang, label: string) => audio.hasVoice(lang)
      ? `<li class="ok">✓ ${label}: ${esc(audio.voiceName(lang))}</li>`
      : `<li>✗ ${label}: ${tr('ไม่พบในเครื่องนี้')}</li>`;
    overlay.hidden = false;
    overlay.innerHTML = `
      <div class="modal settings">
        <h3>${tr('ตั้งค่า')}</h3>
        <div class="field"><span>${tr('ภาษา')}</span>
          <div class="seg" id="setLang">
            <button data-lang="th" class="${getLang() === 'th' ? 'on' : ''}">ไทย</button>
            <button data-lang="en" class="${getLang() === 'en' ? 'on' : ''}">English</button>
          </div>
          <small class="field-note">${tr('เมื่อเปลี่ยนภาษา หน้าจะโหลดใหม่ ความคืบหน้าของคุณยังอยู่ (กลับมาที่ขั้นตอนเดิมได้)')}</small>
        </div>
        <label class="switch"><input type="checkbox" id="setLine" ${s.floorLine ? 'checked' : ''}/>
          <span><b>${tr('เส้นนำทางบนลานเฏาะวาฟ')}</b><small>${tr('ของจริงไม่มีเส้นบนพื้น จุดเริ่มแต่ละรอบใช้ไฟสีเขียวบนผนัง (มีผลเมื่อเข้าฉากมัสยิดครั้งถัดไป)')}</small></span></label>
        <label class="switch"><input type="checkbox" id="setNarr" ${s.narration ? 'checked' : ''} ${tts ? '' : 'disabled'}/>
          <span><b>${tr('เสียงบรรยายภาษาไทย')}</b><small>${tr('อ่านชื่อและคำอธิบายเมื่อเริ่มแต่ละขั้นตอน และแจ้งเมื่อภารกิจสำเร็จ')}</small></span></label>
        <label class="switch"><input type="checkbox" id="setSfx" ${s.sfx ? 'checked' : ''}/>
          <span><b>${tr('เสียงประกอบ')}</b><small>${tr('เสียงกระดิ่งเมื่อสำเร็จ เสียงเตือน และเสียงกดปุ่ม')}</small></span></label>
        <div class="field" ${tts ? '' : 'hidden'}><span>${tr('ความเร็วเสียงอ่าน')}</span>
          <div class="seg" id="setRate">
            <button data-v="slow" class="${s.rate === 'slow' ? 'on' : ''}">${tr('🐢 ช้า')}</button>
            <button data-v="normal" class="${s.rate === 'normal' ? 'on' : ''}">${tr('ปกติ')}</button>
          </div>
        </div>
        <div class="voice-box">
          ${tts ? `<ul id="voiceList">${voiceRow(nl, nl === 'en' ? tr('เสียงภาษาอังกฤษ') : tr('เสียงภาษาไทย'))}${voiceRow('ar', tr('เสียงภาษาอาหรับ'))}</ul>
            <button class="btn ghost small" id="testVoice" ${audio.hasVoice(nl) ? '' : 'disabled'}>${tr('🔊 ทดลองเสียง')}</button>`
            : `<p>${tr('เบราว์เซอร์นี้ไม่รองรับการอ่านออกเสียง จึงปิดเสียงบรรยายไว้')}</p>`}
          <p>${tr('ตอนนี้ใช้เสียงอ่านอัตโนมัติของเบราว์เซอร์ (TTS) เป็นการชั่วคราว เราวางแผนจะใช้เสียงตัลบิยะฮ์และดุอาอ์ที่บันทึกโดยผู้อ่านที่มีความรู้ และเสียงบรรยายภาษาไทยโดยผู้บรรยายมืออาชีพ')}</p>
        </div>
        <div class="row">
          <button class="btn ghost" id="resetBtn">🔄 ${tr('เริ่มการเดินทางใหม่')}</button>
          <button class="btn primary" id="closeSet">${tr('ปิด')}</button>
        </div>
      </div>`;
    let rate: Settings['rate'] = s.rate;
    const collect = (): Settings => ({
      ...get(),
      floorLine: $<HTMLInputElement>(overlay, '#setLine').checked,
      narration: $<HTMLInputElement>(overlay, '#setNarr').checked,
      sfx: $<HTMLInputElement>(overlay, '#setSfx').checked,
      rate,
    });
    const apply = () => {
      const next = collect();
      set(next);
      if (!next.narration && !isDuaSpeaking()) audio.stopSpeech();
    };
    overlay.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((c) => { c.onchange = apply; });
    overlay.querySelectorAll<HTMLButtonElement>('#setRate button').forEach((b) => {
      b.onclick = () => {
        rate = b.dataset.v === 'slow' ? 'slow' : 'normal';
        overlay.querySelectorAll('#setRate button').forEach((x) => x.classList.toggle('on', x === b));
        apply();
      };
    });
    const test = overlay.querySelector<HTMLButtonElement>('#testVoice');
    let tested = false;
    if (test) test.onclick = () => { tested = audio.speak(tr('สวัสดี นี่คือตัวอย่างเสียงบรรยายภาษาไทย'), nl) || tested; };
    overlay.querySelectorAll<HTMLButtonElement>('#setLang button').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.lang === getLang()) return;
        apply();
        audio.stopSpeech();
        setLang(b.dataset.lang as Lang);
        location.reload();
      };
    });
    $(overlay, '#closeSet').onclick = () => {
      apply();
      if (tested) audio.stopSpeech();
      closeOverlays();
    };
    $(overlay, '#resetBtn').onclick = () => {
      if (window.confirm(tr('ต้องการเริ่มการเดินทางใหม่ตั้งแต่ขั้นตอนแรกใช่หรือไม่?'))) {
        reset();
        window.location.replace(window.location.pathname + '?new=1');
      }
    };
  };
}
