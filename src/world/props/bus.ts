import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { keepAlive, makeLOD, mergeParts, type PartSpec } from '../../engine/lod';
import { boxCollider, mat } from '../common';
import { vcolClay, vcolStd } from './materials';

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
