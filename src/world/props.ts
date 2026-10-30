import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { makeLabel, textTexture } from '../engine/label';
import { keepAlive, makeLOD, mergeParts, type PartSpec } from '../engine/lod';
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

export const GOLD = () => mat(0xd6b25a, 0.28, { metalness: 0.78 });

const SHARED_STD_VCOL = () => keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, vertexColors: true }));
const SHARED_CLAY_VCOL = () => keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, vertexColors: true }));
let _stdVCol: THREE.MeshStandardMaterial | null = null;
let _clayVCol: THREE.MeshStandardMaterial | null = null;
function vcolStd() { return _stdVCol ?? (_stdVCol = SHARED_STD_VCOL()); }
function vcolClay() { return _clayVCol ?? (_clayVCol = SHARED_CLAY_VCOL()); }

/**
 * Minaret with 3-tier LOD:
 * - Close (0 m): carved square base with blind arches & cornice, octagonal fluted shaft,
 *   two muqarnas balconies with balustrades, lantern gallery, metallic spire & hilal crescent.
 * - Mid (65 m): clean architectural shaft + balconies + spire.
 * - Far (145 m): soft clay silhouette without shadow casting.
 */
export function minaret(parent: THREE.Object3D, x: number, z: number, o: { h?: number; r?: number; color?: number; cap?: number } = {}): Collider {
  const h = o.h ?? 60, r = o.r ?? 1.5;
  const stoneHex = o.color ?? 0xece4d2;
  const trimHex = new THREE.Color(stoneHex).multiplyScalar(0.88).getHex();
  const darkHex = 0x3b352c;
  const capHex = o.cap ?? 0xc7a456;

  // LOD 0: Rich sculpted minaret (merged stone body + metallic spire/crescent = 2 draw calls)
  const stone0 = mergeParts([
    // Plinth & square base
    { geo: new THREE.BoxGeometry(r * 3.25, h * 0.03, r * 3.25), y: h * 0.015, color: trimHex },
    { geo: new THREE.BoxGeometry(r * 3.0, h * 0.25, r * 3.0), y: h * 0.155, color: stoneHex, aoBottom: 0.86 },
    // Blind arch recesses on all 4 sides of base
    { geo: new THREE.BoxGeometry(r * 1.5, h * 0.16, r * 3.06), y: h * 0.15, color: trimHex },
    { geo: new THREE.BoxGeometry(r * 3.06, h * 0.16, r * 1.5), y: h * 0.15, color: trimHex },
    { geo: new THREE.BoxGeometry(r * 0.65, h * 0.08, r * 3.10), y: h * 0.16, color: darkHex },
    { geo: new THREE.BoxGeometry(r * 3.10, h * 0.08, r * 0.65), y: h * 0.16, color: darkHex },
    // Stepped base cornice + octagonal transition
    { geo: new THREE.BoxGeometry(r * 3.2, h * 0.018, r * 3.2), y: h * 0.285, color: trimHex },
    { geo: new THREE.CylinderGeometry(r * 1.16, r * 1.45, h * 0.05, 8), y: h * 0.315, ry: Math.PI / 8, color: stoneHex },
    // Lower octagonal shaft + window band
    { geo: new THREE.CylinderGeometry(r * 1.0, r * 1.12, h * 0.44, 8), y: h * 0.55, ry: Math.PI / 8, color: stoneHex, aoBottom: 0.9 },
    { geo: new THREE.CylinderGeometry(r * 1.03, r * 1.03, h * 0.035, 8), y: h * 0.42, ry: Math.PI / 8, color: darkHex },
    { geo: new THREE.CylinderGeometry(r * 1.01, r * 1.01, h * 0.035, 8), y: h * 0.64, ry: Math.PI / 8, color: darkHex },
    // First muqarnas balcony + balustrade
    { geo: new THREE.CylinderGeometry(r * 1.55, r * 1.06, 0.75, 12), y: h * 0.495, color: trimHex },
    { geo: new THREE.CylinderGeometry(r * 1.65, r * 1.65, 0.65, 12), y: h * 0.51, color: stoneHex },
    // Second muqarnas balcony + balustrade
    { geo: new THREE.CylinderGeometry(r * 1.48, r * 1.0, 0.75, 12), y: h * 0.715, color: trimHex },
    { geo: new THREE.CylinderGeometry(r * 1.58, r * 1.58, 0.62, 12), y: h * 0.73, color: stoneHex },
    // Upper lantern pavilion with arched louver windows
    { geo: new THREE.CylinderGeometry(r * 0.76, r * 0.84, h * 0.12, 8), y: h * 0.83, ry: Math.PI / 8, color: stoneHex },
    { geo: new THREE.CylinderGeometry(r * 0.79, r * 0.79, h * 0.05, 8), y: h * 0.83, ry: Math.PI / 8, color: darkHex },
    { geo: new THREE.CylinderGeometry(r * 0.92, r * 0.80, 0.45, 8), y: h * 0.895, ry: Math.PI / 8, color: trimHex },
  ]);
  const cap0 = mergeParts([
    { geo: new THREE.ConeGeometry(r * 0.88, h * 0.10, 12), y: h * 0.95, color: capHex },
    { geo: new THREE.CylinderGeometry(r * 0.05, r * 0.07, r * 1.4, 8), y: h + r * 0.55, color: 0xd6b25a },
    { geo: new THREE.SphereGeometry(r * 0.22, 10, 8), y: h + r * 0.22, color: 0xd6b25a },
    { geo: new THREE.SphereGeometry(r * 0.15, 8, 6), y: h + r * 0.68, color: 0xd6b25a },
    { geo: new THREE.SphereGeometry(r * 0.10, 8, 6), y: h + r * 1.04, color: 0xd6b25a },
    { geo: new THREE.TorusGeometry(r * 0.24, r * 0.045, 6, 16, Math.PI * 1.4), y: h + r * 1.42, rz: Math.PI * 0.8, color: 0xe2be62 },
  ]);
  const g0 = new THREE.Group();
  const mStone0 = new THREE.Mesh(stone0, vcolStd());
  mStone0.castShadow = mStone0.receiveShadow = true;
  const mCap0 = new THREE.Mesh(cap0, mat(0xffffff, 0.32, { metalness: 0.65, vertexColors: true }));
  mCap0.castShadow = true;
  g0.add(mStone0, mCap0);

  // LOD 1 (65 m): Clean medium-poly minaret (1 merged mesh)
  const geo1 = mergeParts([
    { geo: new THREE.BoxGeometry(r * 3, h * 0.28, r * 3), y: h * 0.14, color: stoneHex, aoBottom: 0.86 },
    { geo: new THREE.CylinderGeometry(r, r * 1.1, h * 0.5, 8), y: h * 0.53, color: stoneHex },
    { geo: new THREE.CylinderGeometry(r * 1.6, r * 1.6, 0.8, 10), y: h * 0.50, color: trimHex },
    { geo: new THREE.CylinderGeometry(r * 1.55, r * 1.55, 0.8, 10), y: h * 0.72, color: trimHex },
    { geo: new THREE.CylinderGeometry(r * 0.75, r * 0.85, h * 0.12, 8), y: h * 0.84, color: stoneHex },
    { geo: new THREE.ConeGeometry(r * 0.9, h * 0.10, 8), y: h * 0.95, color: capHex },
    { geo: new THREE.SphereGeometry(r * 0.24, 6, 5), y: h + r * 0.3, color: 0xd6b25a },
  ]);
  const m1 = new THREE.Mesh(geo1, vcolStd());

  // LOD 2 (145 m): Soft clay silhouette (no shadow casting)
  const geo2 = mergeParts([
    { geo: new THREE.BoxGeometry(r * 2.9, h * 0.28, r * 2.9), y: h * 0.14, color: stoneHex, aoBottom: 0.85 },
    { geo: new THREE.CylinderGeometry(r * 0.85, r * 1.15, h * 0.62, 6), y: h * 0.59, color: stoneHex },
    { geo: new THREE.ConeGeometry(r * 0.9, h * 0.11, 6), y: h * 0.95, color: capHex },
  ]);
  const m2 = new THREE.Mesh(geo2, vcolClay());

  parent.add(makeLOD(x, 0, z, [[g0, 0], [m1, 65], [m2, 145]]));
  return boxCollider(x, z, r * 3, r * 3);
}

