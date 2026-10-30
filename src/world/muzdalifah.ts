import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { box, boxCollider, cyl, mat, type Scene3D } from './common';
import { ground, label, lampPosts, mountainRing, rng, scatter, signBoard, speckTexture, walkers, type TentSpot } from './hajjCommon';

/**
 * Muzdalifah at night: open gravel ground under tall flood lights, pilgrims resting on
 * mats, buses parked to the east and al-Mash'ar al-Haram mosque to the north.
 * The player arrives from the south (+z). Qibla is to the west (-x).
 */
export const MUZ = {
  start: { x: 0, z: 44 },
  camp: { x: 0, z: 16 },
  /** Centre of the pebble-collecting area. */
  pebbles: { x: 10, z: 4 },
  mat: { x: -8, z: 6 },
  mashar: { x: 0, z: -66 },
  mosque: { x: 0, z: -88 },
  bounds: { minX: -60, maxX: 60, minZ: -112, maxZ: 58 },
};

export function buildMuzdalifah(o: { quality: 'low' | 'high' }): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const high = o.quality === 'high';

  ground(group, 1000, 1000, mat(0xffffff, 0.98, { map: speckTexture('#9a8e7c', ['#7d7262', '#b3a792', '#6a6052', '#c4b9a5'], 3600, 256, 140) }));
  ground(group, 14, 300, mat(0x4a4c50, 0.9), 0, 80, 0.01);

  // Flood-light towers on a grid, with a few real lights near the player.
  const towers: TentSpot[] = [];
  for (let x = -270; x <= 270; x += 45) for (let z = -270; z <= 270; z += 45) if (Math.abs(x) > 8) towers.push({ x: x + 2, z: z + 9 });
  lampPosts(group, towers, 20, 0xffe7b0);
  for (const [x, z] of [[-20, 20], [24, -4], [-24, -40], [22, -70]] as const) {
    const l = new THREE.PointLight(0xffe2a8, 70, 110, 1);
    l.position.set(x, 18, z);
    group.add(l);
  }

  // Al-Mash'ar al-Haram mosque.
  const mq = MUZ.mosque;
  const cream = mat(0xe8dfca, 0.7);
  box(group, 44, 12, 26, cream, mq.x, 0, mq.z);
  box(group, 46, 1, 28, mat(0xd6ccb4, 0.6), mq.x, 12, mq.z);
  for (const s of [-1, 1]) {
    cyl(group, 1.3, 1.6, 42, cream, mq.x + s * 18, 0, mq.z + 12, 12);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.4, 6, 12), mat(0x2f7a5a, 0.5));
    top.position.set(mq.x + s * 18, 45, mq.z + 12);
    group.add(top);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.8, 12), new THREE.MeshBasicMaterial({ color: 0x9cf5c8 }));
    glow.position.set(mq.x + s * 18, 34, mq.z + 12);
    group.add(glow);
  }
  // Lit windows along the front.
  const win = new THREE.MeshBasicMaterial({ color: 0xffe6a8 });
  for (let i = 0; i < 9; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(2, 4.5), win);
    w.position.set(mq.x - 18 + i * 4.5, 4.5, mq.z + 13.05);
    group.add(w);
  }
  colliders.push(boxCollider(mq.x, mq.z, 46, 28, 0.2));
  label(group, 'มัสยิดอัลมัชอะริลฮะรอม', mq.x, 16, mq.z + 14, 1.6);

  signBoard(group, ['มุซดะลิฟะฮ์', 'مزدلفة'], { x: 12, z: 32, w: 8, h: 3, y: 2.4, bg: '#f2c230', color: '#1d2a22', size: 120, back: ['สิ้นสุดเขตมุซดะลิฟะฮ์', 'نهاية مزدلفة'] });
  colliders.push(boxCollider(12, 32, 8.4, 0.5));

  // Buses parked to the east.
  const busMat = mat(0xf2f2f2, 0.4, { metalness: 0.2 });
  const glass = mat(0x223344, 0.2);
  for (let i = 0; i < 6; i++) {
    const z = 50 - i * 6;
    box(group, 12, 3.2, 2.8, busMat, 46, 0.3, z);
    box(group, 11.6, 1, 2.85, glass, 46, 1.9, z, false);
    colliders.push(boxCollider(46, z, 12, 2.8));
  }

  // Pilgrims resting on mats (lying figures), scattered across the ground.
  const avoid = [
    { minX: -6, maxX: 6, minZ: -120, maxZ: 70 },
    { minX: -14, maxX: 26, minZ: -8, maxZ: 24 },
    { minX: -26, maxX: 26, minZ: -110, maxZ: -56 },
    { minX: 38, maxX: 56, minZ: 18, maxZ: 56 },
  ];
  const spots = scatter(high ? 260 : 100, -120, 120, -160, 120, 17, avoid);
  const r = rng(5);
  const matMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.04, 2.1), mat(0xffffff, 0.95), spots.length);
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 1.1, 4, 8), mat(0xf4f2ec, 0.85), spots.length);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 10, 8), mat(0xb07a55, 0.8), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  const mats = [0x2f6d8a, 0x9b3b3b, 0x4f7a3a, 0x8a6a2f, 0x5a4a7a];
  const col = new THREE.Color();
  spots.forEach((t, i) => {
    const yaw = r() * Math.PI;
    q.setFromEuler(new THREE.Euler(0, yaw, 0));
    m4.compose(p.set(t.x, 0.02, t.z), q, s);
    matMesh.setMatrixAt(i, m4);
    matMesh.setColorAt(i, col.setHex(mats[i % mats.length]));
    q.setFromEuler(new THREE.Euler(Math.PI / 2, yaw, 0, 'YXZ'));
    m4.compose(p.set(t.x, 0.24, t.z), q, s);
    body.setMatrixAt(i, m4);
    m4.compose(p.set(t.x + Math.sin(yaw) * 0.85, 0.2, t.z + Math.cos(yaw) * 0.85), q.identity(), s);
    head.setMatrixAt(i, m4);
  });
  group.add(matMesh, body, head);

  mountainRing(group, { count: high ? 40 : 24, rMin: 300, rMax: 400, hMin: 40, hMax: 90, color: 0x6f5a48, seed: 9 });
  colliders.push({ kind: 'rect-in', ...MUZ.bounds });

  const tick = walkers(group, high ? 90 : 35, [
    { axis: 'z', from: 56, to: -50, a: -5, b: -1, dir: -1 },
    { axis: 'z', from: 56, to: -50, a: 1, b: 5, dir: -1 },
  ]);
  return { group, colliders, tick };
}
