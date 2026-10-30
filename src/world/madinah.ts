import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { box, boxCollider, cyl, floor, mat, tileTexture, type Scene3D } from './common';
import {
  GOLD, PALETTE_TRAVEL, archTexture, bus, carpetTexture, dome, ground, label, latticeTexture, minaret, palm, patch, people,
  rand, repeatMat, sign, wallRun, type Person,
} from './props';

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
  const greenM = mat(0x2f8f55, 0.45, { metalness: 0.15 });
  cyl(group, 4.6, 4.6, 3.2, mat(0x2a7d4a, 0.55), hj.x, H.h + 1, hj.z, 24);
  dome(group, hj.x, H.h + 4.2, hj.z, 4.6, greenM, 1.35);
  const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 6, 18, Math.PI * 1.35), GOLD());
  crescent.position.set(hj.x, H.h + 4.2 + 4.6 * 1.35 + 2.4, hj.z);
  crescent.rotation.z = Math.PI * 0.82;
  group.add(crescent);
  label(group, 'โดมสีเขียว', hj.x, H.h + 15, hj.z, 1.1);

  // Minarets (the real mosque has ten; six here).
  for (const [x, z] of [[-30, -26], [30, -26], [-30, 26], [30, 26], [-10, -26], [10, -26]] as const) {
    colliders.push(minaret(group, x, z, { h: low ? 52 : 62, r: 1.5 }));
  }
  label(group, 'มัสยิดนะบะวี', 0, H.h + 6, H.minZ - 1, 1.6);
  label(group, 'ประตูทางเข้า', 0, 7.6, H.minZ - 1.2, 0.7);
  label(group, 'บาบุสสลาม', H.minX - 1.4, 7.4, NABAWI.corridorZ, 0.8);
  label(group, 'บาบุลบะกีอ์', H.maxX + 1.4, 7.4, NABAWI.corridorZ, 0.8);

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
  label(group, 'อัรเราเฎาะฮ์ (พรมสีเขียว)', R.x, 4.4, R.z, 0.6);

  // Prophet's chamber: green-and-gold grille. Its south face is the corridor's north edge.
  const grille = latticeTexture('#1d5c3a', '#d6b25a', 28);
  grille.repeat.set(3, 2);
  const hm = mat(0xffffff, 0.5, { map: grille, metalness: 0.3 });
  box(group, hj.w, 6, hj.d, hm, hj.x, 0, hj.z);
  box(group, hj.w + 0.4, 0.6, hj.d + 0.4, GOLD(), hj.x, 6, hj.z);
  colliders.push(boxCollider(hj.x, hj.z, hj.w, hj.d, 0.1));
  label(group, 'ห้องของท่านนบี ﷺ', hj.x, 7.6, hj.z, 0.6);
  // Three small openings on the south face (Prophet ﷺ, Abu Bakr, Umar).
  const south = hj.z + hj.d / 2 + 0.02;
  for (const [x, r] of [[hj.x - 1.8, 0.36], [hj.x, 0.28], [hj.x + 1.6, 0.28]] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 6, 20), GOLD());
    ring.position.set(x, 2.2, south);
    group.add(ring);
  }
  sign(group, ['ให้สลามด้วยความสงบ  ·  ไม่แตะผนัง'], 4.6, 0.55, hj.x, 4.6, south + 0.01, 0, '#1d5c3a', '#f2e3b0');

  // Minbar: marble steps with a small canopy, west edge of the Raudhah.
  const mb = NABAWI.minbar;
  const marbleW = mat(0xf7f5ef, 0.35);
  for (let i = 0; i < 6; i++) box(group, 1.1, 0.3 + i * 0.3, 0.55, marbleW, mb.x, 0, mb.z - 1.6 + i * 0.55);
  for (const s of [-1, 1]) box(group, 0.08, 3.6, 0.08, GOLD(), mb.x + s * 0.5, 0, mb.z + 1.4);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 8), GOLD());
  cone.position.set(mb.x, 4.4, mb.z + 1.4);
  group.add(cone);
  colliders.push(boxCollider(mb.x, mb.z, 1.2, 3.6, 0.1));
  label(group, 'มิมบัร', mb.x, 5.8, mb.z + 1.4, 0.5);

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
  label(group, 'ทางเดินให้สลาม →', -22, 3.2, NABAWI.corridorZ, 0.5);

  // Interior lights.
  for (const [x, z] of (low ? [[6, 6]] : [[-12, -6], [12, 6], [0, 18]]) as [number, number][]) {
    const l = new THREE.PointLight(0xfff1d6, low ? 30 : 22, 34);
    l.position.set(x, 11, z);
    group.add(l);
  }

  // Umbrella canopies over the plaza (instanced).
  const umb: [number, number][] = [];
  for (const x of [-45, -27, -9, 9, 27, 45, 63]) {
    for (const z of [-62, -44, -26, -8, 10, 28, 40]) {
      if (z === 28 && Math.abs(x) < 34) continue;
      if (z === 40 && Math.abs(x) >= 34) continue;
      if (x > -32 && x < 32 && z > -30 && z < 30) continue; // mosque
      if (x > 34 && z > -14) continue; // Baqi
      if (Math.abs(x - NABAWI.busStop.x) < 6 && Math.abs(z - NABAWI.busStop.z) < 8) continue;
      umb.push([x, z]);
    }
  }
  const mastH = 11;
  const masts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.45, mastH, 10), mat(0xeeeae2, 0.4, { metalness: 0.2 }), umb.length);
  const canGeo = new THREE.ConeGeometry(8.5 * Math.SQRT2, 2.2, 4, 1, true);
  canGeo.rotateY(Math.PI / 4);
  const canopy = new THREE.InstancedMesh(canGeo, mat(0xf4f0e6, 0.7, { side: THREE.DoubleSide }), umb.length);
  umb.forEach(([x, z], i) => {
    masts.setMatrixAt(i, m4.makeTranslation(x, mastH / 2, z));
    canopy.setMatrixAt(i, m4.makeTranslation(x, mastH + 0.2, z));
    colliders.push({ kind: 'circle', x, z, r: 0.5 });
  });
  masts.castShadow = canopy.castShadow = true;
  group.add(masts, canopy);

  // Al-Baqi cemetery: low wall, gate facing the mosque, a fenced path; graves are off-limits.
  const B = NABAWI.baqi;
  patch(group, B.maxX - B.minX, B.maxZ - B.minZ, mat(0xbfa27a, 1), (B.minX + B.maxX) / 2, (B.minZ + B.maxZ) / 2, 0.012);
  const bw = archTexture('#d9c9a8', '#b39b72', '#c8b48e');
  const gz: [number, number] = [NABAWI.corridorZ - 2, NABAWI.corridorZ + 2];
  wallRun(group, colliders, 'z', B.minX, B.minZ, B.maxZ, [gz], 3, 0.6, bw, 3);
  wallRun(group, colliders, 'z', B.maxX, B.minZ, B.maxZ, [], 3, 0.6, bw, 3);
  wallRun(group, colliders, 'x', B.minZ, B.minX, B.maxX, [], 3, 0.6, bw, 3);
  wallRun(group, colliders, 'x', B.maxZ, B.minX, B.maxX, [], 3, 0.6, bw, 3);
  for (const s of [-1, 1]) box(group, 1, 4.6, 1, mat(0xcdb894, 0.7), B.minX, 0, NABAWI.corridorZ + s * 2.5);
  box(group, 1, 0.9, 6, mat(0xcdb894, 0.7), B.minX, 4.6, NABAWI.corridorZ);
  label(group, 'สุสานอัลบะเกียะอ์', B.minX - 0.6, 6.4, NABAWI.corridorZ, 0.9);
  const pathEnd = 66;
  patch(group, pathEnd - B.minX, 4, mat(0xe6dccb, 0.6), (B.minX + pathEnd) / 2, NABAWI.corridorZ, 0.02);
  const fence = mat(0x55606a, 0.5, { metalness: 0.4 });
  for (const z of [gz[0], gz[1]]) {
    box(group, pathEnd - B.minX, 1.0, 0.1, fence, (B.minX + pathEnd) / 2, 0, z);
    colliders.push(boxCollider((B.minX + pathEnd) / 2, z, pathEnd - B.minX, 0.1, 0.05));
  }
  box(group, 0.1, 1.0, 4, fence, pathEnd, 0, NABAWI.corridorZ);
  colliders.push(boxCollider(pathEnd, NABAWI.corridorZ, 0.1, 4, 0.05));
  const nG = low ? 220 : 520;
  const stones = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.45, 0.1), mat(0x9b8f7e, 0.9), nG);
  const mounds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.14, 1.7), mat(0xb59a74, 1), nG);
  for (let i = 0; i < nG; i++) {
    let x = 0, z = 0;
    do { x = rand(B.minX + 1.5, B.maxX - 1.5); z = rand(B.minZ + 1.5, B.maxZ - 1.5); } while (Math.abs(z - NABAWI.corridorZ) < 3);
    stones.setMatrixAt(i, m4.makeTranslation(x, 0.22, z - 0.9));
    mounds.setMatrixAt(i, m4.makeTranslation(x, 0.07, z));
  }
  group.add(stones, mounds);

  // Bus stop for the optional ziyarah trips.
  const bs = NABAWI.busStop;
  colliders.push(bus(group, bs.x - 6, bs.z - 4, false));
  box(group, 5, 0.15, 2, mat(0x2a6b5a, 0.5), bs.x + 1, 2.8, bs.z - 3);
  for (const s of [-1, 1]) box(group, 0.12, 2.8, 0.12, mat(0x8a96a3, 0.5), bs.x + 1 + s * 2.3, 0, bs.z - 3.8);
  label(group, 'ป้ายรถบัสซิยาเราะฮ์', bs.x + 1, 3.8, bs.z - 3, 0.6);

  // Palms and a skyline of hotels around the plaza.
  for (const [x, z] of [[-55, -66], [-55, 20], [70, -66], [-55, -30], [36, -66], [-20, 42], [20, 42]] as const) colliders.push(palm(group, x, z, 8));
  const hotel = [0xd9cdb6, 0xcfc2a8, 0xe3d8c4, 0xbfb29a];
  for (let i = 0; i < (low ? 14 : 26); i++) {
    const a = (i / (low ? 14 : 26)) * Math.PI * 2;
    const r = rand(130, 170);
    const x = 7 + Math.cos(a) * r, z = -13 + Math.sin(a) * r;
    box(group, rand(18, 30), rand(25, 65), rand(18, 30), mat(hotel[i % hotel.length], 0.8), x, 0, z, false);
  }

  colliders.push({ kind: 'rect-in', ...NABAWI.keep });

  // People: walkers in the plaza, rows praying in the hall, a slow queue in the corridor.
  const list: Person[] = [];
  const n = o.crowd;
  for (let i = 0; i < n * 0.45; i++) {
    const v = rand(0.8, 1.4) * (Math.random() < 0.5 ? -1 : 1);
    list.push({ x: rand(-55, 70), z: rand(-66, -30), yaw: 0, axis: 'x', v, min: -56, max: 72 });
  }
  for (let i = 0; i < n * 0.15; i++) {
    const v = rand(0.8, 1.3) * (Math.random() < 0.5 ? -1 : 1);
    list.push({ x: rand(-56, -32), z: rand(-28, 40), yaw: 0, axis: 'z', v, min: -30, max: 42 });
  }
  for (let i = 0; i < n * 0.25; i++) {
    const row = Math.floor(i / 14), k = i % 14;
    const x = -20 + k * 1.3 + (row % 2) * 0.4, z = 0.5 + row * 1.3;
    if (colPos.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 0.9) || z > 15.5) continue;
    list.push({ x, z, yaw: 0 });
  }
  for (let i = 0; i < n * 0.15; i++) {
    list.push({ x: rand(-24, 26), z: rand(18.3, 20.8), yaw: Math.PI / 2, axis: 'x', v: rand(0.5, 0.8), min: -25, max: 26 });
  }
  const tick = people(group, list, PALETTE_TRAVEL);
  return { group, colliders, tick };
}

