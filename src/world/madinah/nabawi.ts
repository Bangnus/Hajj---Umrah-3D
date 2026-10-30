import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { box, boxCollider, cyl, floor, mat, tileTexture, type Scene3D } from '../common';
import {
  GOLD, archTexture, carpetTexture, dome, ground, label, latticeTexture, minaret, patch, sign, wallRun,
} from '../props';
import { tr } from '../../i18n';
import { addNabawiPlaza } from './nabawiPlaza';

/**
 * Masjid an-Nabawi (compressed, game scale). Qibla is south (+z) in Madinah.
 * Hall x∈[-26,26], z∈[-22,22]; qibla wall at z = 22. The Prophet's chamber (hujrah, under the
 * Green Dome) is in the south-east of the old mosque; the Raudhah lies west of it, up to the minbar.
 * The salam corridor runs along the qibla wall from Bab as-Salam (west) to Bab al-Baqi (east).
 * Al-Baqi cemetery is just east of the mosque.
 */
export const NABAWI = {
  hall: { minX: -26, maxX: 26, minZ: -22, maxZ: 22, h: 14 },
  start: { x: 0, z: -50 },
  door: { x: 0, z: -22 },
  raudhah: { minX: 5, maxX: 15, minZ: 7, maxZ: 17, x: 10, z: 12 },
  minbar: { x: 3.4, z: 12 },
  hujrah: { x: 19, z: 13, w: 7, d: 8 },
  corridorZ: 19.5,
  salamStart: { x: -24, z: 19.5 },
  salam: { x: 17.4, z: 19.5 }, // in front of the Prophet's ﷺ opening
  exit: { x: 25.2, z: 19.5 },
  baqi: { minX: 40, maxX: 72, minZ: -8, maxZ: 40, gate: { x: 42, z: 19.5 }, outside: { x: 37.5, z: 19.5 } },
  busStop: { x: -16, z: -50 },
  keep: { minX: -60, maxX: 74, minZ: -70, maxZ: 44 },
};

