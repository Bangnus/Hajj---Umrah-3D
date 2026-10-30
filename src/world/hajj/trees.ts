import * as THREE from 'three';
import { createPropFieldLOD, keepAlive, mergeParts, type PropInstance } from '../../engine/lod';
import { rng } from './terrain';
import type { TentSpot } from './tents';

let _treeAssets: { g0: THREE.BufferGeometry; g1: THREE.BufferGeometry; g2: THREE.BufferGeometry; matStd: THREE.MeshStandardMaterial; matClay: THREE.MeshStandardMaterial } | null = null;
function getTreeAssets() {
  if (_treeAssets) return _treeAssets;
  //Close (< 40 m): Flared roots, slightly leaning trunk, 3 forked branches & 5 organic Neem foliage domes
  const g0 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.20, 0.34, 0.6, 8), y: 0.3, color: 0x5e402b, aoBottom: 0.72 },
    { geo: new THREE.CylinderGeometry(0.15, 0.22, 1.85, 8), y: 1.45, rz: 0.04, color: 0x6c4b33, aoBottom: 0.84 },
    // 3 spreading branches
    { geo: new THREE.CylinderGeometry(0.07, 0.12, 1.15, 6), x: -0.35, y: 2.45, z: 0.15, rz: 0.58, rx: 0.2, color: 0x65452e },
    { geo: new THREE.CylinderGeometry(0.07, 0.12, 1.15, 6), x: 0.38, y: 2.42, z: -0.18, rz: -0.60, rx: -0.22, color: 0x65452e },
    { geo: new THREE.CylinderGeometry(0.06, 0.10, 1.0, 6), x: 0.08, y: 2.52, z: 0.36, rx: 0.55, color: 0x65452e },
    // 5 overlapping organic leafy sub-crowns with rich under-canopy AO
    { geo: new THREE.IcosahedronGeometry(1.45, 2), x: 0, y: 3.55, z: 0, sx: 1.25, sy: 0.85, sz: 1.25, color: 0x557b37, aoBottom: 0.68 },
    { geo: new THREE.IcosahedronGeometry(1.12, 2), x: -0.95, y: 3.12, z: 0.35, sx: 1.15, sy: 0.78, sz: 1.1, color: 0x4b702f, aoBottom: 0.68 },
    { geo: new THREE.IcosahedronGeometry(1.15, 2), x: 0.92, y: 3.08, z: -0.32, sx: 1.15, sy: 0.80, sz: 1.12, color: 0x5c843c, aoBottom: 0.68 },
    { geo: new THREE.IcosahedronGeometry(1.02, 2), x: 0.18, y: 3.15, z: 0.92, sx: 1.1, sy: 0.76, sz: 1.05, color: 0x517734, aoBottom: 0.68 },
    { geo: new THREE.IcosahedronGeometry(0.98, 2), x: -0.22, y: 3.10, z: -0.88, sx: 1.1, sy: 0.76, sz: 1.05, color: 0x476b2c, aoBottom: 0.68 },
  ]));

  // Mid (40–95 m): Clean trunk + 2-cluster medium canopy
  const g1 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.16, 0.28, 2.5, 6), y: 1.25, color: 0x684830, aoBottom: 0.78 },
    { geo: new THREE.IcosahedronGeometry(1.85, 1), y: 3.25, sx: 1.25, sy: 0.82, sz: 1.25, color: 0x557b36, aoBottom: 0.70 },
  ]));

  // Far (> 95 m): Soft clay silhouette (~22 tris, no shadow)
  const g2 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.16, 0.28, 2.4, 5), y: 1.2, color: 0x684830, aoBottom: 0.78 },
    { geo: new THREE.SphereGeometry(2.15, 7, 5), y: 3.2, sy: 0.72, color: 0x547936, aoBottom: 0.72 },
  ]));

  const matStd = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, vertexColors: true }));
  const matClay = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true }));
  _treeAssets = { g0, g1, g2, matStd, matClay };
  return _treeAssets;
}

/** Neem-like shade trees with frustum culling + 3-tier LOD (detailed multi-crown -> mid -> clay). */
export function treeField(parent: THREE.Object3D, spots: TentSpot[], seed = 3) {
  const r = rng(seed);
  const { g0, g1, g2, matStd, matClay } = getTreeAssets();
  const instances: PropInstance[] = spots.map((t) => {
    const k = 0.8 + r() * 0.68;
    return { x: t.x, z: t.z, sx: k, sy: k, sz: k, yaw: r() * Math.PI * 2 };
  });
  createPropFieldLOD(
    parent,
    instances,
    [
      { maxDist: 40, layers: [{ geo: g0, mat: matStd, castShadow: true, receiveShadow: true }] },
      { maxDist: 95, layers: [{ geo: g1, mat: matStd, castShadow: false, receiveShadow: true }] },
      { maxDist: 360, layers: [{ geo: g2, mat: matClay, castShadow: false, receiveShadow: false }] },
    ],
    2.9,
    2.5,
  );
}
