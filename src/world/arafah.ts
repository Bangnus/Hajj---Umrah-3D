import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { box, cyl, mat, type Scene3D } from './common';
import { ground, label, mountainRing, pavilion, rng, scatter, signBoard, speckTexture, standers, tentField, treeField, walkers, type TentSpot } from './hajjCommon';
import { tr } from '../i18n';

/**
 * Arafah: an open plain. The player arrives from the south (+z) and enters the
 * boundary at z = 0 (marked by tall posts and yellow signs). Masjid Namirah stands to
 * the west, straddling the boundary; Jabal Rahmah rises far to the north-east.
 * Qibla is to the west (-x).
 */
export const ARAFAH = {
  start: { x: 0, z: 46 },
  boundaryZ: 0,
  gate: { x: 0, z: -3 },
  camp: { x: 18, z: -42 },
  exit: { x: 0, z: 24 },
  namirah: { x: -92, z: -6 },
  rahmah: { x: 70, z: -210 },
  bounds: { minX: -60, maxX: 60, minZ: -120, maxZ: 62 },
};

export function buildArafah(o: { quality: 'low' | 'high' }): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const high = o.quality === 'high';
  const { boundaryZ } = ARAFAH;

  // Inside Arafah: light sand. Outside (south of the line): a slightly darker strip.
  ground(group, 1200, 1200, mat(0xffffff, 0.95, { map: speckTexture('#dcc8a0', ['#c9b48a', '#e8d8b6', '#b9a37a'], 2400, 256, 110) }));
  ground(group, 1200, 600, mat(0xb9a07a, 0.95, { transparent: true, opacity: 0.45 }), 0, boundaryZ + 300, 0.01);
  ground(group, 16, 400, mat(0x5e6064, 0.9), 0, -80, 0.02);

  // Boundary: tall posts along the line, broken by the road.
  const posts: TentSpot[] = [];
  for (let x = -300; x <= 300; x += 12) if (Math.abs(x) > 10) posts.push({ x, z: boundaryZ });
  const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.45, 7, 8), mat(0xd9a531, 0.6), posts.length);
  const cap = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 10, 8), mat(0xffffff, 0.4), posts.length);
  const m4 = new THREE.Matrix4();
  posts.forEach((p, i) => {
    pm.setMatrixAt(i, m4.makeTranslation(p.x, 3.5, p.z));
    cap.setMatrixAt(i, m4.makeTranslation(p.x, 7.2, p.z));
  });
  pm.castShadow = true;
  group.add(pm, cap);
  // Painted line on the ground.
  ground(group, 600, 0.6, new THREE.MeshBasicMaterial({ color: 0xe0b23a }), 0, boundaryZ, 0.03);
  for (const s of [-1, 1]) {
    signBoard(group, [tr('เขตอะรอฟะฮ์ เริ่มที่นี่'), 'بداية عرفة'], {
      x: s * 14, z: boundaryZ + 0.5, w: 9, h: 3.2, y: 2.4, bg: '#f2c230', color: '#1d2a22', size: 110,
      back: [tr('สิ้นสุดเขตอะรอฟะฮ์'), 'نهاية عرفة'],
    });
    colliders.push({ kind: 'box', minX: s * 14 - 4.6, maxX: s * 14 + 4.6, minZ: boundaryZ + 0.3, maxZ: boundaryZ + 0.7 });
  }

  // Masjid Namirah (part of it lies outside Arafah).
  const nm = ARAFAH.namirah;
  const cream = mat(0xece3cf, 0.7);
  box(group, 46, 15, 60, cream, nm.x, 0, nm.z);
  box(group, 48, 1.2, 62, mat(0xd9cfb8, 0.6), nm.x, 15, nm.z);
  for (const [dx, dz] of [[-23, -30], [23, -30], [-23, 30], [23, 30], [23, -8], [23, 8]]) {
    cyl(group, 1.5, 1.8, 58, cream, nm.x + dx, 0, nm.z + dz, 12);
    cyl(group, 2.2, 2.2, 1.4, mat(0xd9cfb8, 0.6), nm.x + dx, 40, nm.z + dz, 12);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.5, 7, 12), mat(0x2f7a5a, 0.5));
    top.position.set(nm.x + dx, 61.5, nm.z + dz);
    group.add(top);
  }
  for (const dz of [-15, 0, 15]) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3a8a66, 0.45));
    dome.position.set(nm.x, 16.2, nm.z + dz);
    group.add(dome);
  }
  label(group, tr('มัสยิดนะมิเราะฮ์'), nm.x + 26, 22, nm.z, 2.2);

  // Jabal Rahmah with its white pillar.
  const jr = ARAFAH.rahmah;
  const hill = new THREE.Mesh(new THREE.ConeGeometry(48, 34, 14, 3), mat(0x8b6d52, 0.95, { flatShading: true }));
  hill.position.set(jr.x, 17, jr.z);
  hill.receiveShadow = true;
  group.add(hill);
  cyl(group, 1.2, 1.5, 9, mat(0xffffff, 0.4), jr.x, 33, jr.z, 12);
  label(group, tr('ภูเขาเราะห์มะฮ์'), jr.x, 48, jr.z, 3);
  // Pilgrims dotted on the hill.
  const r = rng(21);
  const onHill: { x: number; z: number }[] = [];
  for (let i = 0; i < (high ? 160 : 60); i++) {
    const a = r() * Math.PI * 2, d = 8 + r() * 36;
    onHill.push({ x: jr.x + Math.cos(a) * d, z: jr.z + Math.sin(a) * d });
  }
  const hillCrowd = standers(group, onHill);
  const tmp = new THREE.Matrix4(), pp = new THREE.Vector3();
  for (let i = 0; i < onHill.length; i++) {
    const p = onHill[i];
    const y = 34 * (1 - Math.hypot(p.x - jr.x, p.z - jr.z) / 48);
    for (const im of [hillCrowd.body, hillCrowd.head]) {
      im.getMatrixAt(i, tmp);
      pp.setFromMatrixPosition(tmp);
      tmp.setPosition(pp.x, pp.y + y, pp.z);
      im.setMatrixAt(i, tmp);
    }
  }

  // Camps: tent fields on both sides of the road inside Arafah, plus the player's open tent.
  const campSpots: TentSpot[] = [];
  for (let x = 32; x <= 120; x += 9) for (let z = -20; z >= -150; z -= 9) campSpots.push({ x, z });
  for (let x = -28; x >= -60; x -= 9) for (let z = -48; z >= -150; z -= 9) campSpots.push({ x, z });
  const nearCamp = campSpots.filter((s) => Math.abs(s.x) < 64);
  colliders.push(...tentField(group, nearCamp, 7, true));
  tentField(group, campSpots.filter((s) => Math.abs(s.x) >= 64), 7, false);
  colliders.push(...pavilion(group, { x: ARAFAH.camp.x, z: ARAFAH.camp.z, w: 12, d: 12, open: 'west', title: [tr('คณะประเทศไทย (อะรอฟะฮ์)')] }));
  label(group, tr('⛺ ที่พักคณะของคุณ'), ARAFAH.camp.x, 8, ARAFAH.camp.z, 1.1, 'rgba(160,110,10,0.88)');

  // Scattered trees (planted across the plain).
  const avoid = [
    { minX: -11, maxX: 11, minZ: -400, maxZ: 400 },
    { minX: 10, maxX: 125, minZ: -155, maxZ: -15 },
    { minX: -65, maxX: -24, minZ: -155, maxZ: -44 },
    { minX: -120, maxX: -64, minZ: -40, maxZ: 28 },
    { minX: 18, maxX: 125, minZ: -260, maxZ: -160 },
  ];
  const trees = scatter(high ? 260 : 110, -320, 320, -320, 120, 5, avoid);
  treeField(group, trees);
  for (const t of trees) {
    if (t.x > ARAFAH.bounds.minX && t.x < ARAFAH.bounds.maxX && t.z > ARAFAH.bounds.minZ && t.z < ARAFAH.bounds.maxZ) colliders.push({ kind: 'circle', x: t.x, z: t.z, r: 0.45 });
  }

  // Pilgrims resting in the shade and walking on the road.
  const sitters = scatter(high ? 120 : 40, -55, 55, -110, -6, 31, [{ minX: -10, maxX: 10, minZ: -200, maxZ: 10 }, { minX: 10, maxX: 30, minZ: -52, maxZ: -32 }, ...avoid.slice(1)]);
  standers(group, sitters.map((s, i) => ({ ...s, yaw: i % 3 === 0 ? -Math.PI / 2 : (i * 1.7) % 6 })));

  mountainRing(group, { count: high ? 40 : 24, rMin: 380, rMax: 470, hMin: 40, hMax: 100, color: 0x8f7258, seed: 4 });

  colliders.push({ kind: 'rect-in', ...ARAFAH.bounds });
  const tick = walkers(group, high ? 120 : 45, [
    { axis: 'z', from: 60, to: -118, a: -6.5, b: -1, dir: -1 },
    { axis: 'z', from: 60, to: -118, a: 1, b: 6.5, dir: 1 },
  ]);
  return { group, colliders, tick };
}
