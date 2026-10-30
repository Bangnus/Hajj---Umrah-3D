import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { makeLabel, textTexture } from '../engine/label';
import { box, boxCollider, crowdMesh, cyl, mat, placeCrowd, type Scene3D } from './common';

/** Shared props and helpers for the Madinah / Bir Ali / return-home worlds. */

export type Shape =
  | { kind: 'rect-in'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: 'disc-in'; x: number; z: number; r: number };

/**
 * One mutable "keep inside" collider. A stage with several areas (teleports) pushes
 * this single collider and switches its shape, instead of stacking every area's
 * rect-in (which would trap the player in their intersection).
 */
export class Zone {
  readonly collider: Collider = { kind: 'rect-in', minX: -1e5, maxX: 1e5, minZ: -1e5, maxZ: 1e5 };
  set(s: Shape | null) {
    if (!s) return;
    const c = this.collider as unknown as Record<string, unknown>;
    for (const k of Object.keys(c)) delete c[k];
    Object.assign(c, s);
  }
}

/** Move a built scene by (dx, dz); keep-inside colliders are returned separately (for a Zone). */
export function relocate(s: Scene3D, dx: number, dz: number): { scene: Scene3D; shape: Shape | null } {
  s.group.position.x += dx;
  s.group.position.z += dz;
  const colliders: Collider[] = [];
  let shape: Shape | null = null;
  for (const c of s.colliders) {
    switch (c.kind) {
      case 'box': colliders.push({ ...c, minX: c.minX + dx, maxX: c.maxX + dx, minZ: c.minZ + dz, maxZ: c.maxZ + dz }); break;
      case 'rect-in': shape = { ...c, minX: c.minX + dx, maxX: c.maxX + dx, minZ: c.minZ + dz, maxZ: c.maxZ + dz }; break;
      case 'disc-in': shape = { ...c, x: c.x + dx, z: c.z + dz }; break;
      default: colliders.push({ ...c, x: c.x + dx, z: c.z + dz });
    }
  }
  return { scene: { group: s.group, colliders, tick: s.tick }, shape };
}

export const GOLD = () => mat(0xd6b25a, 0.3, { metalness: 0.75 });

/** Minaret: square base, octagonal shaft, two balconies, pointed cap and finial. */
export function minaret(parent: THREE.Object3D, x: number, z: number, o: { h?: number; r?: number; color?: number; cap?: number } = {}): Collider {
  const h = o.h ?? 60, r = o.r ?? 1.5;
  const white = mat(o.color ?? 0xece4d2, 0.6);
  box(parent, r * 3, h * 0.28, r * 3, white, x, 0, z);
  cyl(parent, r, r * 1.1, h * 0.5, white, x, h * 0.28, z, 8);
  cyl(parent, r * 1.6, r * 1.6, 0.8, white, x, h * 0.5, z, 12);
  cyl(parent, r * 1.6, r * 1.6, 0.8, white, x, h * 0.72, z, 12);
  cyl(parent, r * 0.75, r * 0.85, h * 0.12, white, x, h * 0.78, z, 8);
  const top = new THREE.Mesh(new THREE.ConeGeometry(r * 0.9, h * 0.1, 8), mat(o.cap ?? 0xc7a456, 0.35, { metalness: 0.6 }));
  top.position.set(x, h * 0.95, z);
  top.castShadow = true;
  parent.add(top);
  const fin = new THREE.Mesh(new THREE.SphereGeometry(r * 0.25, 10, 8), GOLD());
  fin.position.set(x, h + r * 0.2, z);
  parent.add(fin);
  return boxCollider(x, z, r * 3, r * 3);
}

/** Hemispherical dome (optionally stretched upward) with a small gold finial. */
export function dome(parent: THREE.Object3D, x: number, y: number, z: number, r: number, m: THREE.Material, stretch = 1, finial = true) {
  const d = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), m);
  d.position.set(x, y, z);
  d.scale.y = stretch;
  d.castShadow = true;
  parent.add(d);
  if (finial) {
    cyl(parent, r * 0.04, r * 0.06, r * 0.35, GOLD(), x, y + r * stretch, z, 8);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(r * 0.08, 10, 8), GOLD());
    ball.position.set(x, y + r * stretch + r * 0.38, z);
    parent.add(ball);
  }
  return d;
}

