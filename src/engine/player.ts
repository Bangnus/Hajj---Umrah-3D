import * as THREE from 'three';
import type { Input } from './input';

export type Collider =
  | { kind: 'box'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: 'circle'; x: number; z: number; r: number }
  /** Solid half-disc on the side of z where sign(z - cz) === side. */
  | { kind: 'halfdisc'; x: number; z: number; r: number; side: -1 | 1 }
  | { kind: 'rect-in'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: 'disc-in'; x: number; z: number; r: number };

export type Gender = 'male' | 'female';
export type Pose = 'stand' | 'raise' | 'ruku' | 'sujud' | 'sit' | 'throw';

export interface Look {
  gender: Gender;
  outfit: 'travel' | 'ihram';
  skin: number;
  cloth: number;
  hair: 'normal' | 'shaved' | 'trimmed';
  /** Men in ihram: right shoulder uncovered (during tawaf al-qudum / umrah tawaf). */
  idtiba?: boolean;
}

const WHITE = 0xf4f2ec;

/** Stylised low-poly pilgrim with walk cycle, simple prayer poses and collision. */
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
  private phase = 0;
  private pose: Pose = 'stand';
  private raiseT = 0;
  private look: Look;
  private body = new THREE.Group();
  private hips = new THREE.Group();
  private upper = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private meshes: THREE.Mesh[] = [];

  constructor(look: Look) {
    this.look = look;
    this.group.add(this.body);
    this.build();
  }

  getLook(): Look { return { ...this.look }; }

  setLook(patch: Partial<Look>) {
    this.look = { ...this.look, ...patch };
    this.build();
  }

  setPose(p: Pose) { this.pose = p; }

  /** Briefly raise the right hand (istilam gesture). */
  raiseHand() { this.raiseT = 1.2; }

  private build() {
    for (const m of this.meshes) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); m.removeFromParent(); }
    this.meshes = [];
    for (const g of [this.hips, this.upper, this.legL, this.legR, this.armL, this.armR]) g.clear();
    this.body.clear();

    const L = this.look;
    const male = L.gender === 'male';
    const ihram = L.outfit === 'ihram';
    const skin = L.skin;
    const cloth = ihram ? WHITE : L.cloth;
    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      this.meshes.push(m);
      return m;
    };

    // Hierarchy: body > hips(at 0.9) > upper (torso, head, arms) and legs.
    this.body.add(this.hips);
    this.hips.position.y = 0.9;
    this.hips.add(this.upper, this.legL, this.legR);
    this.legL.position.set(-0.11, 0, 0);
    this.legR.position.set(0.11, 0, 0);

    // Legs (pivot at hip).
    const legColor = male ? (ihram ? skin : 0xe8e2d4) : cloth;
    for (const leg of [this.legL, this.legR]) {
      add(leg, new THREE.CylinderGeometry(0.075, 0.065, 0.82, 10), legColor, 0, -0.43, 0);
      add(leg, new THREE.BoxGeometry(0.13, 0.06, 0.26), male ? 0x6b5038 : 0x2b2b2b, 0, -0.86, 0.05);
    }

    // Lower garment.
    if (male) {
      const len = ihram ? 0.55 : 0.75;
      add(this.hips, new THREE.CylinderGeometry(0.23, 0.27, len, 16), cloth, 0, -len / 2 + 0.05, 0);
    } else {
      add(this.hips, new THREE.CylinderGeometry(0.24, 0.36, 0.86, 18), cloth, 0, -0.38, 0);
    }

    // Torso.
    const torsoColor = male && ihram ? WHITE : cloth;
    add(this.upper, new THREE.CylinderGeometry(0.2, 0.23, 0.62, 16), torsoColor, 0, 0.33, 0);
    const idtiba = male && ihram && !!L.idtiba;
    if (idtiba) {
      // Rida draped over the left shoulder; right shoulder bare (idtiba).
      const sash = add(this.upper, new THREE.BoxGeometry(0.1, 0.72, 0.44), WHITE, -0.12, 0.38, 0);
      sash.rotation.z = 0.5;
      add(this.upper, new THREE.SphereGeometry(0.1, 10, 8), skin, 0.18, 0.6, 0);
    } else if (male && ihram) {
      // Rida covering both shoulders.
      add(this.upper, new THREE.SphereGeometry(0.27, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), WHITE, 0, 0.56, 0);
    }

    // Neck + head.
    add(this.upper, new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skin, 0, 0.68, 0);
    const head = add(this.upper, new THREE.SphereGeometry(0.15, 18, 14), skin, 0, 0.84, 0);
    head.scale.set(0.95, 1.08, 1);
    if (male) {
      if (L.hair === 'normal' && !ihram) add(this.upper, new THREE.SphereGeometry(0.155, 16, 8, 0, Math.PI * 2, 0, 1.2), WHITE, 0, 0.87, 0);
      else if (L.hair === 'normal') add(this.upper, new THREE.SphereGeometry(0.155, 16, 8, 0, Math.PI * 2, 0, 1.0), 0x2a211b, 0, 0.87, 0);
      add(this.upper, new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), 0x2a211b, 0, 0.8, 0.06); // beard
    } else {
      const hijab = ihram ? WHITE : 0x3a3f4a;
      const h = add(this.upper, new THREE.SphereGeometry(0.175, 18, 14), hijab, 0, 0.84, -0.015);
      h.scale.set(1, 1.12, 1);
      add(this.upper, new THREE.ConeGeometry(0.28, 0.32, 18, 1, true), hijab, 0, 0.6, 0);
      // Face window.
      const face = add(this.upper, new THREE.SphereGeometry(0.12, 14, 10), skin, 0, 0.84, 0.07);
      face.scale.set(0.85, 1, 0.6);
    }

    // Arms (pivot at shoulder).
    this.armL.position.set(-0.27, 0.58, 0);
    this.armR.position.set(0.27, 0.58, 0);
    this.upper.add(this.armL, this.armR);
    const sleeveR = idtiba ? skin : male && ihram ? WHITE : torsoColor;
    add(this.armL, new THREE.CylinderGeometry(0.06, 0.055, 0.58, 10), torsoColor, 0, -0.29, 0);
    add(this.armR, new THREE.CylinderGeometry(0.06, 0.055, 0.58, 10), sleeveR, 0, -0.29, 0);
    add(this.armL, new THREE.SphereGeometry(0.055, 8, 6), skin, 0, -0.6, 0);
    add(this.armR, new THREE.SphereGeometry(0.055, 8, 6), skin, 0, -0.6, 0);
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
    this.resolve();
    this.group.rotation.y = this.yaw;
    this.animate(dt, speed);
  }

  private resolve() {
    const r = this.radius;
    const p = this.pos;
    for (const c of this.colliders) {
      switch (c.kind) {
        case 'box': {
          const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
          const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
          const dx = p.x - cx, dz = p.z - cz;
          const d = Math.hypot(dx, dz);
          if (d === 0) {
            // Centre inside: push out through the nearest edge.
            const opts = [p.x - c.minX, c.maxX - p.x, p.z - c.minZ, c.maxZ - p.z];
            const i = opts.indexOf(Math.min(...opts));
            if (i === 0) p.x = c.minX - r; else if (i === 1) p.x = c.maxX + r;
            else if (i === 2) p.z = c.minZ - r; else p.z = c.maxZ + r;
          } else if (d < r) {
            p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r;
          }
          break;
        }
        case 'circle': {
          const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
          if (d < c.r + r && d > 0) { p.x = c.x + (dx / d) * (c.r + r); p.z = c.z + (dz / d) * (c.r + r); }
          break;
        }
        case 'halfdisc': {
          if (Math.sign(p.z - c.z) !== c.side) break;
          const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
          if (d < c.r + r && d > 0) { p.x = c.x + (dx / d) * (c.r + r); p.z = c.z + (dz / d) * (c.r + r); }
          break;
        }
        case 'rect-in':
          p.x = Math.max(c.minX + r, Math.min(p.x, c.maxX - r));
          p.z = Math.max(c.minZ + r, Math.min(p.z, c.maxZ - r));
          break;
        case 'disc-in': {
          const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
          if (d > c.r - r) { p.x = c.x + (dx / d) * (c.r - r); p.z = c.z + (dz / d) * (c.r - r); }
          break;
        }
      }
    }
  }

  private animate(dt: number, speed: number) {
    const k = Math.min(1, dt * 10);
    let hipsY = 0.9, upperX = 0, legX = 0, armLX = 0, armRX = 0, armRZ = 0;

    if (this.pose === 'stand') {
      if (speed > 0) {
        this.phase += dt * speed * 3.2;
        const s = Math.sin(this.phase);
        legX = s * 0.55;
        armLX = -s * 0.45; armRX = s * 0.45;
        hipsY = 0.9 + Math.abs(Math.cos(this.phase)) * 0.03;
      }
      if (this.raiseT > 0) { this.raiseT -= dt; armRX = -2.6; armRZ = 0.2; }
    } else if (this.pose === 'raise') {
      armLX = -2.7; armRX = -2.7;
    } else if (this.pose === 'ruku') {
      upperX = 1.45; armLX = -0.5; armRX = -0.5;
    } else if (this.pose === 'sujud') {
      hipsY = 0.42; upperX = 2.1; legX = -1.6; armLX = -2.0; armRX = -2.0;
    } else if (this.pose === 'sit') {
      hipsY = 0.36; legX = -1.55; upperX = 0.05;
    } else if (this.pose === 'throw') {
      armRX = -2.2; armRZ = -0.1; upperX = -0.08;
    }

    this.hips.position.y += (hipsY - this.hips.position.y) * k;
    this.upper.rotation.x += (upperX - this.upper.rotation.x) * k;
    const sit = this.pose === 'sujud' || this.pose === 'sit';
    this.legL.rotation.x += ((sit ? legX : legX) - this.legL.rotation.x) * k;
    this.legR.rotation.x += ((sit ? legX : -legX) - this.legR.rotation.x) * k;
    this.armL.rotation.x += (armLX - this.armL.rotation.x) * k;
    this.armR.rotation.x += (armRX - this.armR.rotation.x) * k;
    this.armR.rotation.z += (armRZ - this.armR.rotation.z) * k;
  }
}

/** Third-person camera that orbits the player using the Input's yaw/pitch/dist. */
export function followCamera(cam: THREE.PerspectiveCamera, player: Player, input: Input, dt: number) {
  const t = new THREE.Vector3(player.pos.x, player.pos.y + 1.45, player.pos.z);
  const cp = Math.cos(input.pitch);
  const want = new THREE.Vector3(
    t.x + Math.sin(input.yaw) * cp * input.dist,
    Math.max(0.4, t.y + Math.sin(input.pitch) * input.dist),
    t.z + Math.cos(input.yaw) * cp * input.dist,
  );
  cam.position.lerp(want, Math.min(1, dt * 8));
  cam.lookAt(t);
}
