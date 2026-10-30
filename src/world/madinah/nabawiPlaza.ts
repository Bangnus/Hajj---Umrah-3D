import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { createPropFieldLOD, mergeParts } from '../../engine/lod';
import { box, boxCollider, mat } from '../common';
import {
  PALETTE_TRAVEL, archTexture, bus, label, palm, patch, people, rand, wallRun, type Person,
} from '../props';
import { tr } from '../../i18n';
import type { NABAWI } from './nabawi';

export function addNabawiPlaza(
  group: THREE.Group,
  colliders: Collider[],
  colPos: [number, number][],
  o: { crowd: number; quality: 'low' | 'high' },
  cfg: typeof NABAWI,
): (dt: number) => void {
  const low = o.quality === 'low';
  const m4 = new THREE.Matrix4();

  // Interior lights.
  for (const [x, z] of (low ? [[6, 6]] : [[-12, -6], [12, 6], [0, 18]]) as [number, number][]) {
    const l = new THREE.PointLight(0xfff1d6, low ? 30 : 22, 34);
    l.position.set(x, 11, z);
    group.add(l);
  }

  // Iconic Nabawi convertible plaza umbrellas (frustum-culled + 3-tier LOD).
  const umb: [number, number][] = [];
  for (const x of [-45, -27, -9, 9, 27, 45, 63]) {
    for (const z of [-62, -44, -26, -8, 10, 28, 40]) {
      if (z === 28 && Math.abs(x) < 34) continue;
      if (z === 40 && Math.abs(x) >= 34) continue;
      if (x > -32 && x < 32 && z > -30 && z < 30) continue; // mosque
      if (x > 34 && z > -14) continue; // Baqi
      if (Math.abs(x - cfg.busStop.x) < 6 && Math.abs(z - cfg.busStop.z) < 8) continue;
      umb.push([x, z]);
    }
  }
  const mastH = 11;
  const umbGeo0 = mergeParts([
    // Marble plinth + fluted column + golden filigree ring bands + AC lamp housing
    { geo: new THREE.CylinderGeometry(0.56, 0.64, 0.85, 12), y: 0.425, color: 0xded8ca, aoBottom: 0.84 },
    { geo: new THREE.CylinderGeometry(0.32, 0.44, mastH - 0.8, 12), y: 0.8 + (mastH - 0.8) / 2, color: 0xf2eee5 },
    { geo: new THREE.CylinderGeometry(0.46, 0.46, 0.24, 12), y: 6.8, color: 0xd6b25a },
    { geo: new THREE.CylinderGeometry(0.68, 0.42, 0.9, 12), y: 9.2, color: 0xd8b65e },
    // Inverted funnel PTFE membrane canopy + blue ornamental border + golden finial
    { geo: new THREE.ConeGeometry(8.5 * Math.SQRT2, 2.2, 4, 1, true), y: mastH + 0.2, ry: Math.PI / 4, color: 0xf6f3ea },
    { geo: new THREE.BoxGeometry(17.1, 0.16, 17.1), y: mastH + 1.25, color: 0x2c628c },
    { geo: new THREE.BoxGeometry(16.6, 0.19, 16.6), y: mastH + 1.25, color: 0xf7f4ec },
    { geo: new THREE.CylinderGeometry(0.08, 0.14, 1.4, 8), y: mastH + 1.8, color: 0xd6b25a },
  ]);
  const umbGeo2 = mergeParts([
    { geo: new THREE.CylinderGeometry(0.34, 0.46, mastH, 6), y: mastH / 2, color: 0xeeeae2 },
    { geo: new THREE.ConeGeometry(8.5 * Math.SQRT2, 2.2, 4, 1, true), y: mastH + 0.2, ry: Math.PI / 4, color: 0xf4f0e6 },
  ]);
  umb.forEach(([x, z]) => colliders.push({ kind: 'circle', x, z, r: 0.5 }));
  createPropFieldLOD(
    group,
    umb.map(([x, z]) => ({ x, z })),
    [
      { maxDist: 56, layers: [{ geo: umbGeo0, mat: mat(0xffffff, 0.52, { side: THREE.DoubleSide, vertexColors: true }), castShadow: true, receiveShadow: true }] },
      { maxDist: 260, layers: [{ geo: umbGeo2, mat: mat(0xffffff, 0.9, { side: THREE.DoubleSide, vertexColors: true }), castShadow: false, receiveShadow: false }] },
    ],
    9.5,
    8.5,
  );

  // Al-Baqi cemetery: low wall, gate facing the mosque, a fenced path; graves are off-limits.
  const B = cfg.baqi;
  patch(group, B.maxX - B.minX, B.maxZ - B.minZ, mat(0xbfa27a, 1), (B.minX + B.maxX) / 2, (B.minZ + B.maxZ) / 2, 0.012);
  const bw = archTexture('#d9c9a8', '#b39b72', '#c8b48e');
  const gz: [number, number] = [cfg.corridorZ - 2, cfg.corridorZ + 2];
  wallRun(group, colliders, 'z', B.minX, B.minZ, B.maxZ, [gz], 3, 0.6, bw, 3);
  wallRun(group, colliders, 'z', B.maxX, B.minZ, B.maxZ, [], 3, 0.6, bw, 3);
  wallRun(group, colliders, 'x', B.minZ, B.minX, B.maxX, [], 3, 0.6, bw, 3);
  wallRun(group, colliders, 'x', B.maxZ, B.minX, B.maxX, [], 3, 0.6, bw, 3);
  for (const s of [-1, 1]) box(group, 1, 4.6, 1, mat(0xcdb894, 0.7), B.minX, 0, cfg.corridorZ + s * 2.5);
  box(group, 1, 0.9, 6, mat(0xcdb894, 0.7), B.minX, 4.6, cfg.corridorZ);
  label(group, tr('สุสานอัลบะเกียะอ์'), B.minX - 0.6, 6.4, cfg.corridorZ, 0.9);
  const pathEnd = 66;
  patch(group, pathEnd - B.minX, 4, mat(0xe6dccb, 0.6), (B.minX + pathEnd) / 2, cfg.corridorZ, 0.02);
  const fence = mat(0x55606a, 0.5, { metalness: 0.4 });
  for (const z of [gz[0], gz[1]]) {
    box(group, pathEnd - B.minX, 1.0, 0.1, fence, (B.minX + pathEnd) / 2, 0, z);
    colliders.push(boxCollider((B.minX + pathEnd) / 2, z, pathEnd - B.minX, 0.1, 0.05));
  }
  box(group, 0.1, 1.0, 4, fence, pathEnd, 0, cfg.corridorZ);
  colliders.push(boxCollider(pathEnd, cfg.corridorZ, 0.1, 4, 0.05));
  const nG = low ? 220 : 520;
  const stones = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.45, 0.1), mat(0x9b8f7e, 0.9), nG);
  const mounds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.14, 1.7), mat(0xb59a74, 1), nG);
  for (let i = 0; i < nG; i++) {
    let x = 0, z = 0;
    do { x = rand(B.minX + 1.5, B.maxX - 1.5); z = rand(B.minZ + 1.5, B.maxZ - 1.5); } while (Math.abs(z - cfg.corridorZ) < 3);
    stones.setMatrixAt(i, m4.makeTranslation(x, 0.22, z - 0.9));
    mounds.setMatrixAt(i, m4.makeTranslation(x, 0.07, z));
  }
  group.add(stones, mounds);

  // Bus stop for the optional ziyarah trips.
  const bs = cfg.busStop;
  colliders.push(bus(group, bs.x - 6, bs.z - 4, false));
  box(group, 5, 0.15, 2, mat(0x2a6b5a, 0.5), bs.x + 1, 2.8, bs.z - 3);
  for (const s of [-1, 1]) box(group, 0.12, 2.8, 0.12, mat(0x8a96a3, 0.5), bs.x + 1 + s * 2.3, 0, bs.z - 3.8);
  label(group, tr('ป้ายรถบัสซิยาเราะฮ์'), bs.x + 1, 3.8, bs.z - 3, 0.6);

  // Palms and a skyline of hotels around the plaza (merged into 1 draw call).
  for (const [x, z] of [[-55, -66], [-55, 20], [70, -66], [-55, -30], [36, -66], [-20, 42], [20, 42]] as const) colliders.push(palm(group, x, z, 8));
  const hotel = [0xd9cdb6, 0xcfc2a8, 0xe3d8c4, 0xbfb29a];
  const hotelCount = low ? 14 : 26;
  const skyline = new THREE.Mesh(
    mergeParts(Array.from({ length: hotelCount }, (_, i) => {
      const a = (i / hotelCount) * Math.PI * 2;
      const r = rand(130, 170);
      const hw = rand(18, 30), hh = rand(25, 65), hd = rand(18, 30);
      return {
        geo: new THREE.BoxGeometry(hw, hh, hd),
        x: 7 + Math.cos(a) * r, y: hh / 2, z: -13 + Math.sin(a) * r,
        color: hotel[i % hotel.length], aoBottom: 0.80,
      };
    })),
    mat(0xffffff, 0.82, { vertexColors: true }),
  );
  group.add(skyline);

  colliders.push({ kind: 'rect-in', ...cfg.keep });

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
  return people(group, list, PALETTE_TRAVEL);
}
