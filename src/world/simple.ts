import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { makeLabel, textTexture } from '../engine/label';
import { box, boxCollider, cyl, floor, mat, tileTexture, type Scene3D } from './common';

/** Thai house interior (12 x 10 m) with a door to the street and a waiting car. */
export const HOME = {
  door: { x: 0, z: -5 },
  outside: { x: 0, z: -8.5 },
  items: [
    { x: -4, z: 2.5 }, { x: 4, z: 2.5 }, { x: -4.2, z: -2 }, { x: 4.2, z: -2 }, { x: 0, z: 3.4 },
  ],
};

export function buildHome(): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const wood = tileTexture('#b98b5e', 'rgba(90,60,30,0.25)', 6);
  wood.repeat.set(3, 3);
  floor(group, 12, 10, mat(0xffffff, 0.7, { map: wood }));
  floor(group, 40, 20, mat(0x8f8f8a, 0.9), 0, -15); // street
  floor(group, 60, 60, mat(0x7fa36a, 1), 0, 0).position.y = -0.01; // garden

  const wall = mat(0xf1e8d8, 0.85);
  box(group, 12, 3, 0.2, wall, 0, 0, 5);
  box(group, 0.2, 3, 10, wall, -6, 0, 0);
  box(group, 0.2, 3, 10, wall, 6, 0, 0);
  box(group, 5, 3, 0.2, wall, -3.5, 0, -5);
  box(group, 5, 3, 0.2, wall, 3.5, 0, -5);
  box(group, 2, 0.8, 0.2, wall, 0, 2.2, -5);
  colliders.push(
    { kind: 'box', minX: -6.2, maxX: 6.2, minZ: 4.9, maxZ: 5.2 },
    { kind: 'box', minX: -6.2, maxX: -5.9, minZ: -5.2, maxZ: 5.2 },
    { kind: 'box', minX: 5.9, maxX: 6.2, minZ: -5.2, maxZ: 5.2 },
    { kind: 'box', minX: -6.2, maxX: -1, minZ: -5.2, maxZ: -4.9 },
    { kind: 'box', minX: 1, maxX: 6.2, minZ: -5.2, maxZ: -4.9 },
    { kind: 'rect-in', minX: -6, maxX: 6, minZ: -12, maxZ: 5 },
  );

  // Furniture.
  box(group, 2.4, 0.8, 1, mat(0x7b5a3c, 0.6), 0, 0, 0.5);
  colliders.push(boxCollider(0, 0.5, 2.4, 1));
  box(group, 0.9, 0.6, 0.5, mat(0x2f5e8a, 0.5), 1.5, 0, -3.8); // suitcase
  const sofa = box(group, 3, 0.8, 1, mat(0x4a7a6a, 0.9), -3.5, 0, 4.3);
  sofa.castShadow = true;
  colliders.push(boxCollider(-3.5, 4.3, 3, 1));
  const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshBasicMaterial({ map: textTexture(['بِسْمِ اللَّهِ'], 512, 320, '#0d2622', '#e2c46c', 80) }));
  frame.position.set(0, 1.9, 4.88);
  frame.rotation.y = Math.PI;
  group.add(frame);

  // Car waiting outside.
  box(group, 2, 1, 4.4, mat(0xe8e8e8, 0.3, { metalness: 0.4 }), 3.5, 0.3, -12);
  box(group, 1.8, 0.7, 2.4, mat(0x9fc4dc, 0.1), 3.5, 1.3, -12.2);
  for (const [dx, dz] of [[-1, -1.4], [1, -1.4], [-1, 1.4], [1, 1.4]]) cyl(group, 0.35, 0.35, 0.3, 0x202020, 3.5 + dx, 0.15, -12 + dz, 12).rotation.z = Math.PI / 2;
  colliders.push(boxCollider(3.5, -12, 2, 4.4));
  return { group, colliders };
}

/** Airport hall with check-in, immigration, security and Gate 14. */
export const AIRPORT = {
  start: { x: 0, z: 14 },
  steps: [
    { x: -8, z: 6, label: 'เคาน์เตอร์เช็กอิน' },
    { x: 8, z: 0, label: 'ตรวจคนเข้าเมือง' },
    { x: 0, z: -6, label: 'จุดตรวจความปลอดภัย' },
    { x: 0, z: -15, label: 'ประตูขึ้นเครื่อง 14' },
  ],
};

