import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { box, mat, tileTexture, type Scene3D } from './common';
import { ground, mountainRing, rng, signBoard, speckTexture, standers, tentField, walkers, type TentSpot } from './hajjCommon';
import { tr } from '../i18n';
import { addJamaratBarbers, addJamaratPillars } from './jamarat/structures';

export type JamrahKey = 'sughra' | 'wusta' | 'aqabah';

export interface Jamrah {
  key: JamrahKey;
  x: number;
  name: string;
  arabic: string;
}

/**
 * The Jamarat bridge (ground floor of a multi-level structure), compressed in length.
 * Pilgrims flow one way from Mina in the east (+x) towards Makkah in the west (-x):
 * small (Sughra) → middle (Wusta) → Aqabah. Each jamrah is an elongated wall standing in an
 * oval basin, rising through all floors. Throw zones lie on the south side (+z) of each basin.
 */
export const JAMARAT = {
  pillars: [
    { key: 'sughra', x: 52, name: tr('ญัมเราะฮ์ศุฆรอ'), arabic: 'الجمرة الصغرى' },
    { key: 'wusta', x: 0, name: tr('ญัมเราะฮ์วุสฏอ'), arabic: 'الجمرة الوسطى' },
    { key: 'aqabah', x: -56, name: tr('ญัมเราะฮ์อะกอบะฮ์'), arabic: 'جمرة العقبة' },
  ] as Jamrah[],
  basin: { rx: 11, rz: 4.2 },
  /** z of the throw zones (south side of the basins). */
  zoneZ: 7.6,
  levels: [11, 22, 33],
  eastStart: { x: 104, z: 9 },
  aqabahStart: { x: -16, z: 9 },
  barber: { x: -92, z: -9.5 },
  exitWest: { x: -103, z: 9 },
  minaReturn: { x: -84, z: 13 },
  bounds: { minX: -110, maxX: 114, minZ: -19, maxZ: 19 },
};

export const jamrah = (k: JamrahKey) => JAMARAT.pillars.find((p) => p.key === k)!;

