import './ui/styles.css';
import { getLang, tr } from './i18n';
import type { Profile } from './journey/types';
import { loadProgress, loadSettings, saveProgress, saveSettings } from './journey/progress';
import type { Journey } from './journey/journey';

async function boot() {
  if (getLang() === 'en') await import('./i18n/en');

  const isTouch = matchMedia('(pointer: coarse)').matches;
  const { Hud } = await import('./ui/hud');
  const hud = new Hud(document.getElementById('ui')!, isTouch);

  let settings = loadSettings();
  let journey: Journey | undefined;
  hud.onSettings(
    () => settings,
    (s) => { settings = s; if (journey) journey.settings = s; saveSettings(s); },
    () => saveProgress(null),
  );

  const fontsTask = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))])
    .then(() => document.fonts.load('600 44px "Noto Sans Thai"').catch(() => undefined));
  const runtimeTask = import('./runtime');
  const registryTask = import('./journey/stages/registry');

  const saved = loadProgress();
  const hasNew = new URLSearchParams(window.location.search).has('new');
  let savedStageTitle: string | undefined;
  let profile: Profile;
  let stage: number;

  if (saved && !hasNew) {
    const { loadStages } = await registryTask;
    const savedStages = await loadStages(saved.profile);
    profile = saved.profile;
    stage = Math.min(saved.stageIndex, savedStages.length - 1);
    savedStageTitle = savedStages[stage]?.title;
  } else {
    if (saved) {
      const { loadStages } = await registryTask;
      const savedStages = await loadStages(saved.profile);
      savedStageTitle = savedStages[saved.stageIndex]?.title;
    } else {
      registryTask.then((r) => r.preloadMode('umrah'));
    }
    const created = await hud.showCreator(saved, savedStageTitle, (mode) => {
      registryTask.then((r) => r.preloadMode(mode));
    });
    profile = created.profile;
    stage = created.stage;
    if (hasNew) window.history.replaceState({}, '', window.location.pathname);
  }

  const [, { Engine, Input, Player, Journey: JourneyCls }, { loadStages }] = await Promise.all([
    fontsTask,
    runtimeTask,
    registryTask,
  ]);
  const stages = await loadStages(profile);
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const engine = new Engine(canvas);
  const input = new Input(canvas, hud.joystick, hud.knob, hud.jogBtn);
  hud.setStages(stages, profile);
  const player = new Player({
    gender: profile.gender,
    outfit: 'travel',
    skin: 0xc69c7b,
    cloth: profile.gender === 'male' ? 0x6c8a7a : 0x2e3440,
    hair: 'normal',
  });
  journey = new JourneyCls(engine, player, input, hud, stages, profile, settings);
  journey.go(Math.min(stage, stages.length - 1));
  engine.start();

  if (saved && !hasNew) {
    const title = savedStageTitle ?? stages[stage]?.title ?? '';
    hud.toast(tr('📍 เล่นต่อจาก: {title}', { title }), 'ok');
  }

  (window as unknown as { __sim: unknown }).__sim = { engine, player, journey, input, stages };
}

boot();