/** Hemispherical dome (optionally stretched upward) with a small gold finial. */
export function dome(parent: THREE.Object3D, x: number, y: number, z: number, r: number, m: THREE.Material, stretch = 1, finial = true) {
  const d = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), m);
  d.position.set(x, y, z);
  d.scale.y = stretch;
  d.castShadow = true;
  d.receiveShadow = true;
  parent.add(d);
  if (finial) {
    cyl(parent, r * 0.035, r * 0.055, r * 0.42, GOLD(), x, y + r * stretch, z, 8);
    const b1 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.075, 10, 8), GOLD());
    b1.position.set(x, y + r * stretch + r * 0.18, z);
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.052, 8, 6), GOLD());
    b2.position.set(x, y + r * stretch + r * 0.36, z);
    parent.add(b1, b2);
  }
  return d;
}

let _palmGeos: { g0: THREE.BufferGeometry; g1: THREE.BufferGeometry; g2: THREE.BufferGeometry } | null = null;
function getPalmGeos() {
  if (_palmGeos) return _palmGeos;
  const H = 7.5;
  const parts0: PartSpec[] = [];
  // Stacked ringed trunk with slight natural curve & bark texture variation
  const segs = 8;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const yMid = ((t0 + t1) * 0.5) * H;
    const bend = Math.sin(t0 * Math.PI * 0.7) * 0.16;
    const rb = 0.29 - t0 * 0.11;
    const rt = 0.29 - t1 * 0.11 + 0.025; // slight diamond leaf-scar ring flare
    parts0.push({
      geo: new THREE.CylinderGeometry(rt, rb, H / segs + 0.04, 9),
      x: bend, y: yMid, rz: -0.025 * (1 - t0),
      color: i % 2 === 0 ? 0x866544 : 0x765739,
      aoBottom: 0.78,
    });
  }
  const topX = Math.sin(0.7 * Math.PI * 0.875) * 0.16;
  // Crown heart + golden-amber date clusters (อินทผลัม)
  parts0.push({ geo: new THREE.SphereGeometry(0.32, 9, 7), x: topX, y: H - 0.05, sy: 0.85, color: 0x5c422a });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    parts0.push({
      geo: new THREE.SphereGeometry(0.19, 7, 6),
      x: topX + Math.cos(a) * 0.34, y: H - 0.28, z: Math.sin(a) * 0.34,
      sx: 0.8, sy: 1.35, sz: 0.8, color: 0xc9882c, aoBottom: 0.75,
    });
  }
  // 11 gracefully arched multi-segment palm fronds
  const nFronds = 11;
  for (let i = 0; i < nFronds; i++) {
    const az = (i / nFronds) * Math.PI * 2 + (i % 2) * 0.12;
    const upperTier = i % 2 === 0;
    const baseTilt = upperTier ? 0.55 : 0.92;
    const col = upperTier ? 0x4b863e : 0x3b6e32;
    const ca = Math.cos(az), sa = Math.sin(az);
    // 3 arched segments along each frond
    let rDist = 0.15, curY = H + 0.05;
    for (let s = 0; s < 3; s++) {
      const len = 1.05 - s * 0.08;
      const pitch = baseTilt + s * 0.42;
      const dr = Math.sin(pitch) * len;
      const dy = Math.cos(pitch) * len;
      const mx = topX + ca * (rDist + dr * 0.5);
      const mz = sa * (rDist + dr * 0.5);
      const my = curY + dy * 0.5;
      const w = s === 0 ? 0.42 : s === 1 ? 0.62 : 0.34;
      // Two V-angled leaflet planes forming a crisp 3D palm frond
      for (const vSign of [-1, 1]) {
        parts0.push({
          geo: new THREE.BoxGeometry(w * 0.52, 0.028, len + 0.06),
          x: mx - sa * vSign * w * 0.2, y: my, z: mz + ca * vSign * w * 0.2,
          ry: Math.atan2(ca, sa), rx: pitch - Math.PI / 2, rz: vSign * 0.28,
          color: s === 2 ? 0x569146 : col, aoBottom: 0.84,
        });
      }
      rDist += dr;
      curY += dy;
    }
  }
  const g0 = keepAlive(mergeParts(parts0));

  // LOD 1 (35 m): Simple trunk + 7 curved frond blades
  const parts1: PartSpec[] = [
    { geo: new THREE.CylinderGeometry(0.18, 0.28, H, 7), y: H / 2, color: 0x826242, aoBottom: 0.8 },
  ];
  for (let i = 0; i < 7; i++) {
    const az = (i / 7) * Math.PI * 2;
    const ca = Math.cos(az), sa = Math.sin(az);
    parts1.push({
      geo: new THREE.BoxGeometry(0.58, 0.04, 2.7),
      x: ca * 1.25, y: H - 0.15, z: sa * 1.25,
      ry: Math.atan2(ca, sa), rx: 0.22, color: i % 2 ? 0x49823c : 0x3c6f32,
    });
  }
  const g1 = keepAlive(mergeParts(parts1));

  // LOD 2 (80 m): Soft clay palm silhouette (~28 tris, no shadow)
  const g2 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.17, 0.29, H, 5), y: H / 2, color: 0x826242, aoBottom: 0.8 },
    { geo: new THREE.SphereGeometry(2.1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.62), y: H - 0.4, sy: 0.58, color: 0x447838, aoBottom: 0.78 },
  ]));

  _palmGeos = { g0, g1, g2 };
  return _palmGeos;
}

