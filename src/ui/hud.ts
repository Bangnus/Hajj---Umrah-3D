import type { Dua } from '../content/duaTypes';
import type { Beat } from '../journey/prayer';
import type { Saved } from '../journey/progress';
import type { ActionHandle, Mission, Profile, Settings, StageDef } from '../journey/types';
import * as audio from '../engine/audio';
import { tr } from '../i18n';
import { showCreator } from './hud/creator';
import { showCompletionModal, showPrayerModal, showZamzamModal } from './hud/dialogs';
import { DuaPanel } from './hud/duaPanel';
import { bindSettingsModal } from './hud/settings';
import { $, bindShellEvents, esc, hudMarkup, ritualName, type Nav } from './hud/template';

export { showCreator } from './hud/creator';
export type { Nav } from './hud/template';

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
  private duaPanel: DuaPanel;
  /** Thai name of the ritual being practised ("อุมเราะฮ์" or "ฮัจญ์"). */
  private ritual = 'อุมเราะฮ์';

  constructor(root: HTMLElement, private readonly isTouch: boolean) {
    this.root = root;
    root.innerHTML = hudMarkup(isTouch);
    this.joystick = $(root, '#joystick');
    this.knob = $(root, '#knob');
    this.jogBtn = $(root, '#jogBtn');
    this.toastBox = $(root, '#toasts');
    this.overlay = $(root, '#overlay');
    this.duaPanel = new DuaPanel(root);
    root.classList.toggle('touch', this.isTouch);
    bindShellEvents(root, () => this.nav);
  }

  onNav(n: Nav) { this.nav = n; }

  /** Start screen. Resolves with the profile and the stage to start from. */
  showCreator(
    saved: Saved | null,
    savedStageTitle?: string,
    onModeChange?: (mode: Profile['mode']) => void,
  ): Promise<{ profile: Profile; stage: number }> {
    return showCreator(this.root, saved, savedStageTitle, onModeChange);
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
    this.duaPanel.stopSpeech();
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
    this.duaPanel.stopSpeech();
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

  dua(d: Dua) { this.duaPanel.show(d); }

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
    showPrayerModal(this.overlay, () => this.closeOverlays(), beats, onBeat, onDone);
  }

  /** Drink Zamzam in three sips. */
  zamzam(onDone: () => void) {
    showZamzamModal(this.overlay, () => this.closeOverlays(), onDone);
  }

  completion(stages: StageDef[], profile: Profile, onRestart: () => void) {
    showCompletionModal(this.root, this.overlay, () => this.closeOverlays(), this.ritual, () => this.duaPanel.stopSpeech(), stages, profile, onRestart);
  }

  onSettings(get: () => Settings, set: (s: Settings) => void, reset: () => void) {
    bindSettingsModal(this.root, this.overlay, () => this.closeOverlays(), () => this.duaPanel.isSpeaking(), get, set, reset);
  }
}
