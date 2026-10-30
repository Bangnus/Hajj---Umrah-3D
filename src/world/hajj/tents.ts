import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { createPropFieldLOD, keepAlive, mergeParts, type PropInstance } from '../../engine/lod';
import { boxCollider } from '../common';

export interface TentSpot { x: number; z: number }

let _tentAssets: { g0: THREE.BufferGeometry; g1: THREE.BufferGeometry; g2: THREE.BufferGeometry; matStd: THREE.MeshStandardMaterial; matClay: THREE.MeshStandardMaterial } | null = null;
function getTentAssets() {
  if (_tentAssets) return _tentAssets;
  // Built at unit footprint 1 x 1 (scaled by sx=size, sz=size, sy=1) with baseH=2.5, roofH=2.2.
  const baseH = 2.5, roofH = 2.2;
  const g0 = keepAlive(mergeParts([
    // Fire-proof Teflon fabric walls with natural ground shadow AO
    { geo: new THREE.BoxGeometry(0.98, baseH, 0.98), y: baseH / 2, color: 0xf6f4ee, aoBottom: 0.82 },
    // Lower sand skirt band
    { geo: new THREE.BoxGeometry(1.00, 0.24, 1.00), y: 0.12, color: 0xdad4c6 },
    // 4 structural corner posts
    { geo: new THREE.BoxGeometry(0.035, baseH + 0.04, 0.035), x: -0.485, y: baseH / 2, z: -0.485, color: 0xe2dfd7 },
    { geo: new THREE.BoxGeometry(0.035, baseH + 0.04, 0.035), x: 0.485, y: baseH / 2, z: -0.485, color: 0xe2dfd7 },
    { geo: new THREE.BoxGeometry(0.035, baseH + 0.04, 0.035), x: -0.485, y: baseH / 2, z: 0.485, color: 0xe2dfd7 },
    { geo: new THREE.BoxGeometry(0.035, baseH + 0.04, 0.035), x: 0.485, y: baseH / 2, z: 0.485, color: 0xe2dfd7 },
    // Entrance flap & trim on front (+z)
    { geo: new THREE.BoxGeometry(0.20, 1.95, 0.025), y: 0.98, z: 0.492, color: 0xeae6dc },
    { geo: new THREE.BoxGeometry(0.24, 0.08, 0.035), y: 1.98, z: 0.495, color: 0x2a6950 },
    // Overhanging eaves cornice
    { geo: new THREE.BoxGeometry(1.05, 0.14, 1.05), y: baseH + 0.05, color: 0xeeece6 },
    // Pitched pyramid roof
    { geo: new THREE.ConeGeometry(1 / Math.SQRT2 * 1.05, roofH, 4, 1), y: baseH + 0.10 + roofH / 2, ry: Math.PI / 4, color: 0xfcfbf8, aoBottom: 0.90 },
    // Iconic Mina rooftop square ventilation lantern cupola
    { geo: new THREE.BoxGeometry(0.16, 0.34, 0.16), y: baseH + roofH + 0.02, color: 0xe2dfd7 },
    { geo: new THREE.ConeGeometry(0.14, 0.24, 4, 1), y: baseH + roofH + 0.30, ry: Math.PI / 4, color: 0xffffff },
    // Side desert AC unit box + duct
    { geo: new THREE.BoxGeometry(0.11, 0.58, 0.14), x: 0.52, y: 1.75, z: 0.08, color: 0xd0d4d8 },
    { geo: new THREE.BoxGeometry(0.03, 0.38, 0.10), x: 0.578, y: 1.75, z: 0.08, color: 0x5c636a },
  ]));

  const g1 = keepAlive(mergeParts([
    { geo: new THREE.BoxGeometry(0.99, baseH, 0.99), y: baseH / 2, color: 0xf5f4ee, aoBottom: 0.84 },
    { geo: new THREE.ConeGeometry(1 / Math.SQRT2 * 1.04, roofH, 4, 1), y: baseH + roofH / 2, ry: Math.PI / 4, color: 0xffffff },
    { geo: new THREE.BoxGeometry(0.15, 0.30, 0.15), y: baseH + roofH + 0.05, color: 0xe5e3dc },
  ]));

  // Far clay silhouette (~10 tris per tent!)
  const g2 = keepAlive(mergeParts([
    { geo: new THREE.BoxGeometry(0.99, baseH, 0.99), y: baseH / 2, color: 0xf3f1ea, aoBottom: 0.84 },
    { geo: new THREE.ConeGeometry(1 / Math.SQRT2 * 1.03, roofH, 4, 1), y: baseH + roofH / 2, ry: Math.PI / 4, color: 0xfaf9f5 },
  ]));

  const matStd = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68, vertexColors: true }));
  const matClay = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, vertexColors: true }));
  _tentAssets = { g0, g1, g2, matStd, matClay };
  return _tentAssets;
}

/**
 * White fire-proof Mina-style tents with frustum culling + 3-tier LOD:
 * Close (< 48 m): paneled tent with door flap, eaves, roof lantern & side AC unit.
 * Mid (48–115 m): clean tent + pyramid roof.
 * Far (> 115 m): 10-triangle clay silhouette without shadow casting.
 */
export function tentField(parent: THREE.Object3D, spots: TentSpot[], size = 7, collide = false): Collider[] {
  const { g0, g1, g2, matStd, matClay } = getTentAssets();
  const colliders: Collider[] = [];
  const instances: PropInstance[] = spots.map((s, i) => {
    if (collide) colliders.push(boxCollider(s.x, s.z, size, size));
    return { x: s.x, z: s.z, sx: size, sy: 1, sz: size, yaw: ((i * 7) % 4) * (Math.PI / 2) };
  });
  createPropFieldLOD(
    parent,
    instances,
    [
      { maxDist: 48, layers: [{ geo: g0, mat: matStd, castShadow: true, receiveShadow: true }] },
      { maxDist: 115, layers: [{ geo: g1, mat: matStd, castShadow: false, receiveShadow: true }] },
      { maxDist: 380, layers: [{ geo: g2, mat: matClay, castShadow: false, receiveShadow: false }] },
    ],
    0.85,
    2.4,
  );
  return colliders;
}