export function buildJamarat(o: { quality: 'low' | 'high' }): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const high = o.quality === 'high';
  const { rx, rz } = JAMARAT.basin;
  const X0 = -118, X1 = 124, HW = 22;

  ground(group, 1000, 1000, mat(0xffffff, 0.95, { map: speckTexture('#cbbb9f', ['#b8a789', '#d9cbb0'], 2000, 256, 100) }));
  const tile = tileTexture('#dfddd6', 'rgba(150,145,135,0.34)', 8);
  tile.repeat.set(30, 6);
  ground(group, X1 - X0, HW * 2, mat(0xffffff, 0.45, { map: tile }), (X0 + X1) / 2, 0, 0.01);

  // Flow arrows painted on the floor (one-way, towards the west).
  const shape = new THREE.Shape();
  shape.moveTo(0, 1); shape.lineTo(0.7, 0); shape.lineTo(0.25, 0); shape.lineTo(0.25, -1); shape.lineTo(-0.25, -1); shape.lineTo(-0.25, 0); shape.lineTo(-0.7, 0); shape.closePath();
  const arrows: TentSpot[] = [];
  for (let x = 110; x > -105; x -= 14) for (const z of [-12, 12]) arrows.push({ x, z });
  const arrowMesh = new THREE.InstancedMesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0x2f9e6e, transparent: true, opacity: 0.7, depthWrite: false }), arrows.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1.4, 1.4, 1.4), p = new THREE.Vector3();
  q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2));
  arrows.forEach((a, i) => arrowMesh.setMatrixAt(i, m4.compose(p.set(a.x, 0.03, a.z), q, s)));
  group.add(arrowMesh);

  // Upper floors: slabs with openings above each basin.
  const slabMat = mat(0xd4cfc4, 0.7, { emissive: 0x3c3a35 });
  const holes = JAMARAT.pillars.map((pl) => [pl.x - rx - 1, pl.x + rx + 1] as const).sort((a, b) => a[0] - b[0]);
  for (const y of JAMARAT.levels) {
    let x = X0;
    for (const [h0, h1] of holes) {
      box(group, h0 - x, 1.2, HW * 2, slabMat, (x + h0) / 2, y, 0);
      for (const sgn of [-1, 1]) box(group, h1 - h0, 1.2, HW - rz - 1.5, slabMat, (h0 + h1) / 2, y, sgn * (rz + 1.5 + (HW - rz - 1.5) / 2));
      x = h1;
    }
    box(group, X1 - x, 1.2, HW * 2, slabMat, (x + X1) / 2, y, 0);
    // Railings on the upper floors.
    for (const sgn of [-1, 1]) box(group, X1 - X0, 1.1, 0.2, mat(0x9aa3ab, 0.4, { metalness: 0.5 }), (X0 + X1) / 2, y + 1.2, sgn * (HW - 0.2), false);
  }
  // Edge columns (outside the walkway) and a few between the pillars' openings.
  const cols: TentSpot[] = [];
  for (let x = X0 + 4; x <= X1 - 2; x += 12) for (const z of [-HW + 0.8, HW - 0.8]) cols.push({ x, z });
  const colMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 34.2, 1.2), mat(0xe2ddd2, 0.6), cols.length);
  cols.forEach((c, i) => colMesh.setMatrixAt(i, m4.makeTranslation(c.x, 17.1, c.z)));
  colMesh.castShadow = true;
  group.add(colMesh);
  // Ceiling light strips under the first floor.
  const strips: TentSpot[] = [];
  for (let x = X0 + 6; x < X1; x += 10) for (const z of [-12, 0, 12]) if (!holes.some(([h0, h1]) => x > h0 - 1 && x < h1 + 1 && Math.abs(z) < rz + 2)) strips.push({ x, z });
  const stripMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(6, 0.5), new THREE.MeshBasicMaterial({ color: 0xfff6e0 }), strips.length);
  q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  strips.forEach((t, i) => stripMesh.setMatrixAt(i, m4.compose(p.set(t.x, 10.95, t.z), q, s.set(1, 1, 1))));
  group.add(stripMesh);
  for (const x of [90, 26, -28, -84]) {
    const l = new THREE.PointLight(0xfff3dd, 26, 45, 1);
    l.position.set(x, 9.5, 0);
    group.add(l);
  }

  addJamaratPillars(group, colliders, JAMARAT.pillars, JAMARAT.basin, JAMARAT.levels);

  // Entrance and exit signs.
  signBoard(group, [tr('สะพานญะมะรอต · ชั้นล่าง'), 'منشأة الجمرات'], { x: 90, z: 0, yaw: Math.PI / 2, w: 12, h: 3, y: 7, bg: '#1f5d46', size: 110, posts: false });
  signBoard(group, [tr('ทางออก → มักกะฮ์'), 'إلى مكة'], { x: -108, z: 0, yaw: Math.PI / 2, w: 10, h: 2.6, y: 7, bg: '#11302a', color: '#f2d06b', size: 110, posts: false });

  addJamaratBarbers(group, colliders, JAMARAT.barber.x);

  // Mina's tents beyond the east end; mountains around.
  const tents: TentSpot[] = [];
  for (let x = 140; x <= (high ? 300 : 230); x += 8) for (let z = -120; z <= 120; z += 9) if (Math.abs(z) > 12 || x > 170) tents.push({ x, z });
  tentField(group, tents, 7, false);
  mountainRing(group, { count: high ? 40 : 24, rMin: 280, rMax: 380, hMin: 50, hMax: 110, color: 0x8a6c52, seed: 13 });

  colliders.push({ kind: 'rect-in', ...JAMARAT.bounds });

  // Pilgrims at the basin edges (throwing) and a one-way flow along the bridge.
  const r = rng(8);
  const edge: { x: number; z: number; yaw: number }[] = [];
  for (const pl of JAMARAT.pillars) {
    for (let i = 0; i < (high ? 26 : 10); i++) {
      const a = r() * Math.PI * 2;
      const zz = Math.sin(a) * (rz + 0.7);
      if (zz > 2 && Math.abs(Math.cos(a)) < 0.5) continue; // keep the player's throw spot clear
      edge.push({ x: pl.x + Math.cos(a) * (rx + 0.7), z: zz, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) });
    }
  }
  standers(group, edge);
  const tick = walkers(group, high ? 240 : 90, [
    { axis: 'x', from: 112, to: -108, a: 11, b: 18, dir: -1 },
    { axis: 'x', from: 112, to: -108, a: -18, b: -6, dir: -1 },
  ]);
  return { group, colliders, tick };
}