export function buildAirport(): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const tex = tileTexture('#e6e8ea', 'rgba(140,150,160,0.3)', 8);
  tex.repeat.set(6, 8);
  floor(group, 44, 44, mat(0xffffff, 0.3, { map: tex }));
  const wall = mat(0xdfe6ec, 0.6);
  box(group, 44, 9, 0.4, wall, 0, 0, -21);
  box(group, 0.4, 9, 44, wall, -22, 0, 0);
  box(group, 0.4, 9, 44, wall, 22, 0, 0);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(36, 7), mat(0x9fd0f0, 0.1, { transparent: true, opacity: 0.5 }));
  glass.position.set(0, 4, -20.7);
  group.add(glass);
  // Plane outside the glass.
  box(group, 4, 4, 30, mat(0xf4f4f4, 0.3), 0, 1, -40, false);
  box(group, 34, 0.6, 5, mat(0xf4f4f4, 0.3), 0, 3, -40, false);
  colliders.push({ kind: 'rect-in', minX: -21, maxX: 21, minZ: -20, maxZ: 21 });

  // Check-in counters.
  for (let i = 0; i < 4; i++) {
    box(group, 2.4, 1.1, 0.8, mat(0x2a6b5a, 0.5), -14 + i * 3, 0, 8);
    colliders.push(boxCollider(-14 + i * 3, 8, 2.4, 0.8));
  }
  // Immigration booths.
  for (const x of [4, 12]) {
    box(group, 1.6, 2.2, 1.6, mat(0x51606e, 0.6), x, 0, 0);
    colliders.push(boxCollider(x, 0, 1.6, 1.6));
  }
  // Security arches.
  for (const x of [-3, 3]) {
    box(group, 0.2, 2.3, 0.6, 0x8a96a3, x - 0.6, 0, -6);
    box(group, 0.2, 2.3, 0.6, 0x8a96a3, x + 0.6, 0, -6);
    box(group, 1.4, 0.2, 0.6, 0x8a96a3, x, 2.3, -6);
  }
  // Gate sign.
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.4), new THREE.MeshBasicMaterial({ map: textTexture(['ประตู 14  ✈  เจดดาห์'], 768, 256, '#11302a', '#f2d06b', 76) }));
  sign.position.set(0, 4.5, -18.5);
  group.add(sign);
  for (let i = 0; i < 6; i++) {
    box(group, 4, 0.5, 0.7, mat(0x3d4a56, 0.6), (i % 2 ? 5 : -5), 0, -12 - Math.floor(i / 2) * 2.2);
    colliders.push(boxCollider((i % 2 ? 5 : -5), -12 - Math.floor(i / 2) * 2.2, 4, 0.7));
  }
  return { group, colliders };
}

/** Aircraft cabin: the player walks the aisle; changing room at the rear. */
export const CABIN = { start: { x: 0, z: 10 }, changing: { x: 0, z: -15.5 } };

export function buildCabin(): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  floor(group, 6, 40, mat(0x3a4a5c, 0.9));
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 40, 32, 1, true, -Math.PI / 2 - 1.2, Math.PI + 2.4), mat(0xeef0f2, 0.7, { side: THREE.BackSide }));
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 1.2;
  group.add(hull);
  // Seats 3-3.
  const seatMat = mat(0x274a6b, 0.8);
  for (let row = 0; row < 14; row++) {
    const z = 13 - row * 2;
    for (const x of [-2.3, -1.7, -1.1, 1.1, 1.7, 2.3]) {
      box(group, 0.5, 0.45, 0.5, seatMat, x, 0, z, false);
      box(group, 0.5, 0.8, 0.12, seatMat, x, 0.45, z + 0.25, false);
    }
  }
  // Windows.
  for (let i = 0; i < 14; i++) {
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42), new THREE.MeshBasicMaterial({ color: 0xbfe0ff }));
      w.position.set(s * 2.86, 1.45, 13 - i * 2);
      w.rotation.y = -s * Math.PI / 2;
      group.add(w);
    }
  }
  box(group, 5.4, 2.4, 0.2, mat(0xd8dde2, 0.6), 0, 0, -17.6);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ map: textTexture(['ห้องเปลี่ยนชุด'], 512, 160, '#11302a', '#ffffff', 64) }));
  sign.position.set(0, 2.2, -17.45);
  group.add(sign);
  const lb = makeLabel('แอร์ไลน์ → เจดดาห์', { height: 0.4 });
  lb.position.set(0, 2.4, 14.5);
  group.add(lb);
  colliders.push({ kind: 'rect-in', minX: -0.75, maxX: 0.75, minZ: -17.4, maxZ: 14.5 });
  // Cabin light.
  const l = new THREE.PointLight(0xfff6e6, 20, 30);
  l.position.set(0, 2.4, 0);
  group.add(l);
  return { group, colliders };
}

/** Plaza outside Marwah with barber kiosks for tahallul. */
export const PLAZA = { start: { x: 0, z: 6 }, barber: { x: 0, z: -4 } };

export function buildPlaza(): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const tex = tileTexture('#ede9df', 'rgba(170,160,145,0.35)', 6);
  tex.repeat.set(8, 8);
  floor(group, 60, 60, mat(0xffffff, 0.4, { map: tex }));
  for (let i = 0; i < 4; i++) {
    const x = -9 + i * 6;
    box(group, 4, 3, 3, mat(0xe7dfcc, 0.6), x, 0, -10);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.7), new THREE.MeshBasicMaterial({ map: textTexture(['ร้านตัดผม ✂'], 512, 128, '#11302a', '#f2d06b', 56) }));
    s.position.set(x, 3.4, -8.45);
    group.add(s);
    colliders.push(boxCollider(x, -10, 4, 3));
  }
  // Umbrellas.
  for (const [x, z] of [[-14, 8], [14, 8], [-14, -2], [14, -2]]) {
    cyl(group, 0.15, 0.15, 6, 0xe5e5e5, x, 0, z, 8);
    const top = new THREE.Mesh(new THREE.ConeGeometry(5, 1.2, 8, 1, true), mat(0xf0ece2, 0.6, { side: THREE.DoubleSide }));
    top.position.set(x, 6.2, z);
    group.add(top);
  }
  colliders.push({ kind: 'rect-in', minX: -28, maxX: 28, minZ: -28, maxZ: 28 });
  return { group, colliders };
}