/** Date palm: trunk + drooping fronds. */
export function palm(parent: THREE.Object3D, x: number, z: number, h = 7): Collider {
  cyl(parent, 0.17, 0.28, h, mat(0x8a6a48, 0.95), x, 0, z, 7);
  const geo = new THREE.PlaneGeometry(0.75, 3.4);
  geo.translate(0, 1.7, 0);
  const leaf = mat(0x47803d, 0.8, { side: THREE.DoubleSide });
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(geo, leaf);
    m.position.set(x, h, z);
    m.rotation.set(1.75 + (i % 2) * 0.35, (i / 8) * Math.PI * 2, 0, 'YXZ');
    m.castShadow = true;
    parent.add(m);
  }
  return { kind: 'circle', x, z, r: 0.35 };
}

/** Wall texture with blind arches and arched windows (one tile ≈ 8 m wide). */
export function archTexture(base = '#e9dfcc', frame = '#b99a68', glass = '#3e4a3f'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 512);
  const arch = (x: number, y: number, w: number, h: number) => {
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(x, y + w / 2);
    g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    g.lineTo(x + w, y + h);
    g.closePath();
    g.fillStyle = glass;
    g.fill();
    g.lineWidth = 9;
    g.strokeStyle = frame;
    g.stroke();
  };
  arch(56, 70, 144, 170);
  arch(40, 300, 176, 212);
  g.fillStyle = frame;
  g.fillRect(0, 0, 256, 16);
  g.fillRect(0, 268, 256, 8);
  // Vertical pilasters at the tile edges.
  g.fillStyle = 'rgba(120,100,70,0.18)';
  g.fillRect(0, 0, 10, 512);
  g.fillRect(246, 0, 10, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Carpet with prayer-row bands (one tile ≈ 1.25 m). */
export function carpetTexture(base: string, band: string, motif: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = band;
  g.fillRect(0, 0, 128, 10);
  g.strokeStyle = motif;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(24, 26); g.lineTo(24, 96); g.arc(64, 96, 40, Math.PI, 0, true); g.lineTo(104, 26);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Diamond lattice (brass grille) texture; transparent background when bg is null. */
export function latticeTexture(bg: string | null, line: string, cell = 32): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, 256, 256); }
  g.strokeStyle = line;
  g.lineWidth = 4;
  for (let i = -256; i <= 512; i += cell) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke();
    g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 256, 0); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Material whose texture repeats every `tile` metres along a wall of length `len`. */
export function repeatMat(tex: THREE.Texture, len: number, tile: number, rough = 0.7): THREE.MeshStandardMaterial {
  const t = tex.clone();
  t.repeat.set(Math.max(1, Math.round(len / tile)), 1);
  t.needsUpdate = true;
  return mat(0xffffff, rough, { map: t });
}

/**
 * Wall running along the x axis (axis 'x', fixed z) or the z axis (fixed x) from `a` to `b`,
 * with door gaps [from, to]. Gaps get a lintel above `doorH`. Pushes box colliders.
 */
export function wallRun(
  parent: THREE.Object3D, colliders: Collider[], axis: 'x' | 'z', fixed: number, a: number, b: number,
  gaps: [number, number][], h: number, thick: number, tex: THREE.Texture, doorH = 6,
) {
  const cuts = [...gaps].sort((p, q) => p[0] - q[0]);
  const segs: [number, number][] = [];
  let s = a;
  for (const [g0, g1] of cuts) { if (g0 > s) segs.push([s, g0]); s = g1; }
  if (b > s) segs.push([s, b]);
  const place = (from: number, to: number, y: number, hh: number, solid: boolean) => {
    const len = to - from, mid = (from + to) / 2;
    const m = repeatMat(tex, len, 8);
    if (axis === 'x') {
      box(parent, len, hh, thick, m, mid, y, fixed);
      if (solid) colliders.push(boxCollider(mid, fixed, len, thick));
    } else {
      box(parent, thick, hh, len, m, fixed, y, mid);
      if (solid) colliders.push(boxCollider(fixed, mid, thick, len));
    }
  };
  for (const [p, q] of segs) place(p, q, 0, h, true);
  for (const [g0, g1] of cuts) if (h > doorH) place(g0, g1, doorH, h - doorH, false);
}

