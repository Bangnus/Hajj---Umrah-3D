import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { makeLabel, textTexture } from '../engine/label';
import { box, boxCollider, crowdMesh, mat, placeCrowd } from './common';

/** Shared builders for the Hajj sites (Mina, Arafah, Muzdalifah, Jamarat). */

/** Deterministic random numbers so each site looks the same every visit. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Speckled ground texture (sand, gravel, asphalt). */
export function speckTexture(base: string, specks: string[], n = 2200, size = 256, repeat = 40): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const r = rng(size + n);
  for (let i = 0; i < n; i++) {
    g.fillStyle = specks[i % specks.length];
    const s = 0.6 + r() * 1.8;
    g.fillRect(r() * size, r() * size, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

/** Flat ground plane centred at (x, z). */
export function ground(parent: THREE.Object3D, w: number, d: number, m: THREE.Material, x = 0, z = 0, y = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Ring of rocky, low-poly mountains around the site (one instanced mesh). */
export function mountainRing(parent: THREE.Object3D, o: { count: number; rMin: number; rMax: number; hMin: number; hMax: number; color?: number; seed?: number; cx?: number; cz?: number }) {
  const r = rng(o.seed ?? 7);
  const geo = new THREE.DodecahedronGeometry(1, 1);
  const m = new THREE.InstancedMesh(geo, mat(o.color ?? 0x8c6f55, 0.95, { flatShading: true }), o.count);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < o.count; i++) {
    const a = (i / o.count) * Math.PI * 2 + r() * 0.2;
    const rad = o.rMin + r() * (o.rMax - o.rMin);
    const h = o.hMin + r() * (o.hMax - o.hMin);
    const w = h * (1.4 + r() * 1.2);
    q.setFromEuler(new THREE.Euler(0, r() * Math.PI, 0));
    m4.compose(p.set((o.cx ?? 0) + Math.cos(a) * rad, -h * 0.15, (o.cz ?? 0) + Math.sin(a) * rad), q, s.set(w, h, w * (0.7 + r() * 0.6)));
    m.setMatrixAt(i, m4);
  }
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export interface SignOpts {
  x: number; z: number;
  /** Rotation around y; 0 = the front faces +z. */
  yaw?: number;
  w?: number; h?: number;
  /** Height of the board's bottom edge. */
  y?: number;
  bg?: string; color?: string; size?: number;
  /** Optional text on the back face. */
  back?: string[];
  posts?: boolean;
}

/** Sign board on two posts with text on the front (and optionally the back). */
export function signBoard(parent: THREE.Object3D, lines: string[], o: SignOpts) {
  const g = new THREE.Group();
  const w = o.w ?? 6, h = o.h ?? 2, y = o.y ?? 2.2;
  const px = Math.round((512 * w) / h);
  const W = Math.min(2048, Math.max(256, px));
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(lines, W, 512, o.bg ?? '#11302a', o.color ?? '#ffffff', o.size ?? 120) }));
  front.position.set(0, y + h / 2, 0.06);
  g.add(front);
  const backMat = o.back
    ? new THREE.MeshBasicMaterial({ map: textTexture(o.back, W, 512, o.bg ?? '#11302a', o.color ?? '#ffffff', o.size ?? 120) })
    : mat(0x5b5f63, 0.7);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), backMat);
  back.position.set(0, y + h / 2, -0.06);
  back.rotation.y = Math.PI;
  g.add(back);
  box(g, w + 0.2, h + 0.2, 0.1, 0x3a3f44, 0, y - 0.1, 0, false);
  if (o.posts !== false) for (const s of [-1, 1]) box(g, 0.18, y, 0.18, 0x6b7076, s * (w / 2 - 0.3), 0, 0, false);
  g.position.set(o.x, 0, o.z);
  g.rotation.y = o.yaw ?? 0;
  parent.add(g);
  return g;
}

/** Floating label sprite. */
export function label(parent: THREE.Object3D, text: string, x: number, y: number, z: number, height = 0.8, bg?: string) {
  const l = makeLabel(text, { height, bg });
  l.position.set(x, y, z);
  parent.add(l);
  return l;
}

export interface TentSpot { x: number; z: number }

/**
 * White fire-proof Mina-style tents: square base with a pyramid roof (two instanced meshes).
 * Returns the matching colliders when `collide` is set.
 */