export function buildNabawi(o: { crowd: number; quality: 'low' | 'high' }): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const H = NABAWI.hall, low = o.quality === 'low';

  // Ground: big marble plaza, sand/asphalt beyond.
  ground(group, 700, 0xc9b99a);
  const marble = tileTexture('#f3f0e9', 'rgba(175,165,145,0.35)', 4);
  marble.repeat.set(40, 32);
  floor(group, 200, 160, mat(0xffffff, 0.35, { map: marble }), 7, -13);

  // Hall floor: red carpet; Raudhah green; salam corridor marble.
  const carpet = carpetTexture('#8b1f25', '#a8343a', 'rgba(230,190,120,0.35)');
  carpet.repeat.set(52 / 1.25, 44 / 1.25);
  patch(group, 52, 44, mat(0xffffff, 0.95, { map: carpet }), 0, 0, 0.01);
  const R = NABAWI.raudhah;
  const green = carpetTexture('#2f7d4f', '#3f9762', 'rgba(240,230,200,0.35)');
  green.repeat.set((R.maxX - R.minX) / 1.25, (R.maxZ - R.minZ) / 1.25);
  patch(group, R.maxX - R.minX, R.maxZ - R.minZ, mat(0xffffff, 0.95, { map: green }), (R.minX + R.maxX) / 2, (R.minZ + R.maxZ) / 2, 0.02);
  const cm = tileTexture('#efece6', 'rgba(170,160,140,0.3)', 4);
  cm.repeat.set(26, 3);
  patch(group, 52, 5, mat(0xffffff, 0.4, { map: cm }), 0, 19.5, 0.02);

  // Outer walls with arches; doors: north (main), west (Bab as-Salam), east (Bab al-Baqi).
  const wallTex = archTexture();
  const dz: [number, number] = [NABAWI.corridorZ - 2, NABAWI.corridorZ + 2];
  wallRun(group, colliders, 'x', H.minZ, H.minX - 0.5, H.maxX + 0.5, [[-3, 3]], H.h, 1, wallTex);
  wallRun(group, colliders, 'x', H.maxZ, H.minX - 0.5, H.maxX + 0.5, [], H.h, 1, wallTex);
  wallRun(group, colliders, 'z', H.minX, H.minZ, H.maxZ, [dz], H.h, 1, wallTex);
  wallRun(group, colliders, 'z', H.maxX, H.minZ, H.maxZ, [dz], H.h, 1, wallTex);
  // Gilded doors standing open.
  const doorMat = mat(0xc9a24a, 0.35, { metalness: 0.7 });
  for (const s of [-1, 1]) {
    box(group, 0.15, 6, 2.8, doorMat, s * 3.1, 0, H.minZ - 1.4);
    box(group, 0.15, 6, 2.2, doorMat, H.minX - 0.6, 0, NABAWI.corridorZ + s * 3.2);
    box(group, 0.15, 6, 2.2, doorMat, H.maxX + 0.6, 0, NABAWI.corridorZ + s * 3.2);
  }
  // Parapet and roof (roof casts no shadow so the hall stays bright).
  box(group, 54, 1, 46, mat(0xe3dac6, 0.8), 0, H.h, 0, false);
  for (const [w, d, x, z] of [[54, 0.6, 0, -23], [54, 0.6, 0, 23], [0.6, 46, -27, 0], [0.6, 46, 27, 0]] as const) {
    box(group, w, 1.4, d, mat(0xd8cbb0, 0.7), x, H.h + 1, z, false);
  }
  const silver = mat(0xb9bec4, 0.35, { metalness: 0.6 });
  for (const x of [-18, -9, 0, 9]) for (const z of [-14, -5, 4]) dome(group, x, H.h + 1, z, 2.3, silver, 1, false);

  // Green Dome above the Prophet's chamber.
  const hj = NABAWI.hujrah;
  const greenM = mat(0x2f8f55, 0.42, { metalness: 0.18 });
  cyl(group, 4.6, 4.6, 3.2, mat(0x2a7d4a, 0.52), hj.x, H.h + 1, hj.z, 24);
  dome(group, hj.x, H.h + 4.2, hj.z, 4.6, greenM, 1.35);
  const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 6, 18, Math.PI * 1.35), GOLD());
  crescent.position.set(hj.x, H.h + 4.2 + 4.6 * 1.35 + 2.4, hj.z);
  crescent.rotation.z = Math.PI * 0.82;
  group.add(crescent);
  label(group, tr('โดมสีเขียว'), hj.x, H.h + 15, hj.z, 1.1);

  // Minarets (the real mosque has ten; six here).
  for (const [x, z] of [[-30, -26], [30, -26], [-30, 26], [30, 26], [-10, -26], [10, -26]] as const) {
    colliders.push(minaret(group, x, z, { h: low ? 52 : 62, r: 1.5 }));
  }
  label(group, tr('มัสยิดนะบะวี'), 0, H.h + 6, H.minZ - 1, 1.6);
  label(group, tr('ประตูทางเข้า'), 0, 7.6, H.minZ - 1.2, 0.7);
  label(group, tr('บาบุสสลาม'), H.minX - 1.4, 7.4, NABAWI.corridorZ, 0.8);
  label(group, tr('บาบุลบะกีอ์'), H.maxX + 1.4, 7.4, NABAWI.corridorZ, 0.8);

  // Interior columns (instanced) on a 7 m grid, skipping the aisle, Raudhah, chamber and corridor.
  const colPos: [number, number][] = [];
  for (const x of [-21, -14, -7, 0, 7, 14, 21]) {
    for (const z of [-17, -10, -3, 4, 11]) {
      if (x === 0 && z < -5) continue;
      if (x > 4 && x < 16 && z > 6 && z < 18) continue;
      if (x > 15 && z > 8) continue;
      colPos.push([x, z]);
    }
  }
  const cols = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45, 0.5, H.h, 12), mat(0xf1ebde, 0.5), colPos.length);
  const caps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.75, 0.5, 1.0, 12), GOLD(), colPos.length);
  const m4 = new THREE.Matrix4();
  colPos.forEach(([x, z], i) => {
    cols.setMatrixAt(i, m4.makeTranslation(x, H.h / 2, z));
    caps.setMatrixAt(i, m4.makeTranslation(x, H.h - 1.6, z));
    colliders.push({ kind: 'circle', x, z, r: 0.5 });
  });
  cols.castShadow = true;
  group.add(cols, caps);
  // White Raudhah columns.
  for (const [x, z] of [[6.5, 8.5], [13.5, 8.5], [6.5, 15], [13.5, 15]] as const) {
    cyl(group, 0.4, 0.4, H.h, mat(0xfbfaf6, 0.4), x, 0, z, 12);
    cyl(group, 0.44, 0.44, 2.2, mat(0xe9e2cf, 0.4), x, 0, z, 12);
    colliders.push({ kind: 'circle', x, z, r: 0.42 });
  }
  label(group, tr('อัรเราเฎาะฮ์ (พรมสีเขียว)'), R.x, 4.4, R.z, 0.6);

  // Prophet's chamber: green-and-gold grille. Its south face is the corridor's north edge.
  const grille = latticeTexture('#1d5c3a', '#d6b25a', 28);
  grille.repeat.set(3, 2);
  const hm = mat(0xffffff, 0.5, { map: grille, metalness: 0.3 });
  box(group, hj.w, 6, hj.d, hm, hj.x, 0, hj.z);
  box(group, hj.w + 0.4, 0.6, hj.d + 0.4, GOLD(), hj.x, 6, hj.z);
  colliders.push(boxCollider(hj.x, hj.z, hj.w, hj.d, 0.1));
  label(group, tr('ห้องของท่านนบี ﷺ'), hj.x, 7.6, hj.z, 0.6);
  // Three small openings on the south face (Prophet ﷺ, Abu Bakr, Umar).
  const south = hj.z + hj.d / 2 + 0.02;
  for (const [x, r] of [[hj.x - 1.8, 0.36], [hj.x, 0.28], [hj.x + 1.6, 0.28]] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 6, 20), GOLD());
    ring.position.set(x, 2.2, south);
    group.add(ring);
  }
  sign(group, [tr('ให้สลามด้วยความสงบ  ·  ไม่แตะผนัง')], 4.6, 0.55, hj.x, 4.6, south + 0.01, 0, '#1d5c3a', '#f2e3b0');

  // Minbar: marble steps with a small canopy, west edge of the Raudhah.
  const mb = NABAWI.minbar;
  const marbleW = mat(0xf7f5ef, 0.35);
  for (let i = 0; i < 6; i++) box(group, 1.1, 0.3 + i * 0.3, 0.55, marbleW, mb.x, 0, mb.z - 1.6 + i * 0.55);
  for (const s of [-1, 1]) box(group, 0.08, 3.6, 0.08, GOLD(), mb.x + s * 0.5, 0, mb.z + 1.4);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 8), GOLD());
  cone.position.set(mb.x, 4.4, mb.z + 1.4);
  group.add(cone);
  colliders.push(boxCollider(mb.x, mb.z, 1.2, 3.6, 0.1));
  label(group, tr('มิมบัร'), mb.x, 5.8, mb.z + 1.4, 0.5);

  // Corridor partition (z = 17) from the west opening to the chamber, and east of it.
  const part = mat(0xe8dfcb, 0.6);
  const trim = mat(0x2a6e47, 0.5);
  for (const [a, b] of [[-22, hj.x - hj.w / 2], [hj.x + hj.w / 2, H.maxX - 0.5]] as const) {
    const len = b - a, mid = (a + b) / 2;
    box(group, len, 2.2, 0.3, part, mid, 0, 17);
    box(group, len, 0.25, 0.34, trim, mid, 2.2, 17);
    colliders.push(boxCollider(mid, 17, len, 0.3, 0.05));
  }
  // The Prophet's mihrab, in the Raudhah against the partition.
  box(group, 1.8, 3.2, 0.5, mat(0xf3eee2, 0.4), 9.5, 0, 16.6);
  box(group, 1.0, 2.2, 0.06, mat(0x6a5a3a, 0.5), 9.5, 0.3, 16.33);
  colliders.push(boxCollider(9.5, 16.6, 1.8, 0.5));
  label(group, tr('ทางเดินให้สลาม →'), -22, 3.2, NABAWI.corridorZ, 0.5);

  const tick = addNabawiPlaza(group, colliders, colPos, o, NABAWI);
  return { group, colliders, tick };
}