/** Flat sign (text texture on a plane). Faces +z unless rotated. */
export function sign(parent: THREE.Object3D, lines: string[], w: number, h: number, x: number, y: number, z: number, rotY = 0, bg = '#0d3b2e', fg = '#f2d06b') {
  const px = 1024, py = Math.round((1024 * h) / w);
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(84, Math.floor(py / (lines.length * 1.35)), Math.floor((px * 0.92) / (longest * 0.55)));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(lines, px, py, bg, fg, size) }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  parent.add(m);
  return m;
}

export function label(parent: THREE.Object3D, text: string, x: number, y: number, z: number, height = 0.7) {
  const l = makeLabel(text, { height });
  l.position.set(x, y, z);
  parent.add(l);
  return l;
}

/** Tour bus (visual + collider), long side along x or z. */
export function bus(parent: THREE.Object3D, x: number, z: number, alongX: boolean, color = 0x2f7a5c): Collider {
  const w = alongX ? 11 : 2.8, d = alongX ? 2.8 : 11;
  box(parent, w, 2.6, d, mat(0xf2f2ee, 0.4), x, 0.5, z);
  box(parent, alongX ? w : 2.9, 0.5, alongX ? 2.9 : d, mat(color, 0.5), x, 1.0, z);
  box(parent, alongX ? w - 1 : 2.86, 0.8, alongX ? 2.86 : d - 1, mat(0x253844, 0.15), x, 2.0, z);
  for (const s of [-1, 1]) for (const t of [-1, 1]) {
    const wx = alongX ? x + s * 3.6 : x + t * 1.3, wz = alongX ? z + t * 1.3 : z + s * 3.6;
    const wh = cyl(parent, 0.5, 0.5, 0.35, 0x1d1d1d, wx, 0.5, wz, 12);
    wh.position.y = 0.5;
    if (alongX) wh.rotation.x = Math.PI / 2; else wh.rotation.z = Math.PI / 2;
  }
  return boxCollider(x, z, w, d);
}

/** Ground plane (large, slightly below 0 so detailed floors win). */
export function ground(parent: THREE.Object3D, size: number, color: number, x = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat(color, 1));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, -0.02, z);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Floor patch at a small height offset (avoids z-fighting between layered floors). */
export function patch(parent: THREE.Object3D, w: number, d: number, m: THREE.Material, x: number, z: number, y = 0.01) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  f.rotation.x = -Math.PI / 2;
  f.position.set(x, y, z);
  f.receiveShadow = true;
  parent.add(f);
  return f;
}

export interface Person {
  x: number; z: number; yaw: number;
  /** Walkers move along one axis and wrap between min and max. */
  axis?: 'x' | 'z';
  v?: number;
  min?: number;
  max?: number;
}

/** Instanced crowd: static people plus walkers on straight lanes. Returns the tick. */
export function people(parent: THREE.Object3D, list: Person[], palette: number[]): (dt: number) => void {
  if (!list.length) return () => {};
  const c = crowdMesh(list.length, palette);
  parent.add(c.body, c.head);
  list.forEach((p, i) => placeCrowd(c, i, p.x, p.z, p.yaw));
  const moving = list.map((p, i) => [p, i] as const).filter(([p]) => p.axis && p.v);
  return (dt) => {
    if (!moving.length) return;
    for (const [p, i] of moving) {
      const lo = p.min ?? -1e4, hi = p.max ?? 1e4, v = p.v!;
      if (p.axis === 'x') { p.x += v * dt; if (p.x > hi) p.x = lo; if (p.x < lo) p.x = hi; p.yaw = v > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { p.z += v * dt; if (p.z > hi) p.z = lo; if (p.z < lo) p.z = hi; p.yaw = v > 0 ? 0 : Math.PI; }
      placeCrowd(c, i, p.x, p.z, p.yaw);
    }
    c.body.instanceMatrix.needsUpdate = true;
    c.head.instanceMatrix.needsUpdate = true;
  };
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Travelling pilgrims' clothing (mixed) and ihram-heavy palettes. */
export const PALETTE_TRAVEL = [0xf4f2ec, 0x1f1f24, 0xf4f2ec, 0x6a7b8c, 0x2b2b33, 0xe8e2d4, 0x8a6f55, 0xf4f2ec, 0x3a4f6b];
export const PALETTE_IHRAM = [0xf4f2ec, 0xf4f2ec, 0xf4f2ec, 0x1f1f24, 0xf4f2ec, 0x2b2b33, 0xf4f2ec];