/** Date palm with curved ringed trunk, date clusters, arched 3D fronds and 3-tier clay LOD. */
export function palm(parent: THREE.Object3D, x: number, z: number, h = 7): Collider {
  const { g0, g1, g2 } = getPalmGeos();
  const s = h / 7.5;
  const sXZ = 0.92 + (s - 1) * 0.5;
  const yaw = ((Math.abs(Math.sin(x * 12.9898 + z * 78.233)) * 43758.5453) % 1) * Math.PI * 2;

  const m0 = new THREE.Mesh(g0, vcolStd());
  m0.castShadow = m0.receiveShadow = true;
  const m1 = new THREE.Mesh(g1, vcolStd());
  const m2 = new THREE.Mesh(g2, vcolClay());

  const lod = makeLOD(x, 0, z, [[m0, 0], [m1, 35], [m2, 80]]);
  lod.scale.set(sXZ, s, sXZ);
  lod.rotation.y = yaw;
  parent.add(lod);
  return { kind: 'circle', x, z, r: 0.35 };
}

/** Wall texture with blind arches and arched windows (one tile ≈ 8 m wide). */
export function archTexture(base = '#e9dfcc', frame = '#b99a68', glass = '#3e4a3f'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 512);
  // Subtle ashlar stone course lines
  g.strokeStyle = 'rgba(110,92,66,0.09)';
  g.lineWidth = 1;
  for (let y = 24; y < 512; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }

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
    // Subtle inner mashrabiya / mullion grid inside window
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(220,195,145,0.22)';
    g.lineWidth = 2;
    for (let gx = x + 24; gx < x + w; gx += 24) { g.beginPath(); g.moveTo(gx, y); g.lineTo(gx, y + h); g.stroke(); }
    for (let gy = y + 28; gy < y + h; gy += 28) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x + w, gy); g.stroke(); }
    g.restore();
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
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Carpet with prayer-row bands and ornamental mihrab border (one tile ≈ 1.25 m). */
export function carpetTexture(base: string, band: string, motif: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = band;
  g.fillRect(0, 0, 128, 12);
  g.strokeStyle = motif;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(20, 22); g.lineTo(20, 96); g.arc(64, 96, 44, Math.PI, 0, true); g.lineTo(108, 22);
  g.stroke();
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(64, 62, 12, 0, Math.PI * 2);
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

let _busGeos: { chassis0: THREE.BufferGeometry; glass0: THREE.BufferGeometry; g1: THREE.BufferGeometry; g2: THREE.BufferGeometry; glassMat: THREE.MeshStandardMaterial } | null = null;
function getBusGeos() {
  if (_busGeos) return _busGeos;
  // Local bus coordinates: length 11 m along Z (+z front, -z rear), width 2.8 m along X.
  const parts0: PartSpec[] = [
    // Main white coach body + rounded roofline + lower skirt
    { geo: new THREE.BoxGeometry(2.76, 2.48, 10.8), y: 1.72, color: 0xf4f3ef, aoBottom: 0.86 },
    { geo: new THREE.CylinderGeometry(1.36, 1.36, 10.6, 12, 1, false, -0.45, 0.9), y: 1.85, rx: Math.PI / 2, sy: 1, sx: 1, sz: 1, color: 0xf8f7f4 },
    // Front & rear bumpers (dark charcoal)
    { geo: new THREE.BoxGeometry(2.82, 0.36, 0.35), y: 0.62, z: 5.36, color: 0x32363b },
    { geo: new THREE.BoxGeometry(2.82, 0.38, 0.30), y: 0.62, z: -5.36, color: 0x32363b },
    // Rooftop dual AC pods
    { geo: new THREE.BoxGeometry(1.85, 0.26, 2.6), y: 3.06, z: 1.1, color: 0xe6e5e0 },
    { geo: new THREE.BoxGeometry(1.75, 0.22, 1.9), y: 3.04, z: -2.1, color: 0xe6e5e0 },
    // Headlights (warm white) + amber indicators + red taillights
    { geo: new THREE.BoxGeometry(0.42, 0.18, 0.08), x: -1.02, y: 0.96, z: 5.42, color: 0xfff8e2 },
    { geo: new THREE.BoxGeometry(0.42, 0.18, 0.08), x: 1.02, y: 0.96, z: 5.42, color: 0xfff8e2 },
    { geo: new THREE.BoxGeometry(0.18, 0.14, 0.08), x: -1.28, y: 0.96, z: 5.41, color: 0xf2a22c },
    { geo: new THREE.BoxGeometry(0.18, 0.14, 0.08), x: 1.28, y: 0.96, z: 5.41, color: 0xf2a22c },
    { geo: new THREE.BoxGeometry(0.32, 0.48, 0.08), x: -1.16, y: 1.12, z: -5.42, color: 0xc92a2a },
    { geo: new THREE.BoxGeometry(0.32, 0.48, 0.08), x: 1.16, y: 1.12, z: -5.42, color: 0xc92a2a },
    // Rear engine louver grille
    { geo: new THREE.BoxGeometry(1.5, 0.65, 0.06), y: 1.02, z: -5.41, color: 0x45494e },
    // Front wing mirrors (stalks + mirror housings)
    { geo: new THREE.BoxGeometry(0.28, 0.06, 0.35), x: -1.48, y: 2.35, z: 5.35, color: 0x222528 },
    { geo: new THREE.BoxGeometry(0.12, 0.42, 0.18), x: -1.60, y: 2.18, z: 5.48, color: 0x222528 },
    { geo: new THREE.BoxGeometry(0.28, 0.06, 0.35), x: 1.48, y: 2.35, z: 5.35, color: 0x222528 },
    { geo: new THREE.BoxGeometry(0.12, 0.42, 0.18), x: 1.60, y: 2.18, z: 5.48, color: 0x222528 },
  ];
  // 6 wheels (front axle + dual-look rear tag axle) with dark rubber tires & silver alloy rims
  for (const sx of [-1, 1]) {
    for (const wz of [3.35, -2.85, -4.05]) {
      parts0.push({ geo: new THREE.CylinderGeometry(0.50, 0.50, 0.34, 16), x: sx * 1.28, y: 0.50, z: wz, rz: Math.PI / 2, color: 0x1d1e20 });
      parts0.push({ geo: new THREE.CylinderGeometry(0.29, 0.29, 0.36, 12), x: sx * 1.29, y: 0.50, z: wz, rz: Math.PI / 2, color: 0xc8cdd2 });
      parts0.push({ geo: new THREE.CylinderGeometry(0.11, 0.11, 0.38, 8), x: sx * 1.30, y: 0.50, z: wz, rz: Math.PI / 2, color: 0x525860 });
    }
  }
  const chassis0 = keepAlive(mergeParts(parts0));

  const glass0 = keepAlive(mergeParts([
    // Tinted side panoramic windows
    { geo: new THREE.BoxGeometry(2.80, 0.92, 9.8), y: 2.28, z: 0.1, color: 0x1e303c },
    // Tall front panoramic windshield + destination header
    { geo: new THREE.BoxGeometry(2.58, 1.26, 0.12), y: 2.18, z: 5.38, rx: -0.06, color: 0x1b2c38 },
    // Rear window
    { geo: new THREE.BoxGeometry(2.36, 0.78, 0.10), y: 2.28, z: -5.38, color: 0x1b2c38 },
  ]));

  const g1 = keepAlive(mergeParts([
    { geo: new THREE.BoxGeometry(2.78, 2.55, 10.8), y: 1.72, color: 0xf2f2ee, aoBottom: 0.85 },
    { geo: new THREE.BoxGeometry(2.82, 0.88, 9.8), y: 2.28, color: 0x243642 },
    { geo: new THREE.CylinderGeometry(0.48, 0.48, 2.86, 8), y: 0.48, z: 3.35, rz: Math.PI / 2, color: 0x1e1e20 },
    { geo: new THREE.CylinderGeometry(0.48, 0.48, 2.86, 8), y: 0.48, z: -3.45, rz: Math.PI / 2, color: 0x1e1e20 },
  ]));

  const g2 = keepAlive(mergeParts([
    { geo: new THREE.BoxGeometry(2.76, 2.65, 10.8), y: 1.62, color: 0xeeede8, aoBottom: 0.82 },
    { geo: new THREE.BoxGeometry(2.80, 0.82, 9.4), y: 2.24, color: 0x2c3c46 },
  ]));

  const glassMat = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0.35, vertexColors: true }));
  _busGeos = { chassis0, glass0, g1, g2, glassMat };
  return _busGeos;
}

