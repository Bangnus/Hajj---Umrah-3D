import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { textTexture } from '../../engine/label';
import { makeLOD, mergeParts } from '../../engine/lod';
import { boxCollider, floor, mat, tileTexture, type Scene3D } from '../common';
import { tr } from '../../i18n';

/** Plaza outside Marwah with barber kiosks for tahallul. */
export const PLAZA = { start: { x: 0, z: 6 }, barber: { x: 0, z: -4 } };

export function buildPlaza(): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const tex = tileTexture('#efebe1', 'rgba(170,160,145,0.34)', 6);
  tex.repeat.set(8, 8);
  floor(group, 60, 60, mat(0xffffff, 0.36, { map: tex }));

  const kioskHiGeo = mergeParts([
    { geo: new THREE.BoxGeometry(4, 3, 3), y: 1.5, color: 0xeae2cf, aoBottom: 0.85 },
    { geo: new THREE.BoxGeometry(4.25, 0.24, 3.25), y: 3.06, color: 0xd5cab4 },
    // Storefront glass window, door, emerald awning & classic barber pole
    { geo: new THREE.BoxGeometry(2.1, 1.5, 0.08), x: -0.5, y: 1.55, z: 1.49, color: 0x2d4452 },
    { geo: new THREE.BoxGeometry(0.95, 2.2, 0.08), x: 1.25, y: 1.1, z: 1.49, color: 0x5c4632 },
    { geo: new THREE.BoxGeometry(4.1, 0.18, 0.75), y: 2.52, z: 1.80, rx: 0.22, color: 0x1e5c45 },
    { geo: new THREE.CylinderGeometry(0.08, 0.08, 0.65, 10), x: -1.78, y: 1.95, z: 1.62, color: 0xc93434 },
    { geo: new THREE.SphereGeometry(0.095, 8, 6), x: -1.78, y: 2.32, z: 1.62, color: 0xd8dce0 },
  ]);
  const kioskClayGeo = mergeParts([
    { geo: new THREE.BoxGeometry(4, 3.1, 3), y: 1.55, color: 0xe7dfcc, aoBottom: 0.84 },
  ]);
  const kioskStdMat = mat(0xffffff, 0.58, { vertexColors: true });
  const kioskClayMat = mat(0xffffff, 0.92, { vertexColors: true });

  for (let i = 0; i < 4; i++) {
    const x = -9 + i * 6;
    const m0 = new THREE.Mesh(kioskHiGeo, kioskStdMat);
    m0.castShadow = m0.receiveShadow = true;
    const m2 = new THREE.Mesh(kioskClayGeo, kioskClayMat);
    group.add(makeLOD(x, 0, -10, [[m0, 0], [m2, 42]]));

    const s = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.7), new THREE.MeshBasicMaterial({ map: textTexture([tr('ร้านตัดผม ✂')], 512, 128, '#11302a', '#f2d06b', 56) }));
    s.position.set(x, 3.55, -8.45);
    group.add(s);
    colliders.push(boxCollider(x, -10, 4, 3));
  }

  // Plaza architectural shade umbrellas (LOD close -> clay far).
  const umbHi = mergeParts([
    { geo: new THREE.CylinderGeometry(0.24, 0.30, 0.7, 10), y: 0.35, color: 0xd8d2c5 },
    { geo: new THREE.CylinderGeometry(0.15, 0.18, 5.5, 10), y: 3.1, color: 0xefece4 },
    { geo: new THREE.CylinderGeometry(0.32, 0.18, 0.45, 10), y: 5.75, color: 0xd6b25a },
    { geo: new THREE.ConeGeometry(5.1, 1.3, 8), y: 6.3, color: 0xf6f3ea },
    { geo: new THREE.SphereGeometry(0.16, 8, 6), y: 7.05, color: 0xd6b25a },
  ]);
  const umbClay = mergeParts([
    { geo: new THREE.CylinderGeometry(0.16, 0.22, 6, 6), y: 3, color: 0xe8e4dc },
    { geo: new THREE.ConeGeometry(5.0, 1.2, 6), y: 6.2, color: 0xf2eee4 },
  ]);
  for (const [x, z] of [[-14, 8], [14, 8], [-14, -2], [14, -2]]) {
    const u0 = new THREE.Mesh(umbHi, kioskStdMat);
    u0.castShadow = true;
    const u2 = new THREE.Mesh(umbClay, kioskClayMat);
    group.add(makeLOD(x, 0, z, [[u0, 0], [u2, 55]]));
  }
  colliders.push({ kind: 'rect-in', minX: -28, maxX: 28, minZ: -28, maxZ: 28 });
  return { group, colliders };
}
