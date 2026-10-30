import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { mergeParts } from '../../engine/lod';
import { box, boxCollider, floor, mat, tileTexture, type Scene3D } from '../common';
import {
  PALETTE_TRAVEL, bus, ground, label, latticeTexture, palm, patch, people, rand, type Person,
} from '../props';
import { tr } from '../../i18n';

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
  label(group, tr('สุสานชุฮะดาอ์อุฮุด'), 0, 4.6, ez1, 0.9);
  // Mount Uhud (sculpted reddish granite massif) and Jabal ar-Rumah (the archers' hill).
  const uhudMassif = new THREE.Mesh(
    mergeParts(([[-120, -190, 110, 70, 50], [-20, -210, 120, 95, 60], [90, -195, 100, 75, 55], [190, -220, 90, 60, 50], [-220, -230, 90, 55, 45]] as const).map(([x, z, sx, sy, sz], i) => ({
      geo: new THREE.IcosahedronGeometry(1, 2),
      x, y: sy * 0.16, z, sx, sy, sz, ry: i * 1.1,
      color: i % 2 === 0 ? 0x9c5c3d : 0x8f5236, aoBottom: 0.72,
    }))),
    mat(0xffffff, 0.95, { flatShading: true, vertexColors: true }),
  );
  group.add(uhudMassif);
  label(group, tr('ภูเขาอุฮุด'), -20, 120, -200, 9);
  const hillGeo = mergeParts([
    { geo: new THREE.DodecahedronGeometry(1, 2), y: 0.5, sx: 11.5, sy: 5.8, sz: 8.8, color: 0xa47a52, aoBottom: 0.74 },
    { geo: new THREE.DodecahedronGeometry(1, 1), x: -4.5, y: 0.4, z: 2.5, sx: 5.5, sy: 3.6, sz: 4.8, color: 0x966d47, aoBottom: 0.74 },
    { geo: new THREE.DodecahedronGeometry(1, 1), x: 4.8, y: 0.4, z: -2.0, sx: 5.0, sy: 3.4, sz: 4.5, color: 0xad8259, aoBottom: 0.74 },
  ]);
  const hill = new THREE.Mesh(hillGeo, mat(0xffffff, 0.94, { flatShading: true, vertexColors: true }));
  hill.position.set(30, 0, -8);
  hill.castShadow = hill.receiveShadow = true;
  group.add(hill);
  colliders.push({ kind: 'circle', x: 30, z: -8, r: 10.5 });
  label(group, tr('เนินรุมาฮ์ (เนินนักยิงธนู)'), 30, 9, -8, 0.8);
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
