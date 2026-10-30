import * as THREE from 'three';
import { keepAlive, mergeParts } from './merge';

export interface CrowdAssets {
  cloth0: THREE.BufferGeometry;
  skin0: THREE.BufferGeometry;
  cloth1: THREE.BufferGeometry;
  skin1: THREE.BufferGeometry;
  cloth2: THREE.BufferGeometry;
  skin2: THREE.BufferGeometry;
  matStd: THREE.MeshStandardMaterial;
  matClay: THREE.MeshStandardMaterial;
}

let _crowdAssets: CrowdAssets | null = null;

export const SKINS = [0xd4a37d, 0x966344, 0xe4bb98, 0x67422c, 0xba835c, 0xc8966e];

export function getCrowdAssets(): CrowdAssets {
  if (_crowdAssets) return _crowdAssets;

  // LOD 0 (< 18 m): Sculpted pilgrim with garment pleats, chest/shoulder anatomy, sleeves, head, hair, eyes & sandals.
  const cloth0 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.185, 0.25, 0.84, 14), y: 0.45, sx: 1.04, sz: 0.94, color: 0xffffff, aoBottom: 0.78, aoTop: 0.98 },
    { geo: new THREE.CylinderGeometry(0.032, 0.048, 0.78, 6), x: -0.05, y: 0.44, z: 0.19, color: 0xf4f4f4, aoBottom: 0.74 },
    { geo: new THREE.CylinderGeometry(0.028, 0.042, 0.76, 6), x: 0.06, y: 0.44, z: 0.185, color: 0xededed, aoBottom: 0.74 },
    { geo: new THREE.CylinderGeometry(0.035, 0.05, 0.78, 6), x: 0.02, y: 0.44, z: -0.19, color: 0xefefef, aoBottom: 0.74 },
    { geo: new THREE.CylinderGeometry(0.194, 0.198, 0.065, 12), y: 0.87, sx: 1.05, sz: 0.92, color: 0xe6e4de },
    { geo: new THREE.CylinderGeometry(0.205, 0.185, 0.48, 14), y: 1.12, sx: 1.12, sz: 0.84, color: 0xffffff, aoBottom: 0.9 },
    { geo: new THREE.SphereGeometry(0.205, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), y: 1.35, sx: 1.12, sy: 0.42, sz: 0.84, color: 0xfafafa },
    { geo: new THREE.CylinderGeometry(0.21, 0.202, 0.22, 14), x: 0.015, y: 1.15, rz: -0.28, sx: 1.08, sz: 0.86, color: 0xf3f3f3 },
    { geo: new THREE.SphereGeometry(0.062, 8, 6), x: -0.232, y: 1.33, color: 0xfcfcfc },
    { geo: new THREE.CylinderGeometry(0.062, 0.054, 0.28, 8), x: -0.242, y: 1.19, rz: 0.07, rx: -0.05, color: 0xfcfcfc },
    { geo: new THREE.CylinderGeometry(0.052, 0.044, 0.25, 8), x: -0.256, y: 0.95, z: 0.03, rx: -0.18, color: 0xf7f7f7, aoBottom: 0.88 },
    { geo: new THREE.SphereGeometry(0.062, 8, 6), x: 0.232, y: 1.33, color: 0xfcfcfc },
    { geo: new THREE.CylinderGeometry(0.062, 0.054, 0.28, 8), x: 0.242, y: 1.19, rz: -0.07, rx: -0.05, color: 0xfcfcfc },
    { geo: new THREE.CylinderGeometry(0.052, 0.044, 0.25, 8), x: 0.256, y: 0.95, z: 0.03, rx: -0.18, color: 0xf7f7f7, aoBottom: 0.88 },
  ]));

  const skin0 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.056, 0.066, 0.12, 8), y: 1.40, color: 0xffffff, aoBottom: 0.85 },
    { geo: new THREE.SphereGeometry(0.132, 14, 12), y: 1.545, sx: 0.94, sy: 1.08, sz: 0.98, color: 0xffffff, aoBottom: 0.9 },
    { geo: new THREE.ConeGeometry(0.022, 0.055, 5), y: 1.535, z: 0.132, rx: Math.PI * 0.42, color: 0xf7f0eb },
    { geo: new THREE.SphereGeometry(0.028, 6, 5), x: -0.124, y: 1.535, z: -0.01, sx: 0.45, sy: 1.1, sz: 0.75, color: 0xf5ebe4 },
    { geo: new THREE.SphereGeometry(0.028, 6, 5), x: 0.124, y: 1.535, z: -0.01, sx: 0.45, sy: 1.1, sz: 0.75, color: 0xf5ebe4 },
    { geo: new THREE.SphereGeometry(0.137, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56), y: 1.555, z: -0.012, rx: -0.22, sx: 0.95, sy: 1.06, sz: 1.0, color: 0x241b16 },
    { geo: new THREE.SphereGeometry(0.014, 5, 4), x: -0.044, y: 1.555, z: 0.118, color: 0x1c1512 },
    { geo: new THREE.SphereGeometry(0.014, 5, 4), x: 0.044, y: 1.555, z: 0.118, color: 0x1c1512 },
    { geo: new THREE.SphereGeometry(0.044, 7, 6), x: -0.262, y: 0.81, z: 0.055, sx: 0.75, sy: 1.15, sz: 0.9, color: 0xffffff },
    { geo: new THREE.SphereGeometry(0.044, 7, 6), x: 0.262, y: 0.81, z: 0.055, sx: 0.75, sy: 1.15, sz: 0.9, color: 0xffffff },
    { geo: new THREE.BoxGeometry(0.095, 0.038, 0.21), x: -0.095, y: 0.02, z: 0.035, color: 0x2d2119 },
    { geo: new THREE.BoxGeometry(0.095, 0.038, 0.21), x: 0.095, y: 0.02, z: 0.035, color: 0x2d2119 },
  ]));

  // LOD 1 (18 m – 48 m): Clean medium-poly silhouette.
  const cloth1 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.18, 0.25, 0.86, 10), y: 0.44, sx: 1.04, sz: 0.92, color: 0xffffff, aoBottom: 0.8 },
    { geo: new THREE.CylinderGeometry(0.22, 0.18, 0.50, 10), y: 1.12, sx: 1.14, sz: 0.84, color: 0xffffff },
    { geo: new THREE.SphereGeometry(0.24, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), y: 1.24, sx: 1.18, sy: 0.55, sz: 0.84, color: 0xf8f8f8 },
  ]));
  const skin1 = keepAlive(mergeParts([
    { geo: new THREE.SphereGeometry(0.132, 9, 7), y: 1.54, sx: 0.95, sy: 1.08, sz: 0.98, color: 0xffffff },
    { geo: new THREE.SphereGeometry(0.136, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), y: 1.56, z: -0.01, rx: -0.2, color: 0x261d17 },
  ]));

  // LOD 2 (> 48 m): Soft "playdough / clay" (ดินน้ำมัน) low-poly organic silhouette (~28 tris total).
  const cloth2 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.17, 0.26, 1.34, 6), y: 0.68, sx: 1.08, sz: 0.92, color: 0xffffff, aoBottom: 0.82 },
  ]));
  const skin2 = keepAlive(mergeParts([
    { geo: new THREE.SphereGeometry(0.14, 6, 4), y: 1.52, sy: 1.08, color: 0xffffff },
  ]));

  const matStd = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, vertexColors: true }));
  const matClay = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, metalness: 0.0, vertexColors: true }));

  _crowdAssets = { cloth0, skin0, cloth1, skin1, cloth2, skin2, matStd, matClay };
  return _crowdAssets;
}