export function tentField(parent: THREE.Object3D, spots: TentSpot[], size = 7, collide = false): Collider[] {
  const baseH = 2.5, roofH = 2.2;
  const base = new THREE.InstancedMesh(new THREE.BoxGeometry(size, baseH, size), mat(0xf6f5f0, 0.7), spots.length);
  const roofGeo = new THREE.ConeGeometry(size / Math.SQRT2 * 1.04, roofH, 4, 1);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.InstancedMesh(roofGeo, mat(0xffffff, 0.6), spots.length);
  const m4 = new THREE.Matrix4();
  const colliders: Collider[] = [];
  spots.forEach((s, i) => {
    base.setMatrixAt(i, m4.makeTranslation(s.x, baseH / 2, s.z));
    roof.setMatrixAt(i, m4.makeTranslation(s.x, baseH + roofH / 2, s.z));
    if (collide) colliders.push(boxCollider(s.x, s.z, size, size));
  });
  base.castShadow = roof.castShadow = true;
  base.receiveShadow = true;
  parent.add(base, roof);
  return colliders;
}

/**
 * Open-sided group tent (the player's own camp): three walls, carpet and a pyramid roof.
 * `open` is the side the player walks in from.
 */
export function pavilion(parent: THREE.Object3D, o: { x: number; z: number; w: number; d: number; open: 'east' | 'west'; title: string[] }): Collider[] {
  const { x, z, w, d } = o;
  const g = new THREE.Group();
  const wall = mat(0xf3f1ea, 0.75, { side: THREE.DoubleSide });
  const h = 3.2;
  const backX = o.open === 'east' ? x - w / 2 : x + w / 2;
  const frontX = o.open === 'east' ? x + w / 2 : x - w / 2;
  box(g, 0.25, h, d, wall, backX, 0, z);
  box(g, w, h, 0.25, wall, x, 0, z - d / 2);
  box(g, w, h, 0.25, wall, x, 0, z + d / 2);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.6, d - 0.6), mat(0x9b2f2f, 0.95));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(x, 0.02, z);
  carpet.receiveShadow = true;
  g.add(carpet);
  // Thin mattresses along the back wall.
  for (let i = 0; i < 5; i++) box(g, 1.8, 0.12, 0.8, mat(0x4f7fa8, 0.9), backX + (o.open === 'east' ? 1.2 : -1.2), 0, z - d / 2 + 1.5 + i * ((d - 3) / 4), false);
  box(g, w + 0.4, 0.3, d + 0.4, mat(0xffffff, 0.6), x, h, z);
  const roofGeo = new THREE.ConeGeometry(Math.max(w, d) / Math.SQRT2 * 1.02, 2.6, 4, 1);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, mat(0xffffff, 0.6));
  roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
  roof.position.set(x, h + 0.3 + 1.3, z);
  roof.castShadow = true;
  g.add(roof);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w, d) * 0.9, 1.3), new THREE.MeshBasicMaterial({ map: textTexture(o.title, 1024, 256, '#11302a', '#f2d06b', o.title.length > 1 ? 84 : 110) }));
  sign.position.set(frontX + (o.open === 'east' ? 0.08 : -0.08), h - 0.2, z);
  sign.rotation.y = o.open === 'east' ? Math.PI / 2 : -Math.PI / 2;
  g.add(sign);
  // A small Thai flag on a pole at the entrance.
  const fx = frontX, fz = z + d / 2 - 0.4;
  box(g, 0.08, 4.6, 0.08, 0xcccccc, fx, 0, fz, false);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ map: thaiFlag(), side: THREE.DoubleSide }));
  flag.position.set(fx, 4.2, fz + 0.62);
  flag.rotation.y = Math.PI / 2;
  g.add(flag);
  parent.add(g);
  const t = 0.3;
  return [
    boxCollider(backX, z, t, d),
    boxCollider(x, z - d / 2, w, t),
    boxCollider(x, z + d / 2, w, t),
  ];
}

function thaiFlag(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 64;
  const g = c.getContext('2d')!;
  const bands = ['#a51931', '#f4f5f8', '#2d2a4a', '#2d2a4a', '#f4f5f8', '#a51931'];
  bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, (i * 64) / 6, 96, 64 / 6 + 1); });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Street / flood light poles with glowing heads (instanced). */
export function lampPosts(parent: THREE.Object3D, spots: TentSpot[], h = 9, color = 0xfff1cf) {
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.16, h, 6), mat(0x8a9097, 0.5, { metalness: 0.4 }), spots.length);
  const head = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.35, 0.9), new THREE.MeshBasicMaterial({ color }), spots.length);
  const m4 = new THREE.Matrix4();
  spots.forEach((s, i) => {
    pole.setMatrixAt(i, m4.makeTranslation(s.x, h / 2, s.z));
    head.setMatrixAt(i, m4.makeTranslation(s.x, h, s.z));
  });
  parent.add(pole, head);
  return { pole, head };
}

