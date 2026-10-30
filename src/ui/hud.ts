import { localDua, type Dua } from '../content/duas';
import type { Beat } from '../journey/prayer';
import type { ActionHandle, Mission, Profile, Settings, StageDef } from '../journey/types';
import type { Saved } from '../journey/progress';
import type { Gender } from '../engine/player';
import * as audio from '../engine/audio';
import { openCertificate, ritualName } from './certificate';
import { getLang, setLang, tr, type Lang } from '../i18n';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const $ = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T;
/** The default name is saved in whichever language was active: show it in the current one. */
const isDefaultName = (n: string) => !n.trim() || n === 'ผู้แสวงบุญ' || n === 'Pilgrim';
const displayName = (n: string) => (isDefaultName(n) ? tr('ผู้แสวงบุญ') : n);

interface Nav { next(): void; back(): void; skip(): void; jump(i: number): void }

/** All DOM UI. Thai source strings live inline next to their markup, wrapped in tr() for English. */
export class Hud {
  readonly joystick: HTMLElement;
  readonly knob: HTMLElement;
  readonly jogBtn: HTMLElement;
  private readonly root: HTMLElement;
  private nav: Nav | null = null;
  private stageCount = 0;
  private toastBox: HTMLElement;
  private overlay: HTMLElement;

