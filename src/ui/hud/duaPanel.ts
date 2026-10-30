import { localDua, type Dua } from '../../content/duaTypes';
import * as audio from '../../engine/audio';
import { tr } from '../../i18n';
import { $, isPhone } from './template';

export class DuaPanel {
  private duaTimer = 0;
  /** Du'a currently on the card and which part the 🔊 button reads next. */
  private curDua: Dua | null = null;
  private duaStep = 0;
  private duaSpeaking = false;

  constructor(private readonly root: HTMLElement) {
    $(root, '#duaClose').onclick = () => { $(root, '#duaCard').hidden = true; this.stopSpeech(); };
    $(root, '#duaSpeak').onclick = () => this.speak();
    audio.onVoices(() => this.paintSpeak());
  }

  isSpeaking() { return this.duaSpeaking; }

  show(d: Dua) {
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
    this.stopSpeech();
    this.curDua = d;
    this.duaStep = 0;
    this.paintSpeak();
    audio.sfx('rise');
    // On phones the card would hide the scene: shrink it to its title after a while.
    clearTimeout(this.duaTimer);
    if (isPhone()) this.duaTimer = window.setTimeout(() => card.classList.add('min'), 8000);
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
    clearTimeout(this.duaTimer); // keep the card open while it is being read
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
