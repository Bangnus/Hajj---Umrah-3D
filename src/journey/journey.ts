import * as THREE from 'three';
import type { Engine } from '../engine/engine';
import type { Input } from '../engine/input';
import { followCamera, type Player } from '../engine/player';
import { disposeTree, Rings } from '../engine/rings';
import { getDua } from '../content/duas';
import type { Hud } from '../ui/hud';
import { saveProgress } from './progress';
import type { ActionHandle, Profile, Settings, StageBuild, StageCtx, StageDef } from './types';

interface Current {
  def: StageDef;
  build: StageBuild;
  root: THREE.Group;
  rings: Rings;
  ticks: ((dt: number) => void)[];
  timers: number[];
  actions: ActionHandle[];
}

/** Runs the stage sequence: builds each scene, tracks the mission counter, handles nav. */
export class Journey {
  index = 0;
  private cur: Current | null = null;
  private count = 0;
  private total = 0;
  private guideTarget: { x: number; z: number } | null = null;
  private readonly arrow: THREE.Mesh;

  constructor(
    private readonly engine: Engine,
    private readonly player: Player,
    private readonly input: Input,
    private readonly hud: Hud,
    private readonly stages: StageDef[],
    public profile: Profile,
    public settings: Settings,
  ) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.55); shape.lineTo(0.32, 0); shape.lineTo(0.12, 0); shape.lineTo(0.12, -0.4);
    shape.lineTo(-0.12, -0.4); shape.lineTo(-0.12, 0); shape.lineTo(-0.32, 0); shape.closePath();
    this.arrow = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.9, depthWrite: false }));
    this.arrow.rotation.x = -Math.PI / 2;
    this.arrow.renderOrder = 5;
    engine.scene.add(this.arrow, player.group);

    hud.onNav({
      next: () => this.next(),
      back: () => this.index > 0 && this.go(this.index - 1),
      skip: () => this.progress(this.total - this.count),
      jump: (i) => this.go(i),
    });
    engine.onTick((dt) => this.tick(dt));
  }

  go(i: number) {
    this.teardown();
    this.index = i;
    const def = this.stages[i];
    const root = new THREE.Group();
    this.engine.scene.add(root);
    const rings = new Rings(root);
    const cur: Current = { def, build: null as unknown as StageBuild, root, rings, ticks: [], timers: [], actions: [] };
    this.cur = cur;
    this.guideTarget = null;
    this.player.colliders = [];
    this.player.speedMul = 1;
    this.player.frozen = false;
    this.player.setPose('stand');
    this.player.setLook({ outfit: def.outfit, hair: 'normal' });

    const ctx: StageCtx = {
      root, rings,
      player: this.player,
      input: this.input,
      hud: this.hud,
      profile: this.profile,
      settings: this.settings,
      quality: this.engine.quality,
      add: (s) => {
        root.add(s.group);
        this.player.colliders.push(...s.colliders);
        if (s.tick) cur.ticks.push(s.tick);
      },
      // Callbacks from overlays/timers may land after a stage change: ignore them then.
      progress: (n = 1) => { if (this.cur === cur) this.progress(n); },
      count: () => this.count,
      toast: (m, k) => { if (this.cur === cur) this.hud.toast(m, k); },
      dua: (id) => {
        if (this.cur !== cur) return;
        const d = getDua(id);
        if (d) this.hud.dua(d); else console.warn('missing dua', id);
      },
      hint: (t) => { if (this.cur === cur) this.hud.setHint(t); },
      action: (label, cb) => { const a = this.hud.action(label, cb); cur.actions.push(a); return a; },
      guide: (t) => { this.guideTarget = t; },
      after: (s, fn) => { cur.timers.push(window.setTimeout(() => { if (this.cur === cur) fn(); }, s * 1000)); },
    };

    this.hud.setStage(i, def, this.profile);
    const build = def.build(ctx);
    cur.build = build;
    this.count = 0;
    this.total = build.mission.total;
    this.hud.setMission(build.mission);
    this.hud.setCount(0, this.total);

    this.player.pos.set(build.start.x, 0, build.start.z);
    this.player.yaw = build.start.yaw;
    this.input.yaw = build.camYaw ?? build.start.yaw + Math.PI;
    this.input.dist = build.camDist ?? 7;
    this.input.pitch = 0.32;
    this.engine.camera.position.set(build.start.x, 4, build.start.z + 6);
    saveProgress({ profile: this.profile, stageIndex: i });
  }

  private teardown() {
    const c = this.cur;
    if (!c) return;
    c.timers.forEach(clearTimeout);
    c.actions.forEach((a) => a.remove());
    this.hud.closeOverlays();
    c.root.removeFromParent();
    disposeTree(c.root);
    this.cur = null;
  }

  progress(n = 1) {
    if (!this.cur || this.count >= this.total) return;
    this.count = Math.min(this.total, this.count + n);
    this.hud.setCount(this.count, this.total);
    if (this.count >= this.total) this.hud.missionDone(this.index === this.stages.length - 1);
  }

  next() {
    if (this.count < this.total) return;
    if (this.index < this.stages.length - 1) this.go(this.index + 1);
    else {
      this.teardown();
      saveProgress(null);
      this.hud.completion(this.stages, this.profile, () => this.go(0));
    }
  }

  private tick(dt: number) {
    const c = this.cur;
    if (!c) return;
    // No walking or ring triggers while a dialog (settings, prayer, zamzam) is open.
    const modal = this.hud.isOverlayOpen();
    this.input.enabled = !modal;
    this.player.update(dt, this.input);
    if (!modal) c.rings.update(dt, this.player.pos);
    c.ticks.forEach((t) => t(dt));
    c.build.tick?.(dt);
    followCamera(this.engine.camera, this.player, this.input, dt);
    this.engine.followSun(this.player.pos);

    // Guide arrow at the player's feet pointing to the target.
    const tgt = this.guideTarget ?? c.rings.nearest(this.player.pos);
    const p = this.player.pos;
    const show = !!tgt && this.count < this.total && Math.hypot(tgt.x - p.x, tgt.z - p.z) > 2.5 && !this.player.frozen;
    this.arrow.visible = show;
    if (show && tgt) {
      const a = Math.atan2(tgt.x - p.x, tgt.z - p.z);
      this.arrow.position.set(p.x + Math.sin(a) * 1.1, 0.06, p.z + Math.cos(a) * 1.1);
      this.arrow.rotation.z = a + Math.PI;
    }
  }
}