  constructor(root: HTMLElement, private readonly isTouch: boolean) {
    this.root = root;
    root.innerHTML = `
      <header class="topbar">
        <button class="icon-btn only-mobile" id="menuBtn" aria-label="${tr('รายการขั้นตอน')}">☰</button>
        <div class="brand"><span class="logo">🕋</span><div><b>${tr('จำลองอุมเราะฮ์และฮัจญ์')}</b><small>${tr('ฝึกพิธีแบบ 3 มิติ')}</small></div></div>
        <div class="progress" aria-label="${tr('ความคืบหน้า')}"><div id="progressFill"></div></div>
        <button class="icon-btn" id="settingsBtn" aria-label="${tr('ตั้งค่า')}">⚙️</button>
      </header>
      <aside class="sidebar" id="sidebar"><h3>${tr('ขั้นตอนอุมเราะฮ์')}</h3><ol id="stageList"></ol></aside>
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
          <button class="btn primary" id="nextBtn" disabled>${tr('ไปต่อ →')}</button>
        </nav>
      </section>
      <aside class="dua-card" id="duaCard" hidden>
        <div class="dua-head">
          <span class="badge" id="duaType"></span><b id="duaTitle"></b>
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
    this.joystick = $(root, '#joystick');
    this.knob = $(root, '#knob');
    this.jogBtn = $(root, '#jogBtn');
    this.toastBox = $(root, '#toasts');
    this.overlay = $(root, '#overlay');
    root.classList.toggle('touch', isTouch);

    $(root, '#nextBtn').onclick = () => this.nav?.next();
    $(root, '#backBtn').onclick = () => this.nav?.back();
    $(root, '#skipBtn').onclick = () => this.nav?.skip();
    $(root, '#duaClose').onclick = () => { $(root, '#duaCard').hidden = true; this.stopDuaSpeech(); };
    $(root, '#duaSpeak').onclick = () => this.speakDua();
    audio.onVoices(() => this.paintSpeak());
    // Subtle click for every button / toggle press.
    root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button, input[type="checkbox"]') as HTMLButtonElement | null;
      if (b && !b.disabled && b.id !== 'duaSpeak') audio.sfx('click');
    }, true);
    $(root, '#duaMin').onclick = () => $(root, '#duaCard').classList.toggle('min');
    $(root, '#menuBtn').onclick = () => $(root, '#sidebar').classList.toggle('open');
    $(root, '#sheetHandle').onclick = () => $(root, '#panel').classList.toggle('collapsed');
    setTimeout(() => $(root, '#controlsHint').classList.add('fade'), 12000);
    // Expose the panel height so phone controls can sit just above the bottom sheet.
    const panel = $(root, '#panel');
    if (this.isPhone()) panel.classList.add('collapsed');
    $(root, '.dua-head').addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      $(root, '#duaCard').classList.toggle('min');
    });
    new ResizeObserver(() => root.style.setProperty('--sheet-h', `${panel.offsetHeight}px`)).observe(panel);
  }

  onNav(n: Nav) { this.nav = n; }

  private isPhone() { return matchMedia('(max-width: 760px)').matches; }
  private duaTimer = 0;
  /** Thai name of the ritual being practised ("อุมเราะฮ์" or "ฮัจญ์"). */
  private ritual = 'อุมเราะฮ์';
  /** Du'a currently on the card and which part the 🔊 button reads next. */
  private curDua: Dua | null = null;
  private duaStep = 0;
  private duaSpeaking = false;

  /** Start screen. Resolves with the profile and the stage to start from. */
  showCreator(
    saved: Saved | null,
    stagesFor: (p: Profile) => StageDef[],
    available: { hajj: boolean; madinah: boolean },
  ): Promise<{ profile: Profile; stage: number }> {
    return new Promise((resolve) => {
      const p: Profile = saved
        ? { ...saved.profile }
        : { name: '', gender: 'male', mode: 'umrah', route: 'miqat-first', hajjType: 'tamattu' };
      if (p.mode === 'hajj' && !available.hajj) p.mode = 'umrah';
      const savedStage = saved ? stagesFor(saved.profile)[saved.stageIndex] : undefined;
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
          ${saved && savedStage ? `
            <div class="resume">
              <div><b>${tr('เดินทางต่อ')}</b><small>${esc(displayName(saved.profile.name))} · ${saved.profile.mode === 'hajj' ? tr('ฮัจญ์') : tr('อุมเราะฮ์')} · ${esc(tr('ขั้นที่ {n} {title}', { n: saved.stageIndex + 1, title: savedStage.title }))}</small></div>
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
              <button data-v="hajj" ${available.hajj ? '' : `disabled title="${tr('กำลังพัฒนา')}"`}>${tr('🏕️ ฮัจญ์')}${available.hajj ? '' : ` ${tr('(เร็ว ๆ นี้)')}`}</button>
            </div>
          </div>
          <div class="field" data-show="umrah"><span>${tr('เส้นทาง')}</span>
            <div class="seg" data-key="route">
              <button data-v="miqat-first">${tr('✈️ มีกอตก่อน')}</button>
              <button data-v="madinah-first" ${available.madinah ? '' : `disabled title="${tr('กำลังพัฒนา')}"`}>${tr('🕌 มะดีนะฮ์ก่อน')}</button>
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
      this.root.appendChild(el);
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
        el.querySelectorAll<HTMLElement>('.seg').forEach((seg) => {
          const key = seg.dataset.key as keyof Profile;
          seg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.classList.toggle('on', b.dataset.v === p[key]));
        });
        el.querySelectorAll<HTMLElement>('[data-show]').forEach((f) => { f.hidden = f.dataset.show !== p.mode; });
        el.querySelectorAll<HTMLElement>('[data-note]').forEach((n) => { n.textContent = NOTES[n.dataset.note!][p[n.dataset.note as 'route' | 'hajjType']]; });
      };
      el.querySelectorAll<HTMLElement>('.seg').forEach((seg) => seg.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
        b.onclick = () => { (p as unknown as Record<string, string>)[seg.dataset.key!] = b.dataset.v!; paint(); };
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

  setStages(stages: StageDef[], profile: Profile) {
    this.stageCount = stages.length;
    this.ritual = profile.mode === 'hajj' ? 'ฮัจญ์' : 'อุมเราะฮ์';
    $(this.root, '#sidebar h3').textContent = profile.mode === 'hajj' ? tr('ขั้นตอนฮัจญ์') : tr('ขั้นตอนอุมเราะฮ์');
    const list = $(this.root, '#stageList');
    list.innerHTML = stages.map((s, i) => `<li><button data-i="${i}"><span class="ico">${s.icon}</span><span>${esc(s.title)}</span></button></li>`).join('');
    list.querySelectorAll('button').forEach((b) => (b.onclick = () => {
      this.nav?.jump(Number(b.dataset.i));
      $(this.root, '#sidebar').classList.remove('open');
    }));
  }

  setStage(i: number, def: StageDef, profile: Profile) {
    const r = this.root;
    $(r, '#stepPill').textContent = tr('ขั้นที่ {i} จาก {n}', { i: i + 1, n: this.stageCount });
    $(r, '#stageTitle').textContent = `${def.icon} ${def.title}`;
    $(r, '#stageArabic').textContent = def.arabic;
    $(r, '#stageDesc').textContent = def.desc;
    $(r, '#stageTip').textContent = def.tip(profile);
    $(r, '#progressFill').style.width = `${(i / this.stageCount) * 100}%`;
    r.querySelectorAll('#stageList li').forEach((li, k) => {
      li.classList.toggle('active', k === i);
      li.classList.toggle('done', k < i);
    });
    $<HTMLButtonElement>(r, '#backBtn').disabled = i === 0;
    const next = $<HTMLButtonElement>(r, '#nextBtn');
    next.disabled = true;
    next.classList.remove('pulse');
    next.textContent = tr('ไปต่อ →');
    $(r, '#mission').classList.remove('done');
    $(r, '#actions').innerHTML = '';
    $(r, '#duaCard').hidden = true;
    this.stopDuaSpeech();
    audio.narrate(tr('ขั้นที่ {n} {title}. {desc}', { n: i + 1, title: def.title, desc: def.desc }));
  }

  setMission(m: Mission) {
    $(this.root, '#missionLabel').textContent = `🎯 ${m.label}`;
    $(this.root, '#missionText').textContent = m.text;
    this.setHint(m.hint);
  }

  setHint(t: string) { $(this.root, '#missionHint').textContent = t; }

  setCount(c: number, total: number) {
    $(this.root, '#missionCount').textContent = `${c} / ${total}`;
    $(this.root, '#missionFill').style.width = `${(c / total) * 100}%`;
  }

  missionDone(last: boolean) {
    const next = $<HTMLButtonElement>(this.root, '#nextBtn');
    next.disabled = false;
    next.classList.add('pulse');
    if (last) next.textContent = tr('จบ{ritual} ✨', { ritual: ritualName(this.ritual) });
    $(this.root, '#mission').classList.add('done');
    this.setHint(tr('ภารกิจสำเร็จ กด "ไปต่อ" เพื่อไปขั้นถัดไป'));
    this.toast(tr('✅ ภารกิจสำเร็จ'), 'ok', false);
    audio.sfx('complete');
    this.stopDuaSpeech();
    audio.narrate(last
      ? tr('ภารกิจสำเร็จ คุณทำครบทุกขั้นตอนของ{ritual}แล้ว กดปุ่ม จบ{ritual} ได้เลย', { ritual: ritualName(this.ritual) })
      : tr('ภารกิจสำเร็จ กดปุ่ม ไปต่อ เพื่อไปขั้นถัดไป'));
  }

  toast(msg: string, kind: 'ok' | 'warn' | 'info' = 'info', sound = true) {
    if (sound && kind === 'ok') audio.sfx('chime');
    if (sound && kind === 'warn') audio.sfx('buzz');
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = msg;
    this.toastBox.appendChild(t);
    while (this.toastBox.children.length > 3) this.toastBox.firstElementChild!.remove();
    setTimeout(() => t.classList.add('out'), 4200);
    setTimeout(() => t.remove(), 4700);
  }

  dua(d: Dua) {
    const r = this.root;
    const card = $(r, '#duaCard');
    const t = localDua(d);
    $(r, '#duaType').textContent = t.typeName;
    $(r, '#duaType').dataset.type = d.type;
    $(r, '#duaTitle').textContent = t.title;
    const ar = $(r, '#duaArabic');
    ar.textContent = d.arabic;
    ar.hidden = !d.arabic;
    const rd = $(r, '#duaReading');
    rd.textContent = t.reading ? tr('คำอ่าน: {text}', { text: t.reading }) : '';
    rd.hidden = !t.reading;
    $(r, '#duaMeaning').textContent = d.arabic ? tr('ความหมาย: {text}', { text: t.meaning }) : t.meaning;
    const note = $(r, '#duaNote');
    note.textContent = t.note ? `💡 ${t.note}` : '';
    note.hidden = !t.note;
    $(r, '#duaSrc').textContent = tr('ที่มา: {source} · {grade}', { source: t.source, grade: t.grade });
    card.hidden = false;
    card.classList.remove('min', 'pop');
    void card.offsetWidth;
    card.classList.add('pop');
    this.stopDuaSpeech();
    this.curDua = d;
    this.duaStep = 0;
    this.paintSpeak();
    audio.sfx('rise');
    // On phones the card would hide the scene: shrink it to its title after a while.
    clearTimeout(this.duaTimer);
    if (this.isPhone()) this.duaTimer = window.setTimeout(() => card.classList.add('min'), 8000);
  }

  /**
   * Parts of the current du'a that can be read aloud: Arabic (or the reading), then the meaning, in the UI language.
   * Each press reads the next part (interrupting the current one); the label names what comes next.
   */
  private duaParts(): { text: string; lang: audio.VoiceLang; label: string }[] {
    const d = this.curDua;
    if (!d) return [];
    const t = localDua(d);
    const nl = audio.narrationLang();
    const parts: { text: string; lang: audio.VoiceLang; label: string }[] = [];
    if (d.arabic && audio.hasVoice('ar')) parts.push({ text: d.arabic, lang: 'ar', label: d.type === 'quran' ? tr('ฟังอายะฮ์') : tr('ฟังภาษาอาหรับ') });
    else if (t.reading && audio.hasVoice(nl)) parts.push({ text: t.reading, lang: nl, label: tr('ฟังคำอ่าน') });
    if (t.meaning && audio.hasVoice(nl)) parts.push({ text: t.meaning, lang: nl, label: d.arabic ? tr('ฟังความหมาย') : tr('ฟัง') });
    return parts;
  }

  private paintSpeak() {
    const btn = $<HTMLButtonElement>(this.root, '#duaSpeak');
    const parts = this.duaParts();
    btn.hidden = parts.length === 0;
    if (!parts.length) return;
    const next = parts[this.duaStep % parts.length];
    btn.textContent = `🔊 ${next.label}`;
    btn.classList.toggle('on', this.duaSpeaking);
    btn.setAttribute('aria-label', btn.textContent);
  }

  private speakDua() {
    const parts = this.duaParts();
    if (!parts.length) return;
    const part = parts[this.duaStep % parts.length];
    clearTimeout(this.duaTimer); // keep the card open while it is being read
    this.duaSpeaking = audio.speak(part.text, part.lang, () => {
      this.duaSpeaking = false;
      this.paintSpeak();
    });
    if (this.duaSpeaking) this.duaStep = (this.duaStep + 1) % parts.length;
    this.paintSpeak();
  }

  private stopDuaSpeech() {
    audio.stopSpeech();
    this.duaSpeaking = false;
    this.paintSpeak();
  }

  action(label: string, onClick: () => void): ActionHandle {
    const b = document.createElement('button');
    b.className = 'btn accent';
    b.textContent = label;
    b.onclick = onClick;
    $(this.root, '#actions').appendChild(b);
    return {
      setEnabled: (v) => { b.disabled = !v; },
      setLabel: (s) => { b.textContent = s; },
      remove: () => b.remove(),
    };
  }

  isOverlayOpen() { return !this.overlay.hidden; }

  closeOverlays() {
    this.overlay.hidden = true;
    this.overlay.innerHTML = '';
  }

  /** Step-by-step prayer guide with a minimum time per position. */
  prayer(beats: Beat[], onBeat: (b: Beat) => void, onDone: () => void) {
    let i = 0;
    let timer = 0;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
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
      $(this.overlay, '#pzStep').textContent = tr('ละหมาด 2 ร็อกอะฮ์ · {i} / {n}', { i: i + 1, n: beats.length });
      $(this.overlay, '#pzTitle').textContent = b.title;
      $(this.overlay, '#pzText').textContent = b.text;
      const btn = $<HTMLButtonElement>(this.overlay, '#pzNext');
      btn.textContent = i === beats.length - 1 ? tr('เสร็จสิ้น') : tr('ท่าถัดไป →');
      btn.disabled = true;
      const fill = $(this.overlay, '#pzFill');
      fill.style.transition = 'none';
      fill.style.width = '0%';
      void fill.offsetWidth;
      fill.style.transition = `width ${b.min}s linear`;
      fill.style.width = '100%';
      clearTimeout(timer);
      timer = window.setTimeout(() => { btn.disabled = false; }, b.min * 1000);
    };
    $(this.overlay, '#pzNext').onclick = () => {
      if (i < beats.length - 1) { i++; show(); return; }
      clearTimeout(timer);
      this.closeOverlays();
      onDone();
    };
    show();
  }

  /** Drink Zamzam in three sips. */
  zamzam(onDone: () => void) {
    let sips = 0;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <div class="modal zamzam">
        <div class="water">💧</div>
        <h3>${tr('ดื่มน้ำซัมซัม')}</h3>
        <p>${tr('กล่าว "บิสมิลลาฮ์" หันหน้าไปทางกิบลัต ดื่มสามอึก แล้วกล่าว "อัลฮัมดุลิลลาฮ์" ขอดุอาอ์ตามที่ต้องการขณะดื่ม')}</p>
        <button class="btn primary" id="zzBtn">${tr('ดื่มอึกที่ {n} / 3', { n: 1 })}</button>
      </div>`;
    const btn = $<HTMLButtonElement>(this.overlay, '#zzBtn');
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
      setTimeout(() => { this.closeOverlays(); onDone(); }, 900);
    };
  }

  completion(stages: StageDef[], profile: Profile, onRestart: () => void) {
    const name = displayName(profile.name);
    const ritual = ritualName(this.ritual);
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
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
    $(this.root, '#progressFill').style.width = '100%';
    this.stopDuaSpeech();
    audio.sfx('complete');
    audio.narrate(tr('อัลฮัมดุลิลลาฮ์ คุณ{name} ทำพิธี{ritual}ครบทุกขั้นตอนแล้ว ขออัลลอฮ์ทรงรับการงานของคุณ', { name, ritual }));
    $(this.overlay, '#certBtn').onclick = () => openCertificate(this.root, { ritual: this.ritual, name, stages });
    $(this.overlay, '#againBtn').onclick = () => { this.closeOverlays(); onRestart(); };
    $(this.overlay, '#homeBtn').onclick = () => location.reload();
  }

  onSettings(get: () => Settings, set: (s: Settings) => void, reset: () => void) {
    audio.bindSettings(get);
    $(this.root, '#settingsBtn').onclick = () => {
      const s = get();
      const tts = audio.ttsSupported();
      const nl = audio.narrationLang();
      const voiceRow = (lang: audio.VoiceLang, label: string) => audio.hasVoice(lang)
        ? `<li class="ok">✓ ${label}: ${esc(audio.voiceName(lang))}</li>`
        : `<li>✗ ${label}: ${tr('ไม่พบในเครื่องนี้')}</li>`;
      this.overlay.hidden = false;
      this.overlay.innerHTML = `
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
            <button class="btn ghost" id="resetBtn">${tr('ล้างความคืบหน้า')}</button>
            <button class="btn primary" id="closeSet">${tr('ปิด')}</button>
          </div>
        </div>`;
      const ov = this.overlay;
      let rate: Settings['rate'] = s.rate;
      const collect = (): Settings => ({
        ...get(),
        floorLine: $<HTMLInputElement>(ov, '#setLine').checked,
        narration: $<HTMLInputElement>(ov, '#setNarr').checked,
        sfx: $<HTMLInputElement>(ov, '#setSfx').checked,
        rate,
      });
      const apply = () => {
        const next = collect();
        set(next);
        if (!next.narration && !this.duaSpeaking) audio.stopSpeech();
      };
      ov.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((c) => { c.onchange = apply; });
      ov.querySelectorAll<HTMLButtonElement>('#setRate button').forEach((b) => {
        b.onclick = () => {
          rate = b.dataset.v === 'slow' ? 'slow' : 'normal';
          ov.querySelectorAll('#setRate button').forEach((x) => x.classList.toggle('on', x === b));
          apply();
        };
      });
      const test = ov.querySelector<HTMLButtonElement>('#testVoice');
      let tested = false;
      if (test) test.onclick = () => { tested = audio.speak(tr('สวัสดี นี่คือตัวอย่างเสียงบรรยายภาษาไทย'), nl) || tested; };
      // Switching language rebuilds everything by reloading; the journey resumes from the saved stage.
      ov.querySelectorAll<HTMLButtonElement>('#setLang button').forEach((b) => {
        b.onclick = () => {
          if (b.dataset.lang === getLang()) return;
          apply();
          audio.stopSpeech();
          setLang(b.dataset.lang as Lang);
          location.reload();
        };
      });
      $(ov, '#closeSet').onclick = () => {
        apply();
        if (tested) audio.stopSpeech();
        this.closeOverlays();
      };
      $(ov, '#resetBtn').onclick = () => { reset(); location.reload(); };
    };
  }
}