/** Masjid Quba (local coords; placed far away by the stage). */
export const QUBA = { start: { x: 0, z: -30 }, door: { x: 0, z: -2 } };

export function buildQuba(crowd: number): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  ground(group, 400, 0xcdb593);
  const marble = tileTexture('#f4f2ec', 'rgba(180,170,150,0.3)', 4);
  marble.repeat.set(20, 20);
  floor(group, 90, 80, mat(0xffffff, 0.35, { map: marble }), 0, -5);
  const white = archTexture('#f6f4ee', '#d9d0bf', '#5a6a60');
  const hall = repeatMat(white, 28, 8);
  box(group, 28, 9, 20, hall, 0, 0, 10);
  colliders.push(boxCollider(0, 10, 28, 20));
  const door = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.6), mat(0x6b4f2e, 0.5));
  door.position.set(0, 2.3, -0.02);
  door.rotation.y = Math.PI;
  group.add(door);
  const wm = mat(0xf8f7f2, 0.4);
  dome(group, 0, 9, 10, 4.5, wm, 1.1);
  for (const x of [-8.5, 8.5]) for (const z of [4, 16]) dome(group, x, 9, z, 2.2, wm);
  for (const x of [-4, 4]) dome(group, x, 9, 3, 1.6, wm);
  for (const [x, z] of [[-16, -2], [16, -2], [-16, 22], [16, 22]] as const) colliders.push(minaret(group, x, z, { h: 36, r: 1.0, color: 0xf6f4ee, cap: 0xf6f4ee }));
  for (const [x, z] of [[-9, -12], [9, -12], [-9, -24], [9, -24], [-24, -8], [24, -8], [-24, -30], [24, -30]] as const) colliders.push(palm(group, x, z, 7.5));
  colliders.push(bus(group, -14, -34, true));
  label(group, 'มัสยิดกุบาอ์', 0, 16.5, 0, 1.4);
  label(group, 'มัสยิดหลังแรกในอิสลาม', 0, 14.6, 0, 0.7);
  colliders.push({ kind: 'rect-in', minX: -40, maxX: 40, minZ: -42, maxZ: 30 });
  const list: Person[] = [];
  for (let i = 0; i < crowd; i++) {
    const v = rand(0.7, 1.3) * (Math.random() < 0.5 ? -1 : 1);
    if (i % 3 === 0) list.push({ x: rand(-30, 30), z: rand(-38, -6), yaw: 0, axis: 'x', v, min: -34, max: 34 });
    else list.push({ x: rand(-6, 6) + (Math.random() < 0.5 ? -9 : 9), z: rand(-36, -3), yaw: 0, axis: 'z', v, min: -38, max: -3 });
  }
  const tick = people(group, list, PALETTE_TRAVEL);
  return { group, colliders, tick };
}

