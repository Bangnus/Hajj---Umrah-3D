import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { box, boxCollider, cyl, floor, mat, tileTexture, type Scene3D } from './common';
import {
  PALETTE_IHRAM, archTexture, bus, carpetTexture, dome, ground, label, minaret, palm, patch, people, rand, repeatMat, sign, wallRun,
  type Person,
} from './props';

/**
 * Dhul-Hulayfah (Bir Ali) miqat mosque, ~10 km from Masjid an-Nabawi. Qibla is south (+z).
 * North entrance under a MIQAT arch → courtyard with arcades and wudu/changing blocks
 * (men west, women east) → prayer hall on the south side.
 */
export const BIRALI = {
  start: { x: 0, z: -33 },
  arch: { x: 0, z: -18 },
  change: { male: { x: -8.6, z: -10 }, female: { x: 8.6, z: -10 } },
  prayer: { x: 0, z: 25 },
  hall: { minX: -20, maxX: 20, minZ: 16, maxZ: 34 },
};

export function buildBirAli(o: { crowd: number; quality: 'low' | 'high' }): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  ground(group, 500, 0xc7b28e);
  floor(group, 70, 30, mat(0x8d8d88, 0.95), 0, -32); // parking
  const marble = tileTexture('#f2efe8', 'rgba(170,160,140,0.35)', 4);
  marble.repeat.set(12, 9);
  patch(group, 46, 34, mat(0xffffff, 0.35, { map: marble }), 0, -1, 0.01);

  // Courtyard walls (north wall has the gate under the MIQAT arch).
  const wt = archTexture('#efe7d6', '#a88f62', '#5b5442');
  wallRun(group, colliders, 'x', -18, -23, 23, [[-4, 4]], 4, 0.6, wt, 4);
  wallRun(group, colliders, 'z', -23, -18, 34, [], 4, 0.6, wt, 4);
  wallRun(group, colliders, 'z', 23, -18, 34, [], 4, 0.6, wt, 4);

  // Arcades along the east and west sides.
  const colM = mat(0xf3ede0, 0.5);
  for (const s of [-1, 1]) {
    for (let z = -15; z <= 13; z += 4) {
      cyl(group, 0.32, 0.36, 5.5, colM, s * 19.5, 0, z, 10);
      colliders.push({ kind: 'circle', x: s * 19.5, z, r: 0.38 });
    }
    box(group, 4.2, 0.5, 33, mat(0xe6dcc6, 0.7), s * 21.2, 5.5, -1, false);
    box(group, 0.4, 1.2, 33, repeatMat(wt, 33, 4), s * 19.3, 4.6, -1, false);
  }

  // MIQAT arch at the gate.
  const stoneM = mat(0xe2d6bd, 0.6);
  for (const s of [-1, 1]) {
    box(group, 1.3, 8, 1.3, stoneM, s * 4.6, 0, -18);
    colliders.push(boxCollider(s * 4.6, -18, 1.3, 1.3));
  }
  box(group, 10.6, 1.9, 1.0, mat(0x0d3b2e, 0.6), 0, 8, -18);
  const lines = ['ميقات ذو الحليفة', 'มีกอตซุลหุลัยฟะฮ์ (บิอ์รอะลี)'];
  sign(group, lines, 10.2, 1.7, 0, 8.95, -18.52, Math.PI);
  sign(group, lines, 10.2, 1.7, 0, 8.95, -17.48, 0);
  label(group, 'MIQAT · มีกอต', 0, 11.2, -18, 0.9);

  // Wudu / changing blocks: men (west) and women (east), doors facing the courtyard centre.
  const blockM = repeatMat(archTexture('#e9e1cf', '#9d8a63', '#6b7a70'), 8, 4);
  for (const [s, who] of [[-1, 'ชาย'], [1, 'หญิง']] as const) {
    const cx = s * 14.25;
    box(group, 7.5, 4.2, 8, blockM, cx, 0, -10);
    colliders.push(boxCollider(cx, -10, 7.5, 8));
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.6), mat(0x4b3a26, 0.6));
    door.position.set(s * 10.48, 1.3, -10);
    door.rotation.y = -s * Math.PI / 2;
    group.add(door);
    sign(group, ['ที่อาบน้ำ / เปลี่ยนชุด', who], 3.2, 1.0, s * 10.47, 3.3, -10, -s * Math.PI / 2);
  }

  // Prayer hall (south), door in the middle of its north wall.
  const H = BIRALI.hall;
  const carpet = carpetTexture('#2e6b52', '#3d8466', 'rgba(240,230,200,0.3)');
  carpet.repeat.set(40 / 1.25, 18 / 1.25);
  patch(group, 40, 18, mat(0xffffff, 0.95, { map: carpet }), 0, (H.minZ + H.maxZ) / 2, 0.02);
  const ht = archTexture('#f4efe3', '#b49a6a', '#43514a');
  wallRun(group, colliders, 'x', H.minZ, H.minX, H.maxX, [[-3, 3]], 9, 0.8, ht, 4.5);
  wallRun(group, colliders, 'x', H.maxZ, H.minX, H.maxX, [], 9, 0.8, ht);
  wallRun(group, colliders, 'z', H.minX, H.minZ, H.maxZ, [], 9, 0.8, ht);
  wallRun(group, colliders, 'z', H.maxX, H.minZ, H.maxZ, [], 9, 0.8, ht);
  box(group, 41, 0.8, 19, mat(0xe9e1cf, 0.8), 0, 9, (H.minZ + H.maxZ) / 2, false);
  dome(group, 0, 9.8, 25, 4, mat(0xf2eee4, 0.4), 1.05);
  for (const x of [-10, 10]) for (const z of [21, 29]) {
    cyl(group, 0.4, 0.45, 9, colM, x, 0, z, 10);
    colliders.push({ kind: 'circle', x, z, r: 0.45 });
  }
  box(group, 2.4, 4, 0.6, mat(0xd8c9a6, 0.5), 0, 0, H.maxZ - 0.6); // mihrab
  colliders.push(boxCollider(0, H.maxZ - 0.6, 2.4, 0.6));
  const l = new THREE.PointLight(0xfff1d6, o.quality === 'low' ? 26 : 20, 30);
  l.position.set(0, 7, 25);
  group.add(l);
  label(group, 'มัสยิดมีกอตซุลหุลัยฟะฮ์', 0, 14.5, H.minZ, 1.0);
  label(group, 'ห้องละหมาด', 0, 6.4, H.minZ - 0.6, 0.6);

  colliders.push(minaret(group, 27, -22, { h: o.quality === 'low' ? 46 : 56, r: 1.5 }));
  for (const [x, z] of [[-6, -3], [6, -3], [-6, 9], [6, 9], [-14, 6], [14, 6]] as const) colliders.push(palm(group, x, z, 7));
  colliders.push(bus(group, -15, -31, false), bus(group, 15, -30, false, 0x2d5d8a));

  colliders.push({ kind: 'rect-in', minX: -29, maxX: 29, minZ: -44, maxZ: 33.5 });

  // People: pilgrims (mostly in ihram) crossing the courtyard, rows praying in the hall.
  const list: Person[] = [];
  for (let i = 0; i < o.crowd * 0.6; i++) {
    let x = rand(-17, 17);
    if (Math.abs(x) > 6 && Math.abs(x) < 11) x = Math.sign(x) * 5; // keep the door rings clear
    list.push({ x, z: rand(-16, 14), yaw: 0, axis: 'z', v: rand(0.7, 1.2) * (Math.random() < 0.5 ? -1 : 1), min: -17, max: 15 });
  }
  for (let i = 0; i < o.crowd * 0.4; i++) {
    const x = -18 + (i % 26) * 1.4, z = 29.5 + Math.floor(i / 26) * 1.3;
    if (Math.abs(x) < 1.5 || z > 32.5 || (Math.abs(Math.abs(x) - 10) < 0.9 && Math.abs(z - 29) < 0.9)) continue;
    list.push({ x, z, yaw: 0 });
  }
  const tick = people(group, list, PALETTE_IHRAM);
  return { group, colliders, tick };
}
