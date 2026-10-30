import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { createCrowdLOD, type CrowdHandle } from '../engine/lod';

export type { CrowdHandle };

export interface Scene3D {
  group: THREE.Group;
  colliders: Collider[];
  /** Per-frame animation (crowds, lights). */
  tick?: (dt: number) => void;
}

export function mat(color: number, rough = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
}

export function box(parent: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material | number, x = 0, y = 0, z = 0, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'number' ? mat(m) : m);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cyl(parent: THREE.Object3D, rt: number, rb: number, h: number, m: THREE.Material | number, x = 0, y = 0, z = 0, seg = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof m === 'number' ? mat(m) : m);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Solid box collider matching an axis-aligned footprint. */
export function boxCollider(x: number, z: number, w: number, d: number, pad = 0): Collider {
  return { kind: 'box', minX: x - w / 2 - pad, maxX: x + w / 2 + pad, minZ: z - d / 2 - pad, maxZ: z + d / 2 + pad };
}

export function floor(parent: THREE.Object3D, w: number, d: number, m: THREE.Material, x = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Procedural marble/tile texture with subtle per-slab tone variation and natural veining. */
export function tileTexture(base: string, line: string, tiles = 8, size = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);

  const s = size / tiles;
  // Subtle natural slab-to-slab shade variation
  let seed = (tiles * 131 + size) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const v = rnd();
      g.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * 0.055})` : `rgba(90,82,70,${(0.5 - v) * 0.045})`;
      g.fillRect(tx * s, ty * s, s, s);
    }
  }

  // Soft natural marble veins
  for (let i = 0; i < 48; i++) {
    g.strokeStyle = `rgba(145,142,136,${0.018 + rnd() * 0.05})`;
    g.lineWidth = 0.8 + rnd() * 2.2;
    g.beginPath();
    const x0 = rnd() * size, y0 = rnd() * size;
    g.moveTo(x0, y0);
    g.bezierCurveTo(x0 + (rnd() - 0.5) * 180, y0 + (rnd() - 0.5) * 180, rnd() * size, rnd() * size, rnd() * size, rnd() * size);
    g.stroke();
  }

  // Crisp grout lines + faint highlight bevel
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = 1;
  for (let i = 0; i <= tiles; i++) {
    g.beginPath(); g.moveTo(i * s + 1, 0); g.lineTo(i * s + 1, size); g.stroke();
    g.beginPath(); g.moveTo(0, i * s + 1); g.lineTo(size, i * s + 1); g.stroke();
  }
  g.strokeStyle = line;
  g.lineWidth = 1.8;
  for (let i = 0; i <= tiles; i++) {
    g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, size); g.stroke();
    g.beginPath(); g.moveTo(0, i * s); g.lineTo(size, i * s); g.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Multi-tier LOD + frustum-culled crowd of pilgrims (sculpted close, smooth mid, clay far). */
export function crowdMesh(count: number, palette: number[]): CrowdHandle {
  return createCrowdLOD(count, palette);
}

export function placeCrowd(c: CrowdHandle, i: number, x: number, z: number, yaw: number, y = 0, moving = false) {
  c.place(i, x, z, yaw, y, moving);
}
