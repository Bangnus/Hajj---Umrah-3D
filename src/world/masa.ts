import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { makeLabel } from '../engine/label';
import { box, crowdMesh, floor, mat, placeCrowd, tileTexture, type Scene3D } from './common';

/**
 * Mas'a (Safa–Marwah corridor), compressed to ~100 m (real ≈ 400 m).
 * Safa at z = 0 (south end), Marwah at z = -LEN (north end).
 */
export const MASA = {
  len: 100,
  halfW: 10,
  safaZ: 0,
  marwahZ: -100,
  green: { from: -38, to: -56 },
};

export function buildMasa(crowdCount: number): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const { len, halfW } = MASA;
  const zMin = MASA.marwahZ - 10, zMax = MASA.safaZ + 18;

  const tex = tileTexture('#efede7', 'rgba(170,165,155,0.35)', 6);
  tex.repeat.set(4, 26);
  floor(group, halfW * 2 + 6, zMax - zMin, mat(0xffffff, 0.35, { map: tex }), 0, (zMin + zMax) / 2);

  // Walls, columns, ceiling.
  const wallMat = mat(0xe8e0cf, 0.7);
  for (const s of [-1, 1]) {
    box(group, 0.6, 11, zMax - zMin, wallMat, s * (halfW + 3), 0, (zMin + zMax) / 2, false);
    for (let z = zMax - 4; z > zMin; z -= 8) box(group, 1, 10, 1, mat(0xf0ebe0, 0.5), s * halfW, 0, z);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2 + 6, zMax - zMin), mat(0xf3eee4, 0.8, { side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 10, (zMin + zMax) / 2);
  group.add(ceil);
  for (let z = zMax - 6; z > zMin; z -= 12) {
    const l = new THREE.PointLight(0xfff3dd, 18, 22);
    l.position.set(0, 9, z);
    group.add(l);
  }

  // The two hills, preserved behind low glass.
  const rock = mat(0x8a7560, 0.95, { flatShading: true });
  for (const [z, name] of [[MASA.safaZ + 7, 'เนินเศาะฟา'], [MASA.marwahZ - 7, 'เนินมัรวะฮ์']] as const) {
    const hill = new THREE.Mesh(new THREE.DodecahedronGeometry(4.2, 1), rock);
    hill.scale.set(1.6, 0.5, 1);
    hill.position.set(0, 0.8, z);
    hill.castShadow = true;
    group.add(hill);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 0.08), mat(0xbfe3ff, 0.1, { transparent: true, opacity: 0.35 }));
    glass.position.set(0, 0.6, z + (z > -50 ? -3.8 : 3.8));
    group.add(glass);
    const lb = makeLabel(name, { height: 0.9 });
    lb.position.set(0, 4.5, z);
    group.add(lb);
  }

  // Green lights marking the jogging zone (on walls and ceiling).
  const green = new THREE.MeshBasicMaterial({ color: 0x35e08f });
  for (const z of [MASA.green.from, MASA.green.to]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 5, 0.35, 0.35), green);
    bar.position.set(0, 9.6, z);
    group.add(bar);
    for (const s of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 8, 0.4), green);
      strip.position.set(s * (halfW + 2.6), 5, z);
      group.add(strip);
    }
    const gl = new THREE.PointLight(0x35e08f, 10, 16);
    gl.position.set(0, 8, z);
    group.add(gl);
  }
  const gz = makeLabel('ไฟเขียว: ผู้ชายวิ่งเหยาะ ๆ', { height: 0.6, bg: 'rgba(20,90,55,0.85)' });
  gz.position.set(0, 7.5, MASA.green.from);
  group.add(gz);

  colliders.push({ kind: 'rect-in', minX: -halfW + 0.6, maxX: halfW - 0.6, minZ: MASA.marwahZ - 3.4, maxZ: zMax - 1 });

  // Crowd walking back and forth.
  const crowd = crowdMesh(crowdCount, [0xf4f2ec, 0xf4f2ec, 0x1f1f24, 0xf4f2ec, 0x30303a]);
  group.add(crowd.body, crowd.head);
  const people = Array.from({ length: crowdCount }, () => ({
    x: (Math.random() * 2 - 1) * (halfW - 1.5),
    z: MASA.marwahZ + Math.random() * len,
    v: (1.1 + Math.random() * 0.8) * (Math.random() < 0.5 ? 1 : -1),
  }));
  const tick = (dt: number) => {
    people.forEach((p, i) => {
      const inGreen = p.z < MASA.green.from && p.z > MASA.green.to;
      p.z += p.v * dt * (inGreen ? 1.5 : 1);
      if (p.z > MASA.safaZ) { p.z = MASA.safaZ; p.v = -Math.abs(p.v); }
      if (p.z < MASA.marwahZ) { p.z = MASA.marwahZ; p.v = Math.abs(p.v); }
      placeCrowd(crowd, i, p.x, p.z, p.v > 0 ? 0 : Math.PI);
    });
    crowd.body.instanceMatrix.needsUpdate = true;
    crowd.head.instanceMatrix.needsUpdate = true;
  };
  tick(0);
  return { group, colliders, tick };
}
