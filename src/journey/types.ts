import type * as THREE from 'three';
import type { Input } from '../engine/input';
import type { Gender, Player } from '../engine/player';
import type { Rings } from '../engine/rings';
import type { Quality } from '../engine/engine';
import type { Scene3D } from '../world/common';
import type { Hud } from '../ui/hud';

export interface Mission {
  label: string;
  text: string;
  hint: string;
  total: number;
}

export type Mode = 'umrah' | 'hajj';
export type Route = 'miqat-first' | 'madinah-first';
export type HajjType = 'tamattu' | 'ifrad' | 'qiran';

export interface Profile {
  name: string;
  gender: Gender;
  mode: Mode;
  /** Umrah only: miqat first (classic) or visit Madinah first. */
  route: Route;
  /** Hajj only. */
  hajjType: HajjType;
}

export interface Settings {
  floorLine: boolean;
}

export interface ActionHandle {
  setEnabled(v: boolean): void;
  setLabel(s: string): void;
  remove(): void;
}

export interface StageCtx {
  root: THREE.Group;
  rings: Rings;
  player: Player;
  input: Input;
  hud: Hud;
  profile: Profile;
  settings: Settings;
  quality: Quality;
  /** Add a built scene: its group, colliders and per-frame tick. */
  add(scene: Scene3D): void;
  progress(n?: number): void;
  count(): number;
  toast(msg: string, kind?: 'ok' | 'warn' | 'info'): void;
  dua(id: string): void;
  hint(text: string): void;
  action(label: string, onClick: () => void): ActionHandle;
  /** Point the guide arrow at a spot (null = nearest ring). */
  guide(target: { x: number; z: number } | null): void;
  /** Timer that is cleared when the stage changes. */
  after(seconds: number, fn: () => void): void;
}

export interface StageBuild {
  mission: Mission;
  start: { x: number; z: number; yaw: number };
  camYaw?: number;
  camDist?: number;
  tick?(dt: number): void;
}

export interface StageDef {
  id: string;
  icon: string;
  title: string;
  arabic: string;
  desc: string;
  tip: (p: Profile) => string;
  /** Outfit the pilgrim wears when this stage starts (for resume/jump). */
  outfit: 'travel' | 'ihram';
  build(ctx: StageCtx): StageBuild;
}
