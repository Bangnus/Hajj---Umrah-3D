import * as THREE from 'three';
import type { Pose } from '../../../engine/player';
import { starField } from '../../../world/hajjCommon';
import type { HajjType, Profile, StageCtx } from '../../types';
import { tr } from '../../../i18n';

/** Shared helpers for the Hajj stages. */

export const TYPE_TH: Record<HajjType, string> = { tamattu: tr('ตะมัตตุอ์'), ifrad: tr('อิฟรอด'), qiran: tr('กิรอน') };
/** Tamattu' and qiran owe a hady (dam); ifrad does not. */
export const needsDam = (p: Profile) => p.hajjType !== 'ifrad';
export const crowdCount = (ctx: StageCtx, high: number, low: number) => (ctx.quality === 'high' ? high : low);

/** Hair after the first tahallul (day 10): men shaved, women trimmed. */
export function afterShave(ctx: StageCtx) {
  ctx.player.setLook({ hair: ctx.profile.gender === 'male' ? 'shaved' : 'trimmed' });
}

/** Run a callback every frame for the rest of the stage. */
export function onFrame(ctx: StageCtx, fn: (dt: number) => void) {
  ctx.add({ group: new THREE.Group(), colliders: [], tick: fn });
}

/** Stars become visible when it is dark. */
function starAmount(t: number) {
  if (t > 1.05) return Math.min(1, (t - 1.05) / 0.15);
  if (t < -0.02) return Math.min(1, (-t - 0.02) / 0.15);
  return 0;
}

export interface SkyClock {
  readonly t: number;
  set(t: number): void;
  /** Animate to `t` over `sec` seconds. */
  to(t: number, sec: number, done?: () => void): void;
}

/** Time-of-day controller for a stage (with a star dome for the night). */
export function skyClock(ctx: StageCtx, t0: number): SkyClock {
  const stars = starField(ctx.quality === 'high' ? 1100 : 500);
  const g = new THREE.Group();
  g.add(stars.points);
  let t = t0, from = t0, target = t0, dur = 0, el = 0;
  let done: (() => void) | null = null;
  const apply = () => { ctx.timeOfDay(t); stars.setOpacity(starAmount(t)); };
  ctx.add({
    group: g, colliders: [],
    tick: (dt) => {
      stars.points.position.copy(ctx.player.pos);
      if (dur <= 0) return;
      el += dt;
      const k = Math.min(1, el / dur);
      t = from + (target - from) * k;
      apply();
      if (k >= 1) { dur = 0; const d = done; done = null; d?.(); }
    },
  });
  apply();
  return {
    get t() { return t; },
    set(v) { t = v; dur = 0; done = null; apply(); },
    to(v, sec, cb) {
      // Full night after sunset (≥1.25) looks the same as full night before dawn (≤-0.25):
      // wrap so that going on to the next morning never replays the day backwards.
      if (t >= 1.25 && v < 1) t = -0.4;
      from = t; target = v; dur = Math.max(0.01, sec); el = 0; done = cb ?? null;
    },
  };
}

export interface Salah {
  name: string;
  rakaat: number;
  /** Shown as a toast when the prayer starts. */
  note?: string;
}

function poseSequence(rakaat: number): [Pose, number][] {
  const seq: [Pose, number][] = [['raise', 0.6]];
  for (let r = 1; r <= rakaat; r++) {
    seq.push(['stand', 0.7], ['ruku', 0.55], ['stand', 0.35], ['sujud', 0.5], ['sit', 0.35], ['sujud', 0.5]);
    if (r === 2 && rakaat > 2) seq.push(['sit', 0.6]);
  }
  seq.push(['sit', 1.0]);
  return seq;
}

/**
 * Pray a list of prayers one after another through a single action button.
 * The pilgrim faces the qibla and goes through quick prayer poses.
 */
export function praySequence(ctx: StageCtx, list: Salah[], o: { qiblaYaw: number; heading?: string; onEach?: (i: number) => void; onDone: () => void; label?: (s: Salah) => string }) {
  let i = 0, busy = false;
  const lbl = (s: Salah) => (o.label ? o.label(s) : tr('🕌 ละหมาด{name} {n} ร็อกอะฮ์', { name: s.name, n: s.rakaat }));
  const showHint = () => ctx.hint(`${o.heading ? o.heading + ': ' : ''}${list.map((s, k) => `${k < i ? '✓ ' : ''}${s.name} ${s.rakaat}`).join(' · ')}`);
  showHint();
  const btn = ctx.action(lbl(list[0]), () => {
    if (busy) return;
    busy = true;
    btn.setEnabled(false);
    const s = list[i];
    const pl = ctx.player;
    pl.yaw = o.qiblaYaw;
    pl.frozen = true;
    if (s.note) ctx.toast(s.note, 'info');
    let t = 0;
    for (const [pose, d] of poseSequence(s.rakaat)) { ctx.after(t, () => pl.setPose(pose)); t += d; }
    ctx.after(t, () => {
      pl.setPose('stand');
      pl.frozen = false;
      busy = false;
      i++;
      showHint();
      o.onEach?.(i - 1);
      if (i < list.length) {
        btn.setLabel(lbl(list[i]));
        btn.setEnabled(true);
      } else {
        btn.remove();
        o.onDone();
      }
    });
  });
  return btn;
}

/** A timed du'a / dhikr: the pilgrim stands still facing the qibla; the button unlocks after `sec`. */
export function timedDua(ctx: StageCtx, o: { qiblaYaw: number; sec: number; label: string; doneLabel: string; pose?: Pose; onDone: () => void }) {
  const pl = ctx.player;
  pl.yaw = o.qiblaYaw;
  pl.frozen = true;
  pl.setPose(o.pose ?? 'stand');
  let left = o.sec;
  const btn = ctx.action(`${o.label} (${left})`, () => {
    if (left > 0) return;
    btn.remove();
    pl.setPose('stand');
    pl.frozen = false;
    o.onDone();
  });
  btn.setEnabled(false);
  const step = () => {
    left--;
    if (left > 0) { btn.setLabel(`${o.label} (${left})`); ctx.after(1, step); return; }
    btn.setLabel(o.doneLabel);
    btn.setEnabled(true);
  };
  ctx.after(1, step);
  return btn;
}