/** Uhud: martyrs' cemetery with the mountain behind and the archers' hill (local coords). */
export const UHUD = { start: { x: 0, z: 12 }, fence: { x: 0, z: -14.8 } };

export function buildUhud(crowd: number): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  ground(group, 900, 0xcfb187);
  const stone = tileTexture('#e7e0d2', 'rgba(160,150,130,0.35)', 4);
  stone.repeat.set(14, 12);
  floor(group, 70, 60, mat(0xffffff, 0.5, { map: stone }), 0, 4);
  // Enclosure: low wall + grille.
  const ex0 = -12, ex1 = 12, ez0 = -30, ez1 = -17;
  const wallM = mat(0xd8c7a6, 0.8);
  const grille = latticeTexture(null, '#2f4f3f', 24);
  grille.repeat.set(6, 1);
  const gm = mat(0xffffff, 0.6, { map: grille, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  const side = (w: number, d: number, x: number, z: number) => {
    box(group, w, 0.9, d, wallM, x, 0, z);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(w, d), 1.7), gm);
    g.position.set(x, 1.75, z);
    if (d > w) g.rotation.y = Math.PI / 2;
    group.add(g);
    colliders.push(boxCollider(x, z, w, d, 0.05));
  };
  side(ex1 - ex0, 0.5, 0, ez1);
  side(ex1 - ex0, 0.5, 0, ez0);
  side(0.5, ez1 - ez0, ex0, (ez0 + ez1) / 2);
  side(0.5, ez1 - ez0, ex1, (ez0 + ez1) / 2);
  patch(group, ex1 - ex0, ez1 - ez0, mat(0xb8996f, 1), 0, (ez0 + ez1) / 2, 0.012);
  for (let i = 0; i < 46; i++) {
    const x = rand(ex0 + 1.5, ex1 - 1.5), z = rand(ez0 + 1.5, ez1 - 1.5);
    box(group, 0.2, 0.4, 0.1, mat(0x8f8574, 0.9), x, 0, z, false);
  }
  label(group, 'สุสานชุฮะดาอ์อุฮุด', 0, 4.6, ez1, 0.9);
  // Mount Uhud (reddish, flat-shaded) and the archers' hill.
  const rock = mat(0x9a5b3c, 0.95, { flatShading: true });
  for (const [x, z, sx, sy, sz] of [[-120, -190, 110, 70, 50], [-20, -210, 120, 95, 60], [90, -195, 100, 75, 55], [190, -220, 90, 60, 50], [-220, -230, 90, 55, 45]] as const) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rock);
    m.scale.set(sx, sy, sz);
    m.position.set(x, sy * 0.15, z);
    group.add(m);
  }
  label(group, 'ภูเขาอุฮุด', -20, 120, -200, 9);
  const hill = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), mat(0xa47a52, 0.95, { flatShading: true }));
  hill.scale.set(12, 6, 9);
  hill.position.set(30, 0.5, -8);
  hill.castShadow = true;
  group.add(hill);
  colliders.push({ kind: 'circle', x: 30, z: -8, r: 10.5 });
  label(group, 'เนินรุมาฮ์ (เนินนักยิงธนู)', 30, 9, -8, 0.8);
  colliders.push(bus(group, -14, 20, true));
  for (const [x, z] of [[-22, 0], [22, 18], [-22, 24]] as const) colliders.push(palm(group, x, z, 7));
  colliders.push({ kind: 'rect-in', minX: -45, maxX: 45, minZ: -40, maxZ: 30 });
  const list: Person[] = [];
  for (let i = 0; i < crowd; i++) {
    if (i % 2) list.push({ x: rand(-10, 10), z: rand(-16.2, -15.4), yaw: Math.PI });
    else list.push({ x: rand(-30, 30), z: rand(-12, 26), yaw: 0, axis: 'x', v: rand(0.6, 1.1) * (i % 4 ? 1 : -1), min: -35, max: 35 });
  }
  const tick = people(group, list, PALETTE_TRAVEL);
  return { group, colliders, tick };
}
