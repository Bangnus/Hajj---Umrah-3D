import { localDua, type Dua } from '../../content/duaTypes';
import { getActiveAudioKind, hasRealAudio, playDuaArabic, playDuaMeaning, playDuaReading, stopDuaAudio } from '../../content/duaAudio';
import * as audio from '../../engine/audio';
import { tr } from '../../i18n';
import { $, isPhone } from './template';

export class DuaPanel {
  private duaTimer = 0;
  private history: Dua[] = [];
  private curIdx = -1;
  private curDua: Dua | null = null;

  constructor(private readonly root: HTMLElement) {
    $(root, '#duaClose').onclick = () => { $(root, '#duaCard').hidden = true; this.stopSpeech(); };
    const prev = root.querySelector<HTMLButtonElement>('#duaPrev');
    const next = root.querySelector<HTMLButtonElement>('#duaNext');
    if (prev) prev.onclick = () => { if (this.curIdx > 0) { this.stopSpeech(); this.curIdx--; this.renderCurrent(); } };
    if (next) next.onclick = () => { if (this.curIdx < this.history.length - 1) { this.stopSpeech(); this.curIdx++; this.renderCurrent(); } };

    const playAr = root.querySelector<HTMLButtonElement>('#duaPlayAr');
    const playTh = root.querySelector<HTMLButtonElement>('#duaPlayTh');
    const playMeaning = root.querySelector<HTMLButtonElement>('#duaPlayMeaning');
    const stopBtn = root.querySelector<HTMLButtonElement>('#duaAudioStop');

    if (playAr) playAr.onclick = () => this.toggleAudio('ar');
    if (playTh) playTh.onclick = () => this.toggleAudio('th');
    if (playMeaning) playMeaning.onclick = () => this.toggleAudio('meaning');
    if (stopBtn) stopBtn.onclick = () => this.stopSpeech();

    audio.onVoices(() => this.updateAudioUi());
  }

  isSpeaking() { return !!getActiveAudioKind(); }

  show(d: Dua) {
    const existing = this.history.findIndex((x) => x.id === d.id);
    if (existing >= 0) this.curIdx = existing;
    else {
      this.history.push(d);
      this.curIdx = this.history.length - 1;
    }
    this.renderCurrent();
    audio.sfx('rise');
  }

  private toggleAudio(kind: 'ar' | 'th' | 'meaning') {
    if (!this.curDua) return;
    clearTimeout(this.duaTimer);
    if (getActiveAudioKind() === kind) {
      this.stopSpeech();
      return;
    }
    const onEnd = () => this.updateAudioUi();
    if (kind === 'ar') playDuaArabic(this.curDua, onEnd);
    else if (kind === 'th') playDuaReading(this.curDua, onEnd);
    else if (kind === 'meaning') playDuaMeaning(this.curDua, onEnd);
    this.updateAudioUi();
  }

  private updateAudioUi() {
    const r = this.root;
    const kind = getActiveAudioKind();
    const playAr = r.querySelector<HTMLButtonElement>('#duaPlayAr');
    const playTh = r.querySelector<HTMLButtonElement>('#duaPlayTh');
    const playMeaning = r.querySelector<HTMLButtonElement>('#duaPlayMeaning');
    const stopBtn = r.querySelector<HTMLButtonElement>('#duaAudioStop');

    if (playAr) playAr.classList.toggle('playing', kind === 'ar');
    if (playTh) playTh.classList.toggle('playing', kind === 'th');
    if (playMeaning) playMeaning.classList.toggle('playing', kind === 'meaning');
    if (stopBtn) stopBtn.hidden = !kind;

    if (this.curDua && playAr) {
      const isReal = hasRealAudio(this.curDua);
      const ico = r.querySelector('#duaPlayArIco');
      const lbl = r.querySelector('#duaPlayArLabel');
      if (ico) ico.textContent = isReal ? '🎙️' : '🔊';
      if (lbl) lbl.textContent = isReal ? tr('ฟังเสียงจริง') : tr('ฟังภาษาอาหรับ');
    }
  }

  private renderCurrent() {
    if (this.curIdx < 0 || this.curIdx >= this.history.length) return;
    const d = this.history[this.curIdx];
    this.curDua = d;
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

    const counter = r.querySelector('#duaCounter');
    if (counter) counter.textContent = `${this.curIdx + 1}/${this.history.length}`;
    const prev = r.querySelector<HTMLButtonElement>('#duaPrev');
    const next = r.querySelector<HTMLButtonElement>('#duaNext');
    if (prev) prev.disabled = this.curIdx <= 0;
    if (next) next.disabled = this.curIdx >= this.history.length - 1;

    const playTh = r.querySelector<HTMLButtonElement>('#duaPlayTh');
    const playMeaning = r.querySelector<HTMLButtonElement>('#duaPlayMeaning');
    if (playTh) playTh.hidden = !t.reading;
    if (playMeaning) playMeaning.hidden = !t.meaning;

    card.hidden = false;
    card.classList.remove('min', 'pop');
    void card.offsetWidth;
    card.classList.add('pop');
    this.stopSpeech();
    this.updateAudioUi();

    clearTimeout(this.duaTimer);
    if (isPhone()) this.duaTimer = window.setTimeout(() => card.classList.add('min'), 45000);
  }

  stopSpeech() {
    stopDuaAudio();
    this.updateAudioUi();
  }
}
