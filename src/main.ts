import './ui/styles.css';
import { getLang } from './i18n';
import { loadProgress, loadSettings, saveProgress, saveSettings } from './journey/progress';
import type { Journey } from './journey/journey';

async function boot() {
  // Only download the English dictionary chunk when English UI is selected.
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

  // Preload fonts, 3D runtime and stage chunks in parallel without blocking the start screen.
  const fontsTask = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))])
    .then(() => document.fonts.load('600 44px "Noto Sans Thai"').catch(() => undefined));
  const runtimeTask = import('./runtime');
  const registryTask = import('./journey/stages/registry');

  const saved = loadProgress();
  let savedStageTitle: string | undefined;
  if (saved) {
    const { loadStages } = await registryTask;
    const savedStages = await loadStages(saved.profile);
    savedStageTitle = savedStages[saved.stageIndex]?.title;
  } else {
    registryTask.then((r) => r.preloadMode('umrah'));
  }

  const { profile, stage } = await hud.showCreator(saved, savedStageTitle, (mode) => {
    registryTask.then((r) => r.preloadMode(mode));
  });

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

  // Debug hook for automated checks in the browser.
  (window as unknown as { __sim: unknown }).__sim = { engine, player, journey, input, stages };
}

boot();
