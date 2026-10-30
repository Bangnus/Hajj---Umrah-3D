import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { makeLOD, mergeParts } from '../../engine/lod';
import { box, boxCollider, cyl, mat } from '../common';
import { GOLD, vcolClay, vcolStd } from './materials';

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
