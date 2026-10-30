import './ui/styles.css';
import { Engine } from './engine/engine';
import { Input } from './engine/input';
import { Player } from './engine/player';
import { Journey } from './journey/journey';
import { loadProgress, loadSettings, saveProgress, saveSettings } from './journey/progress';
import { STAGES } from './journey/stages';
import { Hud } from './ui/hud';

async function boot() {
  // Canvas labels need the Thai font before they are drawn.
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  await document.fonts.load('600 44px "Noto Sans Thai"').catch(() => undefined);

  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const engine = new Engine(canvas);
  const hud = new Hud(document.getElementById('ui')!, engine.isTouch);
  const input = new Input(canvas, hud.joystick, hud.knob, hud.jogBtn);
  hud.setStages(STAGES);

  let settings = loadSettings();
  let journey: Journey | undefined;
  hud.onSettings(() => settings, (s) => { settings = s; if (journey) journey.settings = s; saveSettings(s); }, () => saveProgress(null));

  const { profile, stage } = await hud.showCreator(loadProgress(), STAGES);
  const player = new Player({
    gender: profile.gender,
    outfit: 'travel',
    skin: 0xc69c7b,
    cloth: profile.gender === 'male' ? 0x6c8a7a : 0x2e3440,
    hair: 'normal',
  });
  journey = new Journey(engine, player, input, hud, STAGES, profile, settings);
  journey.go(Math.min(stage, STAGES.length - 1));
  engine.start();

  // Debug hook for automated checks in the browser.
  (window as unknown as { __sim: unknown }).__sim = { engine, player, journey, input };
}

boot();
