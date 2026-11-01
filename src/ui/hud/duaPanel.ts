import { localDua, type Dua } from '../../content/duaTypes';
import * as audio from '../../engine/audio';
import { tr } from '../../i18n';
import { $, isPhone } from './template';

export class DuaPanel {
  private duaTimer = 0;
  private history: Dua[] = [];
  private curIdx = -1;
  private curDua: Dua | null = null;
  private duaStep = 0;
  private duaSpeaking = false;

  constructor(private readonly root: HTMLElement) {
    $(root, '#duaClose').onclick = () => { $(root, '#duaCard').hidden = true; this.stopSpeech(); };
    $(root, '#duaSpeak').onclick = () => this.speak();
    const prev = root.querySelector<HTMLButtonElement>('#duaPrev');
    const next = root.querySelector<HTMLButtonElement>('#duaNext');
    if (prev) prev.onclick = () => { if (this.curIdx > 0) { this.curIdx--; this.renderCurrent(); } };
    if (next) next.onclick = () => { if (this.curIdx < this.history.length - 1) { this.curIdx++; this.renderCurrent(); } };
    audio.onVoices(() => this.paintSpeak());
  }

  isSpeaking() { return this.duaSpeaking; }

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

  private renderCurrent() {
    if (this.curIdx < 0 || this.curIdx >= this.history.length) return;
    const d = this.history[this.curIdx];
    this.curDua = d;
    this.duaStep = 0;
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

    card.hidden = false;
    card.classList.remove('min', 'pop');
    void card.offsetWidth;
    card.classList.add('pop');
    this.stopSpeech();
    this.paintSpeak();

    clearTimeout(this.duaTimer);
    if (isPhone()) this.duaTimer = window.setTimeout(() => card.classList.add('min'), 45000);
  }

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

  paintSpeak() {
    const btn = $<HTMLButtonElement>(this.root, '#duaSpeak');
    const parts = this.duaParts();
    btn.hidden = parts.length === 0;
    if (!parts.length) return;
    const next = parts[this.duaStep % parts.length];
    btn.textContent = `🔊 ${next.label}`;
    btn.classList.toggle('on', this.duaSpeaking);
    btn.setAttribute('aria-label', btn.textContent);
  }

  private speak() {
    const parts = this.duaParts();
    if (!parts.length) return;
    const part = parts[this.duaStep % parts.length];
    clearTimeout(this.duaTimer);
    this.duaSpeaking = audio.speak(part.text, part.lang, () => {
      this.duaSpeaking = false;
      this.paintSpeak();
    });
    if (this.duaSpeaking) this.duaStep = (this.duaStep + 1) % parts.length;
    this.paintSpeak();
  }

  stopSpeech() {
    audio.stopSpeech();
    this.duaSpeaking = false;
    this.paintSpeak();
  }
}
