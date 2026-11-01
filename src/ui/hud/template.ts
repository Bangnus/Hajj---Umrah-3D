import * as audio from '../../engine/audio';
import { tr } from '../../i18n';

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const $ = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T;
export const isDefaultName = (n: string) => !n.trim() || n === 'ผู้แสวงบุญ' || n === 'Pilgrim';
export const displayName = (n: string) => (isDefaultName(n) ? tr('ผู้แสวงบุญ') : n);
export const ritualName = (ritual: string) => (ritual === 'ฮัจญ์' ? tr('ฮัจญ์') : tr('อุมเราะฮ์'));
export const isPhone = () => matchMedia('(max-width: 760px)').matches;

export interface Nav { next(): void; back(): void; skip(): void; jump(i: number): void }

export function bindShellEvents(root: HTMLElement, getNav: () => Nav | null) {
  $(root, '#nextBtn').onclick = () => getNav()?.next();
  $(root, '#backBtn').onclick = () => getNav()?.back();
  $(root, '#skipBtn').onclick = () => getNav()?.skip();
  root.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button, input[type="checkbox"]') as HTMLButtonElement | null;
    if (b && !b.disabled && b.id !== 'duaSpeak') audio.sfx('click');
  }, true);
  $(root, '#duaMin').onclick = () => $(root, '#duaCard').classList.toggle('min');
  $(root, '#menuBtn').onclick = () => $(root, '#sidebar').classList.toggle('open');
  $(root, '#sheetHandle').onclick = () => $(root, '#panel').classList.toggle('collapsed');
  const resetBtn = root.querySelector<HTMLButtonElement>('#resetJourneyBtn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (window.confirm(tr('ต้องการเริ่มการเดินทางใหม่ตั้งแต่ขั้นตอนแรกใช่หรือไม่?'))) {
        localStorage.removeItem('umrahsim:progress:v1');
        window.location.replace(window.location.pathname + '?new=1');
      }
    };
  }
  setTimeout(() => $(root, '#controlsHint').classList.add('fade'), 12000);
  const panel = $(root, '#panel');
  if (isPhone()) panel.classList.add('collapsed');
  $(root, '.dua-head').addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    $(root, '#duaCard').classList.toggle('min');
  });
  new ResizeObserver(() => root.style.setProperty('--sheet-h', `${panel.offsetHeight}px`)).observe(panel);
}

export function hudMarkup(isTouch: boolean): string {
  return `
      <header class="topbar">
        <button class="icon-btn only-mobile" id="menuBtn" aria-label="${tr('รายการขั้นตอน')}">☰</button>
        <div class="brand"><span class="logo">🕋</span><div><b>${tr('ฮัจญ์ & อุมเราะฮ์ 3D')}</b><small>${tr('ฝึกพิธีแบบ 3 มิติ')}</small></div></div>
        <div class="progress" aria-label="${tr('ความคืบหน้า')}"><div id="progressFill"></div></div>
        <button class="icon-btn" id="settingsBtn" aria-label="${tr('ตั้งค่า')}">⚙️</button>
      </header>
      <aside class="sidebar" id="sidebar">
        <h3>${tr('ขั้นตอนอุมเราะฮ์')}</h3>
        <ol id="stageList"></ol>
        <div class="sidebar-footer">
          <button class="btn ghost small w-full" id="resetJourneyBtn">🔄 ${tr('เริ่มการเดินทางใหม่')}</button>
        </div>
      </aside>
      <section class="panel" id="panel">
        <button class="sheet-handle only-mobile" id="sheetHandle" aria-label="${tr('ย่อ/ขยาย')}"></button>
        <div class="step-pill" id="stepPill"></div>
        <h2 id="stageTitle"></h2>
        <div class="arabic-title" id="stageArabic" lang="ar" dir="rtl"></div>
        <p class="desc" id="stageDesc"></p>
        <div class="mission" id="mission">
          <div class="mission-head"><span id="missionLabel"></span><b id="missionCount"></b></div>
          <div class="bar"><div id="missionFill"></div></div>
          <p id="missionText"></p>
          <p class="hint" id="missionHint"></p>
          <div class="actions" id="actions"></div>
        </div>
        <details class="tip"><summary>${tr('💡 เคล็ดลับ')}</summary><p id="stageTip"></p></details>
        <nav class="panel-nav">
          <button class="btn ghost" id="backBtn">${tr('← ย้อนกลับ')}</button>
          <button class="btn ghost small" id="skipBtn" title="${tr('ข้ามภารกิจนี้')}">${tr('ข้าม')}</button>
          <div class="next-wrap">
            <span class="next-prompt" id="nextPrompt">👉 ${tr('กดไปต่อ')}</span>
            <button class="btn primary" id="nextBtn" disabled>${tr('ไปต่อ →')}</button>
          </div>
        </nav>
      </section>
      <aside class="dua-card" id="duaCard" hidden>
        <div class="dua-head">
          <span class="badge" id="duaType"></span><b id="duaTitle"></b>
          <div class="dua-nav" id="duaNav">
            <button class="icon-btn small" id="duaPrev" aria-label="${tr('ก่อนหน้า')}" title="${tr('ดุอาอ์ก่อนหน้า')}">◀</button>
            <span class="dua-counter" id="duaCounter">1/1</span>
            <button class="icon-btn small" id="duaNext" aria-label="${tr('ถัดไป')}" title="${tr('ดุอาอ์ถัดไป')}">▶</button>
          </div>
          <button class="speak-btn" id="duaSpeak" hidden></button>
          <button class="icon-btn small" id="duaMin" aria-label="${tr('ย่อ')}">–</button>
          <button class="icon-btn small" id="duaClose" aria-label="${tr('ปิด')}">×</button>
        </div>
        <div class="dua-body" id="duaBody">
          <p class="ar" id="duaArabic" lang="ar" dir="rtl"></p>
          <p class="reading" id="duaReading"></p>
          <p class="meaning" id="duaMeaning"></p>
          <p class="note" id="duaNote"></p>
          <p class="src" id="duaSrc"></p>
        </div>
      </aside>
      <div class="toasts" id="toasts" aria-live="polite"></div>
      <div class="controls-hint" id="controlsHint">${isTouch
        ? tr('จอยซ้ายล่างเพื่อเดิน · ปุ่มวิ่ง · ลากหน้าจอเพื่อหมุนกล้อง')
        : tr('<kbd>W A S D</kbd> หรือลูกศร เดิน · <kbd>Shift</kbd> วิ่ง · ลากเมาส์หมุนกล้อง · ล้อเมาส์ซูม')}</div>
      <div class="joystick" id="joystick" aria-label="${tr('จอยสำหรับเดิน')}"><div class="knob" id="knob"></div></div>
      <button class="jog-btn" id="jogBtn">${tr('🏃 วิ่ง')}</button>
      <div class="overlay" id="overlay" hidden></div>
    `;
}
