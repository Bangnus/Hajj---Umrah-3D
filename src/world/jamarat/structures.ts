import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { textTexture } from '../../engine/label';
import { makeLOD, mergeParts } from '../../engine/lod';
import { box, boxCollider, mat, tileTexture } from '../common';
import { label, speckTexture } from '../hajjCommon';
import { tr } from '../../i18n';
import type { Jamrah } from '../jamarat';

export function addJamaratPillars(
  group: THREE.Group,
  colliders: Collider[],
  pillars: Jamrah[],
  basin: { rx: number; rz: number },
  levels: number[],
) {
  const { rx, rz } = basin;
  // The three jamarat: dressed ashlar stone wall with rounded ends + oval basin with marble coping.
  const stoneTex = tileTexture('#c4b7a2', 'rgba(95,84,70,0.34)', 8, 256);
  stoneTex.repeat.set(6, 14);
  const wallMat = mat(0xffffff, 0.78, { map: stoneTex });
  const parapetMat = mat(0xf0ece3, 0.42, { side: THREE.DoubleSide });
  const basinFloor = mat(0xffffff, 0.95, { map: speckTexture('#77706a', ['#5a544e', '#958c84', '#3f3a36'], 1800, 128, 4) });
  for (const pl of pillars) {
    const wall = box(group, rx * 1.52, 44, 1.4, wallMat, pl.x, 0, 0);
    wall.receiveShadow = true;
    // Rounded bullnose end columns on the elongated Jamrah pillar
    for (const endS of [-1, 1]) {
      const endCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 44, 14), wallMat);
      endCyl.position.set(pl.x + endS * rx * 0.76, 22, 0);
      endCyl.castShadow = endCyl.receiveShadow = true;
      group.add(endCyl);
    }
    for (const y of [0, ...levels.slice(0, 2).map((v) => v + 1.2)]) {
      const parapet = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.3, 48, 1, true), parapetMat);
      parapet.scale.set(rx, 1, rz);
      parapet.position.set(pl.x, y + 0.65, 0);
      parapet.castShadow = true;
      group.add(parapet);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 8, 48), mat(0xd8d1c2, 0.36));
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(rx, rz, 1);
      rim.position.set(pl.x, y + 1.3, 0);
      group.add(rim);
    }
    const floorDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), basinFloor);
    floorDisc.rotation.x = -Math.PI / 2;
    floorDisc.scale.set(rx - 0.1, rz - 0.1, 1);
    floorDisc.position.set(pl.x, 0.04, 0);
    group.add(floorDisc);
    colliders.push(boxCollider(pl.x, 0, rx * 2 - 1, rz * 2, 0.2));
    label(group, pl.name, pl.x, 7.5, 1.2, 1.1);
    // Overhead sign facing the oncoming flow, ahead of each jamrah.
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshBasicMaterial({ map: textTexture([`${pl.name} ↓`, pl.arabic], 1024, 256, '#1f5d46', '#ffffff', 80) }));
    sign.position.set(pl.x + rx + 8, 8.6, 9);
    sign.rotation.y = Math.PI / 2;
    group.add(sign);
    box(group, 0.15, 1.8, 0.15, 0x6b7076, pl.x + rx + 8, 9.7, 9, false);
  }
}

export function addJamaratBarbers(group: THREE.Group, colliders: Collider[], barberX: number) {
  // Barber kiosks near the west exit (detailed close -> clay far).
  const kioskHi = mergeParts([
    { geo: new THREE.BoxGeometry(5, 3, 3), y: 1.5, color: 0xe9e1ce, aoBottom: 0.85 },
    { geo: new THREE.BoxGeometry(5.2, 0.22, 3.2), y: 3.06, color: 0xd5cbb5 },
    { geo: new THREE.BoxGeometry(2.6, 1.5, 0.08), x: -0.6, y: 1.55, z: 1.49, color: 0x2c4352 },
    { geo: new THREE.BoxGeometry(1.0, 2.2, 0.08), x: 1.55, y: 1.1, z: 1.49, color: 0x5c4632 },
    { geo: new THREE.BoxGeometry(5.05, 0.18, 0.72), y: 2.52, z: 1.78, rx: 0.22, color: 0x1e5c45 },
    { geo: new THREE.CylinderGeometry(0.08, 0.08, 0.65, 10), x: -2.25, y: 1.95, z: 1.62, color: 0xc93434 },
  ]);
  const kioskClay = mergeParts([{ geo: new THREE.BoxGeometry(5, 3.1, 3), y: 1.55, color: 0xe7dfcc, aoBottom: 0.84 }]);
  const kioskStdMat = mat(0xffffff, 0.58, { vertexColors: true });
  const kioskClayMat = mat(0xffffff, 0.92, { vertexColors: true });
  for (let i = 0; i < 3; i++) {
    const x = barberX - 7 + i * 7;
    const k0 = new THREE.Mesh(kioskHi, kioskStdMat);
    k0.castShadow = k0.receiveShadow = true;
    const k2 = new THREE.Mesh(kioskClay, kioskClayMat);
    group.add(makeLOD(x, 0, -16.5, [[k0, 0], [k2, 48]]));
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.8), new THREE.MeshBasicMaterial({ map: textTexture([tr('ร้านตัดผม ✂')], 512, 128, '#11302a', '#f2d06b', 56) }));
    sg.position.set(x, 3.55, -14.95);
    group.add(sg);
    colliders.push(boxCollider(x, -16.5, 5, 3));
  }
}