/** Neem-like trees (instanced trunk + canopy). */
export function treeField(parent: THREE.Object3D, spots: TentSpot[], seed = 3) {
  const r = rng(seed);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.28, 2.6, 6), mat(0x6b4a33, 0.9), spots.length);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat(0x5f7f3a, 0.9, { flatShading: true }), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  spots.forEach((t, i) => {
    const k = 0.8 + r() * 0.7;
    m4.compose(p.set(t.x, 1.3 * k, t.z), q.identity(), s.set(k, k, k));
    trunk.setMatrixAt(i, m4);
    m4.compose(p.set(t.x, 3.1 * k, t.z), q.setFromEuler(new THREE.Euler(0, r() * 3, 0)), s.set(2.3 * k, 1.6 * k, 2.3 * k));
    crown.setMatrixAt(i, m4);
  });
  trunk.castShadow = crown.castShadow = true;
  parent.add(trunk, crown);
}

/** Night sky: a dome of stars whose opacity follows the time of day. */
export function starField(count = 900) {
  const r = rng(99);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const e = Math.asin(0.08 + r() * 0.92);
    const R = 900;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * R;
    pos[i * 3 + 1] = Math.sin(e) * R;
    pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * R;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const points = new THREE.Points(geo, m);
  points.frustumCulled = false;
  points.visible = false;
  return {
    points,
    setOpacity(v: number) { m.opacity = v; points.visible = v > 0.01; },
  };
}

export interface Lane {
  /** Walking axis. */
  axis: 'x' | 'z';
  /** Range along the axis. */
  from: number; to: number;
  /** Lateral range across the axis. */
  a: number; b: number;
  /** +1 / -1 one way, 0 = both ways. */
  dir: 1 | -1 | 0;
}

/** Pilgrims walking along lanes; returns the per-frame tick. */
export function walkers(parent: THREE.Object3D, n: number, lanes: Lane[], palette = [0xf4f2ec, 0xf4f2ec, 0xf4f2ec, 0x2b2b33, 0xf4f2ec, 0x6c7a8a], seed = 11) {
  const r = rng(seed);
  const crowd = crowdMesh(n, palette);
  parent.add(crowd.body, crowd.head);
  const people = Array.from({ length: n }, (_, i) => {
    const lane = lanes[i % lanes.length];
    const dir = lane.dir === 0 ? (r() < 0.5 ? 1 : -1) : lane.dir;
    return { lane, s: lane.from + r() * (lane.to - lane.from), l: lane.a + r() * (lane.b - lane.a), v: (0.9 + r() * 0.7) * dir };
  });
  const tick = (dt: number) => {
    people.forEach((p, i) => {
      const { from, to, axis } = p.lane;
      p.s += p.v * dt;
      const lo = Math.min(from, to), hi = Math.max(from, to);
      if (p.s > hi) p.s = lo; else if (p.s < lo) p.s = hi;
      if (axis === 'x') placeCrowd(crowd, i, p.s, p.l, p.v > 0 ? Math.PI / 2 : -Math.PI / 2);
      else placeCrowd(crowd, i, p.l, p.s, p.v > 0 ? 0 : Math.PI);
    });
    crowd.body.instanceMatrix.needsUpdate = true;
    crowd.head.instanceMatrix.needsUpdate = true;
  };
  tick(0);
  return tick;
}

/** Pilgrims standing or sitting still in an area (no tick). */
export function standers(parent: THREE.Object3D, spots: { x: number; z: number; yaw?: number }[], palette = [0xf4f2ec, 0xf4f2ec, 0x2b2b33, 0xf4f2ec]) {
  const crowd = crowdMesh(spots.length, palette);
  spots.forEach((s, i) => placeCrowd(crowd, i, s.x, s.z, s.yaw ?? 0));
  parent.add(crowd.body, crowd.head);
  return crowd;
}

/** Scatter n points in a rectangle, skipping any inside the `avoid` boxes. */
export function scatter(n: number, minX: number, maxX: number, minZ: number, maxZ: number, seed: number, avoid: { minX: number; maxX: number; minZ: number; maxZ: number }[] = []) {
  const r = rng(seed);
  const out: TentSpot[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const x = minX + r() * (maxX - minX), z = minZ + r() * (maxZ - minZ);
    if (avoid.some((a) => x > a.minX && x < a.maxX && z > a.minZ && z < a.maxZ)) continue;
    out.push({ x, z });
  }
  return out;
}

/** Qibla from Mina, Arafah, Muzdalifah and the Jamarat: Makkah lies to the west (-x). */
export const QIBLA_WEST = -Math.PI / 2;
