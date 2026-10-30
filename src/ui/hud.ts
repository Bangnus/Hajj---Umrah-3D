import { DUA_TYPE_TH, type Dua } from '../content/duas';
import type { Beat } from '../journey/prayer';
import type { ActionHandle, Mission, Profile, Settings, StageDef } from '../journey/types';
import type { Saved } from '../journey/progress';
import type { Gender } from '../engine/player';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const $ = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T;

interface Nav { next(): void; back(): void; skip(): void; jump(i: number): void }

/** All DOM UI. Thai only for the MVP; strings live inline next to their markup. */
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
        <button class="icon-btn only-mobile" id="menuBtn" aria-label="รายการขั้นตอน">☰</button>
        <div class="brand"><span class="logo">🕋</span><div><b>จำลองอุมเราะฮ์</b><small>ฝึกพิธีแบบ 3 มิติ</small></div></div>
        <div class="progress" aria-label="ความคืบหน้า"><div id="progressFill"></div></div>
        <button class="icon-btn" id="settingsBtn" aria-label="ตั้งค่า">⚙️</button>
      </header>
      <aside class="sidebar" id="sidebar"><h3>ขั้นตอนอุมเราะฮ์</h3><ol id="stageList"></ol></aside>
      <section class="panel" id="panel">
        <button class="sheet-handle only-mobile" id="sheetHandle" aria-label="ย่อ/ขยาย"></button>
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
        <details class="tip"><summary>💡 เคล็ดลับ</summary><p id="stageTip"></p></details>
        <nav class="panel-nav">
          <button class="btn ghost" id="backBtn">← ย้อนกลับ</button>
          <button class="btn ghost small" id="skipBtn" title="ข้ามภารกิจนี้">ข้าม</button>
          <button class="btn primary" id="nextBtn" disabled>ไปต่อ →</button>
        </nav>
      </section>
      <aside class="dua-card" id="duaCard" hidden>
        <div class="dua-head">
          <span class="badge" id="duaType"></span><b id="duaTitle"></b>
          <button class="icon-btn small" id="duaMin" aria-label="ย่อ">–</button>
          <button class="icon-btn small" id="duaClose" aria-label="ปิด">×</button>
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
        ? 'จอยซ้ายล่างเพื่อเดิน · ปุ่มวิ่ง · ลากหน้าจอเพื่อหมุนกล้อง'
        : '<kbd>W A S D</kbd> หรือลูกศร เดิน · <kbd>Shift</kbd> วิ่ง · ลากเมาส์หมุนกล้อง · ล้อเมาส์ซูม'}</div>
      <div class="joystick" id="joystick"><div class="knob" id="knob"></div></div>
      <button class="jog-btn" id="jogBtn">🏃 วิ่ง</button>
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
    $(root, '#duaClose').onclick = () => { $(root, '#duaCard').hidden = true; };
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

  /** Start screen. Resolves with the profile and the stage to start from. */
  showCreator(saved: Saved | null, stages: StageDef[]): Promise<{ profile: Profile; stage: number }> {
    return new Promise((resolve) => {
      let gender: Gender = saved?.profile.gender ?? 'male';
      const el = document.createElement('div');
      el.className = 'creator';
      el.innerHTML = `
        <div class="creator-card">
          <div class="bismillah" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
          <h1>จำลองอุมเราะฮ์ 3 มิติ</h1>
          <p class="lead">ฝึกพิธีอุมเราะฮ์ทีละขั้นตอน ตั้งแต่เตรียมตัวที่บ้านจนถึงตะฮัลลุล พร้อมดุอาอ์ คำอ่าน และความหมายภาษาไทย</p>
          ${saved ? `
            <div class="resume">
              <div><b>เดินทางต่อ</b><small>${esc(saved.profile.name || 'ผู้แสวงบุญ')} · ขั้นที่ ${saved.stageIndex + 1} ${esc(stages[saved.stageIndex]?.title ?? '')}</small></div>
              <button class="btn primary" id="resumeBtn">ทำต่อ →</button>
            </div>` : ''}
          <label class="field"><span>ชื่อของคุณ</span><input id="nameInput" maxlength="16" placeholder="ผู้แสวงบุญ" value="${esc(saved?.profile.name ?? '')}" /></label>
          <div class="field"><span>เพศ (มีผลต่อชุดอิห์รอมและข้อปฏิบัติบางอย่าง)</span>
            <div class="seg" id="genderSeg">
              <button data-g="male">👳 ชาย</button>
              <button data-g="female">🧕 หญิง</button>
            </div>
          </div>
          <button class="btn primary big" id="startBtn">เริ่มเดินทาง ${saved ? 'ใหม่' : ''} →</button>
          <p class="disclaimer">เพื่อการเรียนรู้เบื้องต้นเท่านั้น ควรศึกษารายละเอียดเพิ่มเติมกับผู้รู้หรือคณะของคุณ</p>
        </div>`;
      this.root.appendChild(el);
      const seg = $(el, '#genderSeg');
      const paint = () => seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.g === gender));
      seg.querySelectorAll('button').forEach((b) => (b.onclick = () => { gender = b.dataset.g as Gender; paint(); }));
      paint();
      const done = (stage: number) => {
        const name = ($<HTMLInputElement>(el, '#nameInput').value.trim() || 'ผู้แสวงบุญ').slice(0, 16);
        el.remove();
        resolve({ profile: { name, gender }, stage });
      };
      $(el, '#startBtn').onclick = () => done(0);
      const rb = el.querySelector<HTMLElement>('#resumeBtn');
      if (rb && saved) rb.onclick = () => { gender = saved.profile.gender; done(saved.stageIndex); };
    });
  }

  setStages(stages: StageDef[]) {
    this.stageCount = stages.length;
    const list = $(this.root, '#stageList');
    list.innerHTML = stages.map((s, i) => `<li><button data-i="${i}"><span class="ico">${s.icon}</span><span>${esc(s.title)}</span></button></li>`).join('');
    list.querySelectorAll('button').forEach((b) => (b.onclick = () => {
      this.nav?.jump(Number(b.dataset.i));
      $(this.root, '#sidebar').classList.remove('open');
    }));
  }

  setStage(i: number, def: StageDef, profile: Profile) {
    const r = this.root;
    $(r, '#stepPill').textContent = `ขั้นที่ ${i + 1} จาก ${this.stageCount}`;
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
    next.textContent = 'ไปต่อ →';
    $(r, '#mission').classList.remove('done');
    $(r, '#actions').innerHTML = '';
    $(r, '#duaCard').hidden = true;
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
    if (last) next.textContent = 'จบอุมเราะฮ์ ✨';
    $(this.root, '#mission').classList.add('done');
    this.setHint('ภารกิจสำเร็จ กด "ไปต่อ" เพื่อไปขั้นถัดไป');
    this.toast('✅ ภารกิจสำเร็จ', 'ok');
  }

  toast(msg: string, kind: 'ok' | 'warn' | 'info' = 'info') {
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
    $(r, '#duaType').textContent = DUA_TYPE_TH[d.type];
    $(r, '#duaType').dataset.type = d.type;
    $(r, '#duaTitle').textContent = d.title_th;
    const ar = $(r, '#duaArabic');
    ar.textContent = d.arabic;
    ar.hidden = !d.arabic;
    const rd = $(r, '#duaReading');
    rd.textContent = d.reading_th ? `คำอ่าน: ${d.reading_th}` : '';
    rd.hidden = !d.reading_th;
    $(r, '#duaMeaning').textContent = d.arabic ? `ความหมาย: ${d.meaning_th}` : d.meaning_th;
    const note = $(r, '#duaNote');
    note.textContent = d.note_th ? `💡 ${d.note_th}` : '';
    note.hidden = !d.note_th;
    $(r, '#duaSrc').textContent = `ที่มา: ${d.source} · ${d.grade_th}`;
    card.hidden = false;
    card.classList.remove('min', 'pop');
    void card.offsetWidth;
    card.classList.add('pop');
    // On phones the card would hide the scene: shrink it to its title after a while.
    clearTimeout(this.duaTimer);
    if (this.isPhone()) this.duaTimer = window.setTimeout(() => card.classList.add('min'), 8000);
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
      $(this.overlay, '#pzStep').textContent = `ละหมาด 2 ร็อกอะฮ์ · ${i + 1} / ${beats.length}`;
      $(this.overlay, '#pzTitle').textContent = b.title;
      $(this.overlay, '#pzText').textContent = b.text;
      const btn = $<HTMLButtonElement>(this.overlay, '#pzNext');
      btn.textContent = i === beats.length - 1 ? 'เสร็จสิ้น' : 'ท่าถัดไป →';
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
        <h3>ดื่มน้ำซัมซัม</h3>
        <p>กล่าว "บิสมิลลาฮ์" หันหน้าไปทางกิบลัต ดื่มสามอึก แล้วกล่าว "อัลฮัมดุลิลลาฮ์" ขอดุอาอ์ตามที่ต้องการขณะดื่ม</p>
        <button class="btn primary" id="zzBtn">ดื่มอึกที่ 1 / 3</button>
      </div>`;
    const btn = $<HTMLButtonElement>(this.overlay, '#zzBtn');
    btn.onclick = () => {
      sips++;
      if (sips < 3) {
        btn.disabled = true;
        btn.textContent = `ดื่มอึกที่ ${sips + 1} / 3`;
        setTimeout(() => { btn.disabled = false; }, 1200);
        return;
      }
      btn.textContent = 'อัลฮัมดุลิลลาฮ์ ✓';
      btn.disabled = true;
      setTimeout(() => { this.closeOverlays(); onDone(); }, 900);
    };
  }

  completion(stages: StageDef[], profile: Profile, onRestart: () => void) {
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <div class="modal complete">
        <div class="big-ar" lang="ar" dir="rtl">الْحَمْدُ لِلَّهِ</div>
        <h2>อัลฮัมดุลิลลาฮ์</h2>
        <p class="lead">${esc(profile.name)} ทำพิธีอุมเราะฮ์ครบทุกขั้นตอนแล้ว ขออัลลอฮ์ทรงรับการงานของคุณ</p>
        <blockquote>
          <p lang="ar" dir="rtl">وَأَتِمُّوا الْحَجَّ وَالْعُمْرَةَ لِلَّهِ</p>
          <p>"และจงทำฮัจญ์และอุมเราะฮ์ให้สมบูรณ์เพื่ออัลลอฮ์" — อัลบะเกาะเราะฮ์ 2:196</p>
        </blockquote>
        <ol class="done-list">${stages.map((s) => `<li>✓ ${s.icon} ${esc(s.title)}</li>`).join('')}</ol>
        <div class="row">
          <button class="btn ghost" id="homeBtn">กลับหน้าแรก</button>
          <button class="btn primary" id="againBtn">ฝึกอีกครั้ง</button>
        </div>
      </div>`;
    $(this.root, '#progressFill').style.width = '100%';
    $(this.overlay, '#againBtn').onclick = () => { this.closeOverlays(); onRestart(); };
    $(this.overlay, '#homeBtn').onclick = () => location.reload();
  }

  onSettings(get: () => Settings, set: (s: Settings) => void, reset: () => void) {
    $(this.root, '#settingsBtn').onclick = () => {
      const s = get();
      this.overlay.hidden = false;
      this.overlay.innerHTML = `
        <div class="modal settings">
          <h3>ตั้งค่า</h3>
          <label class="switch"><input type="checkbox" id="setLine" ${s.floorLine ? 'checked' : ''}/>
            <span><b>เส้นนำทางบนลานเฏาะวาฟ</b><small>ของจริงไม่มีเส้นบนพื้น จุดเริ่มแต่ละรอบใช้ไฟสีเขียวบนผนัง (มีผลเมื่อเข้าฉากมัสยิดครั้งถัดไป)</small></span></label>
          <div class="row">
            <button class="btn ghost" id="resetBtn">ล้างความคืบหน้า</button>
            <button class="btn primary" id="closeSet">ปิด</button>
          </div>
        </div>`;
      $(this.overlay, '#closeSet').onclick = () => {
        set({ floorLine: $<HTMLInputElement>(this.overlay, '#setLine').checked });
        this.closeOverlays();
      };
      $(this.overlay, '#resetBtn').onclick = () => { reset(); location.reload(); };
    };
  }
}
