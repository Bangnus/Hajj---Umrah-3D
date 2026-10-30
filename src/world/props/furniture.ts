import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { makeLabel, textTexture } from '../../engine/label';
import { crowdMesh, mat, placeCrowd, type Scene3D } from '../common';

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

/** Frustum-culled multi-LOD crowd: static people plus walkers on straight lanes. Returns the tick. */
export function people(parent: THREE.Object3D, list: Person[], palette: number[]): (dt: number) => void {
  if (!list.length) return () => {};
  const c = crowdMesh(list.length, palette);
  parent.add(c.group);
  list.forEach((p, i) => placeCrowd(c, i, p.x, p.z, p.yaw, 0, !!(p.axis && p.v)));
  const moving = list.map((p, i) => [p, i] as const).filter(([p]) => p.axis && p.v);
  return (dt) => {
    if (!moving.length) return;
    for (const [p, i] of moving) {
      const lo = p.min ?? -1e4, hi = p.max ?? 1e4, v = p.v!;
      if (p.axis === 'x') { p.x += v * dt; if (p.x > hi) p.x = lo; if (p.x < lo) p.x = hi; p.yaw = v > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { p.z += v * dt; if (p.z > hi) p.z = lo; if (p.z < lo) p.z = hi; p.yaw = v > 0 ? 0 : Math.PI; }
      placeCrowd(c, i, p.x, p.z, p.yaw, 0, true);
    }
  };
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Travelling pilgrims' clothing (mixed) and ihram-heavy palettes. */
export const PALETTE_TRAVEL = [0xf4f2ec, 0x1f1f24, 0xf4f2ec, 0x6a7b8c, 0x2b2b33, 0xe8e2d4, 0x8a6f55, 0xf4f2ec, 0x3a4f6b];
export const PALETTE_IHRAM = [0xf4f2ec, 0xf4f2ec, 0xf4f2ec, 0x1f1f24, 0xf4f2ec, 0x2b2b33, 0xf4f2ec];
