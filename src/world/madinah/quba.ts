import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { box, boxCollider, floor, mat, tileTexture, type Scene3D } from '../common';
import {
  PALETTE_TRAVEL, archTexture, bus, dome, ground, label, minaret, palm, people, rand, repeatMat, type Person,
} from '../props';
import { tr } from '../../i18n';

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
  label(group, tr('มัสยิดกุบาอ์'), 0, 16.5, 0, 1.4);
  label(group, tr('มัสยิดหลังแรกในอิสลาม'), 0, 14.6, 0, 0.7);
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