/** Tour bus (detailed close model -> mid -> clay far model + collider), long side along x or z. */
export function bus(parent: THREE.Object3D, x: number, z: number, alongX: boolean, color = 0x2f7a5c): Collider {
  const w = alongX ? 11 : 2.8, d = alongX ? 2.8 : 11;
  const { chassis0, glass0, g1, g2, glassMat } = getBusGeos();
  const stripeMat = mat(color, 0.42, { metalness: 0.15 });

  const lod0 = new THREE.Group();
  const ch = new THREE.Mesh(chassis0, vcolStd());
  ch.castShadow = ch.receiveShadow = true;
  const gl = new THREE.Mesh(glass0, glassMat);
  const st = new THREE.Mesh(new THREE.BoxGeometry(2.81, 0.44, 10.82), stripeMat);
  st.position.y = 1.42;
  st.castShadow = true;
  lod0.add(ch, gl, st);

  const lod1 = new THREE.Group();
  const m1 = new THREE.Mesh(g1, vcolStd());
  const st1 = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.44, 10.82), stripeMat);
  st1.position.y = 1.42;
  lod1.add(m1, st1);

  const m2 = new THREE.Mesh(g2, vcolClay());

  const lod = makeLOD(x, 0, z, [[lod0, 0], [lod1, 42], [m2, 95]]);
  if (alongX) lod.rotation.y = Math.PI / 2;
  parent.add(lod);
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
