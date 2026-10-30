import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { mat, type Scene3D } from './common';
import { ground, label, lampPosts, mountainRing, pavilion, signBoard, speckTexture, tentField, walkers, type TentSpot } from './hajjCommon';

/**
 * Mina: a valley of white fire-proof tents. A main road runs north (-z) from the start;
 * tent blocks line both sides, separated by cross streets. The player's group tent is an
 * open pavilion on the west side of the road. Makkah (qibla) lies to the west (-x).
 */
export const MINA = {
  start: { x: 0, z: 40 },
  /** Inside the player's tent. */
  tent: { x: -17, z: -46 },
  roadHalf: 8,
  bounds: { minX: -60, maxX: 60, minZ: -195, maxZ: 52 },
};

const BLOCK_Z0 = [16, -28, -72, -116, -160];

export function buildMina(o: { quality: 'low' | 'high' }): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const high = o.quality === 'high';

  ground(group, 900, 900, mat(0xffffff, 0.95, { map: speckTexture('#cdbfa5', ['#b9a98c', '#d9ccb2', '#a8987c'], 2400, 256, 90) }));
  // Main road with a dashed centre line, and cross streets.
  ground(group, MINA.roadHalf * 2, 280, mat(0x5a5d61, 0.9), 0, -70, 0.01);
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.25, 3), new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }), 40);
  const m4 = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  for (let i = 0; i < 40; i++) dash.setMatrixAt(i, m4.clone().setPosition(0, 0.02, 55 - i * 7));
  group.add(dash);
  for (const z0 of BLOCK_Z0) ground(group, 240, 8, mat(0x6a6d70, 0.9), 0, z0 + 4, 0.008);

  // Tent blocks: 6 columns x 4 rows per block on each side of the road.
  const near: TentSpot[] = [];
  const far: TentSpot[] = [];
  const farCols = high ? 12 : 9;
  for (const s of [-1, 1]) {
    BLOCK_Z0.forEach((z0) => {
      for (let c = 0; c < farCols; c++) {
        for (let r = 0; r < 4; r++) {
          const x = s * (13 + c * 8 + (c >= 6 ? 8 : 0));
          const z = z0 - 4.5 - r * 9;
          // Leave room for the player's pavilion.
          if (s < 0 && c <= 1 && z < -36 && z > -56) continue;
          (c < 6 ? near : far).push({ x, z });
        }
      }
    });
  }
  colliders.push(...tentField(group, near, 7, true));
  tentField(group, far, 7, false);
  // More tents filling the valley beyond the road's end and behind the start.
  const extra: TentSpot[] = [];
  for (let x = -100; x <= 100; x += 8) for (let z = -210; z >= (high ? -290 : -250); z -= 9) extra.push({ x, z });
  for (let x = -100; x <= 100; x += 8) for (let z = 78; z <= (high ? 150 : 110); z += 9) if (Math.abs(x) > 12) extra.push({ x, z });
  tentField(group, extra, 7, false);

  // The player's group tent.
  colliders.push(...pavilion(group, { x: MINA.tent.x, z: MINA.tent.z, w: 14, d: 14, open: 'east', title: ['เต็นท์คณะประเทศไทย 58'] }));
  label(group, '⛺ เต็นท์ของคุณ', MINA.tent.x, 8.2, MINA.tent.z, 1.1, 'rgba(160,110,10,0.88)');

  // Signs.
  signBoard(group, ['มีนา  منى'], { x: 0, z: 30, w: 14, h: 2.6, y: 6, bg: '#1f5d46', color: '#ffffff', size: 200 });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8.8, 0.4), mat(0x6b7076, 0.6));
    post.position.set(s * 7.2, 4.4, 30);
    group.add(post);
  }
  signBoard(group, ['คณะประเทศไทย ←', 'ถนนหมายเลข 5 · เต็นท์ 58'], { x: -10.5, z: -26, w: 6, h: 2.2, y: 1.6, bg: '#11302a', color: '#f2d06b', size: 90 });
  signBoard(group, ['ถนน 4'], { x: 9.6, z: 22, w: 2.6, h: 1, y: 2.4, size: 150 });
  signBoard(group, ['ถนน 5'], { x: -9.6, z: -22, w: 2.6, h: 1, y: 2.4, size: 150 });

  // Street lights along the road.
  const lamps: TentSpot[] = [];
  for (let z = 48; z > -195; z -= 22) lamps.push({ x: -8.8, z }, { x: 8.8, z: z - 11 });
  lampPosts(group, lamps, 9);

  // Mountains around the valley.
  mountainRing(group, { count: high ? 46 : 26, rMin: 260, rMax: 360, hMin: 45, hMax: 110, color: 0x8a6c52, cz: -60 });

  colliders.push({ kind: 'rect-in', ...MINA.bounds });

  const tick = walkers(group, high ? 170 : 60, [
    { axis: 'z', from: 50, to: -190, a: -6.5, b: -1, dir: -1 },
    { axis: 'z', from: 50, to: -190, a: 1, b: 6.5, dir: 1 },
    { axis: 'x', from: -55, to: 55, a: -24.5, b: -21, dir: 0 },
    { axis: 'x', from: -55, to: 55, a: -68.5, b: -65, dir: 0 },
  ]);
  return { group, colliders, tick };
}
