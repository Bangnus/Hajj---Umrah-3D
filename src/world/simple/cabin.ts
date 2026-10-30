import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { makeLabel, textTexture } from '../../engine/label';
import { mergeParts } from '../../engine/lod';
import { box, floor, mat, type Scene3D } from '../common';
import { tr } from '../../i18n';

/** Aircraft cabin: the player walks the aisle; changing room at the rear. */
export const CABIN = { start: { x: 0, z: 10 }, changing: { x: 0, z: -15.5 } };

export function buildCabin(): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  floor(group, 6, 40, mat(0x2d3c4d, 0.9));
  // Aisle carpet runner strip
  const aisle = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 32), mat(0x1f5240, 0.92));
  aisle.rotation.x = -Math.PI / 2;
  aisle.position.set(0, 0.01, -1.5);
  group.add(aisle);

  const hull = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 40, 32, 1, true, -Math.PI / 2 - 1.2, Math.PI + 2.4), mat(0xf0f2f5, 0.68, { side: THREE.BackSide }));
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 1.2;
  group.add(hull);

  // Overhead luggage bins along both sides
  for (const s of [-1, 1]) {
    box(group, 1.05, 0.46, 28, mat(0xe3e7ec, 0.55), s * 1.95, 2.18, 0, false);
  }

  // Contoured airline seats (3-3 layout, 84 seats instanced in 1 draw call instead of 168 separate meshes!)
  const seatGeo = mergeParts([
    { geo: new THREE.BoxGeometry(0.10, 0.34, 0.32), y: 0.17, color: 0x5c646d },
    { geo: new THREE.BoxGeometry(0.50, 0.12, 0.48), y: 0.40, color: 0x234463 },
    { geo: new THREE.BoxGeometry(0.48, 0.68, 0.10), y: 0.76, z: 0.21, rx: 0.10, color: 0x284d70 },
    // Crisp white antimacassar headrest cover + armrests
    { geo: new THREE.BoxGeometry(0.38, 0.20, 0.115), y: 1.04, z: 0.23, rx: 0.10, color: 0xf4f5f7 },
    { geo: new THREE.BoxGeometry(0.05, 0.06, 0.42), x: -0.25, y: 0.58, z: 0.04, color: 0x3b424a },
    { geo: new THREE.BoxGeometry(0.05, 0.06, 0.42), x: 0.25, y: 0.58, z: 0.04, color: 0x3b424a },
  ]);
  const seatCount = 14 * 6;
  const seats = new THREE.InstancedMesh(seatGeo, mat(0xffffff, 0.72, { vertexColors: true }), seatCount);
  const m4 = new THREE.Matrix4();
  let si = 0;
  for (let row = 0; row < 14; row++) {
    const z = 13 - row * 2;
    for (const x of [-2.3, -1.7, -1.1, 1.1, 1.7, 2.3]) {
      seats.setMatrixAt(si++, m4.makeTranslation(x, 0, z));
    }
  }
  group.add(seats);

  // Cabin oval windows instanced in 1 draw call
  const winGeo = mergeParts([
    { geo: new THREE.CylinderGeometry(0.20, 0.20, 0.04, 14), rz: Math.PI / 2, sy: 1.35, color: 0xd0d6dc },
    { geo: new THREE.CylinderGeometry(0.15, 0.15, 0.05, 14), rz: Math.PI / 2, sy: 1.35, color: 0xbfe2ff },
  ]);
  const wins = new THREE.InstancedMesh(winGeo, new THREE.MeshBasicMaterial({ vertexColors: true }), 28);
  let wi = 0;
  for (let i = 0; i < 14; i++) {
    for (const s of [-1, 1]) {
      wins.setMatrixAt(wi++, m4.makeTranslation(s * 2.86, 1.45, 13 - i * 2));
    }
  }
  group.add(wins);

  box(group, 5.4, 2.4, 0.2, mat(0xd8dde2, 0.6), 0, 0, -17.6);
  box(group, 1.1, 2.05, 0.06, mat(0xb8c2cc, 0.45), 0, 0, -17.48, false); // lavatory/changing door
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ map: textTexture([tr('ห้องเปลี่ยนชุด')], 512, 160, '#11302a', '#ffffff', 64) }));
  sign.position.set(0, 2.2, -17.45);
  group.add(sign);
  const lb = makeLabel(tr('แอร์ไลน์ → เจดดาห์'), { height: 0.4 });
  lb.position.set(0, 2.4, 14.5);
  group.add(lb);
  colliders.push({ kind: 'rect-in', minX: -0.75, maxX: 0.75, minZ: -17.4, maxZ: 14.5 });
  // Cabin light.
  const l = new THREE.PointLight(0xfff6e6, 20, 30);
  l.position.set(0, 2.4, 0);
  group.add(l);
  return { group, colliders };
}
