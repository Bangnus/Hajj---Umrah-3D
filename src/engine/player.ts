import * as THREE from 'three';
import type { Input } from './input';
import { buildLowerAndTorso } from './player/body';
import { buildHeadAndArms } from './player/headArms';
import { animatePlayerRig, type AnimState, followCamera, resolveColliders } from './player/motion';
import type { AddPartFn, Collider, Gender, Look, PlayerRig, Pose } from './player/types';

export { followCamera, type Collider, type Gender, type Look, type Pose };

/**
 * Articulated, anatomically proportioned 3D pilgrim with realistic garments
 * (ihram rida'/izar/hizam/idtiba, thobe + kufi, layered hijab + abaya),
 * facial features, elbow & knee joints, idle breathing, walk/jog stride, and prayer poses.
 *
 * Coordinate convention: +z = forward, +y = up, -x = anatomical right, +x = anatomical left.
 */
export class Player {
  readonly group = new THREE.Group();
  readonly pos = this.group.position;
  yaw = 0;
  speedMul = 1;
  colliders: Collider[] = [];
  frozen = false;
  moving = false;
  readonly radius = 0.35;

  private walk = 3.2;
  private jogSpeed = 5.8;
  private pose: Pose = 'stand';
  private anim: AnimState = { phase: 0, idleT: 0, raiseT: 0 };
  private look: Look;

  private rig: PlayerRig = {
    body: new THREE.Group(),
    hips: new THREE.Group(),
    skirtWrap: new THREE.Group(),
    upper: new THREE.Group(),
    headGroup: new THREE.Group(),
    legL: new THREE.Group(),
    legR: new THREE.Group(),
    shinL: new THREE.Group(),
    shinR: new THREE.Group(),
    armL: new THREE.Group(),
    armR: new THREE.Group(),
    forearmL: new THREE.Group(),
    forearmR: new THREE.Group(),
  };

  private meshes: THREE.Mesh[] = [];
  private materials: THREE.Material[] = [];

  constructor(look: Look) {
    this.look = look;
    this.group.add(this.rig.body);
    this.build();
  }

  getLook(): Look { return { ...this.look }; }

  setLook(patch: Partial<Look>) {
    this.look = { ...this.look, ...patch };
    this.build();
  }

  setPose(p: Pose) { this.pose = p; }

  /** Briefly raise the right hand (istilam gesture). */
  raiseHand() { this.anim.raiseT = 1.25; }

  private build() {
    for (const m of this.meshes) { m.geometry.dispose(); m.removeFromParent(); }
    for (const mt of this.materials) mt.dispose();
    this.meshes = [];
    this.materials = [];

    const r = this.rig;
    for (const g of [
      r.hips, r.skirtWrap, r.upper, r.headGroup,
      r.legL, r.legR, r.shinL, r.shinR,
      r.armL, r.armR, r.forearmL, r.forearmR,
    ]) {
      g.clear();
      g.rotation.set(0, 0, 0);
    }
    r.body.clear();

    const matCache = new Map<string, THREE.MeshStandardMaterial>();
    const getMat = (color: number, rough = 0.78, metal = 0, side: THREE.Side = THREE.FrontSide) => {
      const key = `${color}_${rough}_${metal}_${side}`;
      let mt = matCache.get(key);
      if (!mt) {
        mt = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, side });
        matCache.set(key, mt);
        this.materials.push(mt);
      }
      return mt;
    };

    const add: AddPartFn = (parent, geo, color, x = 0, y = 0, z = 0, o = {}) => {
      const m = new THREE.Mesh(geo, getMat(color, o.rough ?? 0.78, o.metal ?? 0, o.side ?? THREE.FrontSide));
      m.position.set(x, y, z);
      if (o.sx !== undefined || o.sy !== undefined || o.sz !== undefined) m.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
      if (o.rx || o.ry || o.rz) m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      this.meshes.push(m);
      return m;
    };

    buildLowerAndTorso(this.rig, this.look, add);
    buildHeadAndArms(this.rig, this.look, add);
  }

  update(dt: number, input: Input) {
    const a = input.axis();
    const len = Math.hypot(a.x, a.y);
    this.moving = !this.frozen && this.pose === 'stand' && len > 0.05;
    let speed = 0;
    if (this.moving) {
      const fx = -Math.sin(input.yaw), fz = -Math.cos(input.yaw);
      const rx = Math.cos(input.yaw), rz = -Math.sin(input.yaw);
      let dx = fx * a.y + rx * a.x, dz = fz * a.y + rz * a.x;
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl; dz /= dl;
      speed = (input.jog ? this.jogSpeed : this.walk) * this.speedMul * Math.min(len, 1);
      this.pos.x += dx * speed * dt;
      this.pos.z += dz * speed * dt;
      const target = Math.atan2(dx, dz);
      let d = target - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 12);
    }
    resolveColliders(this.pos, this.radius, this.colliders);
    this.group.rotation.y = this.yaw;
    animatePlayerRig(this.rig, this.anim, this.pose, dt, speed);
  }
}
