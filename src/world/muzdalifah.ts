import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { createPropFieldLOD, keepAlive, mergeParts } from '../engine/lod';
import { box, boxCollider, cyl, mat, type Scene3D } from './common';
import { ground, label, lampPosts, mountainRing, rng, scatter, signBoard, speckTexture, walkers, type TentSpot } from './hajjCommon';
import { bus } from './props';
import { tr } from '../i18n';

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

let _sleeperAssets: { mat0: THREE.BufferGeometry; fig0: THREE.BufferGeometry; clay2: THREE.BufferGeometry; stdM: THREE.MeshStandardMaterial; clayM: THREE.MeshStandardMaterial } | null = null;
function getSleeperAssets() {
  if (_sleeperAssets) return _sleeperAssets;
  // Close (< 30 m): Woven mat (tinted by instanceColor) + white pillow + draped sleeping pilgrim with head, shoulder & bag
  const mat0 = keepAlive(mergeParts([
    { geo: new THREE.BoxGeometry(1.06, 0.035, 2.15), y: 0.018, color: 0xffffff },
    { geo: new THREE.BoxGeometry(0.96, 0.042, 1.98), y: 0.022, color: 0xeaeaea },
  ]));
  const fig0 = keepAlive(mergeParts([
    // White pillow at +z head end
    { geo: new THREE.BoxGeometry(0.52, 0.09, 0.34), y: 0.075, z: 0.78, color: 0xf6f4ee },
    // Draped sleeping body in ihram blanket + folded arm + knees
    { geo: new THREE.CapsuleGeometry(0.20, 0.96, 6, 12), y: 0.21, z: -0.08, rx: Math.PI / 2, sx: 1.12, sy: 1, sz: 0.84, color: 0xf4f2ec, aoBottom: 0.80 },
    { geo: new THREE.CapsuleGeometry(0.06, 0.36, 4, 8), x: 0.14, y: 0.26, z: 0.14, rx: Math.PI / 2, rz: 0.35, color: 0xefede6 },
    // Head + hair resting on pillow
    { geo: new THREE.SphereGeometry(0.13, 12, 10), y: 0.21, z: 0.74, color: 0xb8825c },
    { geo: new THREE.SphereGeometry(0.134, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), y: 0.22, z: 0.76, rx: 0.5, color: 0x241b16 },
    // Small pilgrim drawstring bag beside the mat
    { geo: new THREE.SphereGeometry(0.14, 8, 6), x: -0.34, y: 0.13, z: 0.55, sx: 0.9, sy: 0.75, sz: 1.1, color: 0x3b4d5e },
  ]));
  // Far (> 30 m): Soft clay sleeping mound on mat (~20 tris, no shadow)
  const clay2 = keepAlive(mergeParts([
    { geo: new THREE.BoxGeometry(1.05, 0.035, 2.12), y: 0.018, color: 0xd0ccc2 },
    { geo: new THREE.CapsuleGeometry(0.21, 1.15, 4, 6), y: 0.20, z: 0.05, rx: Math.PI / 2, color: 0xf2f0ea, aoBottom: 0.8 },
  ]));
  const stdM = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84, vertexColors: true }));
  const clayM = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true }));
  _sleeperAssets = { mat0, fig0, clay2, stdM, clayM };
  return _sleeperAssets;
}

export function buildMuzdalifah(o: { quality: 'low' | 'high' }): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const high = o.quality === 'high';

  ground(group, 1000, 1000, mat(0xffffff, 0.98, { map: speckTexture('#9a8e7c', ['#7d7262', '#b3a792', '#6a6052', '#c4b9a5'], 3600, 256, 140) }));
  ground(group, 14, 300, mat(0x4a4c50, 0.9), 0, 80, 0.01);

  // Scattered small gravel/pebble clusters around the pebble-collection area (MUZ.pebbles) for visual realism up close
  const pr = rng(77);
  const pebGeo = new THREE.DodecahedronGeometry(0.055, 0);
  const pebMesh = new THREE.InstancedMesh(pebGeo, mat(0x6e6559, 0.92, { flatShading: true }), 90);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 90; i++) {
    const a = pr() * Math.PI * 2, d = 0.6 + pr() * 7.5;
    m4.makeTranslation(MUZ.pebbles.x + Math.cos(a) * d, 0.03, MUZ.pebbles.z + Math.sin(a) * d);
    pebMesh.setMatrixAt(i, m4);
  }
  group.add(pebMesh);

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
  label(group, tr('มัสยิดอัลมัชอะริลฮะรอม'), mq.x, 16, mq.z + 14, 1.6);

  signBoard(group, [tr('มุซดะลิฟะฮ์'), 'مزدلفة'], { x: 12, z: 32, w: 8, h: 3, y: 2.4, bg: '#f2c230', color: '#1d2a22', size: 120, back: [tr('สิ้นสุดเขตมุซดะลิฟะฮ์'), 'نهاية مزدلفة'] });
  colliders.push(boxCollider(12, 32, 8.4, 0.5));

  // Buses parked to the east (3-tier LOD coaches).
  const busColors = [0x2f7a5c, 0x2d5d8a, 0x8a6a2f];
  for (let i = 0; i < 6; i++) {
    const z = 50 - i * 6;
    colliders.push(bus(group, 46, z, true, busColors[i % busColors.length]));
  }

  // Pilgrims resting on mats (frustum-culled + close detailed sleeper vs far clay mound).
  const avoid = [
    { minX: -6, maxX: 6, minZ: -120, maxZ: 70 },
    { minX: -14, maxX: 26, minZ: -8, maxZ: 24 },
    { minX: -26, maxX: 26, minZ: -110, maxZ: -56 },
    { minX: 38, maxX: 56, minZ: 18, maxZ: 56 },
  ];
  const spots = scatter(high ? 260 : 100, -120, 120, -160, 120, 17, avoid);
  const r = rng(5);
  const mats = [0x2f6d8a, 0x9b3b3b, 0x4f7a3a, 0x8a6a2f, 0x5a4a7a];
  const { mat0, fig0, clay2, stdM, clayM } = getSleeperAssets();
  createPropFieldLOD(
    group,
    spots.map((t, i) => ({ x: t.x, z: t.z, yaw: r() * Math.PI, color: mats[i % mats.length] })),
    [
      {
        maxDist: 32,
        layers: [
          { geo: mat0, mat: stdM, castShadow: false, receiveShadow: true, useColor: true },
          { geo: fig0, mat: stdM, castShadow: true, receiveShadow: true },
        ],
      },
      {
        maxDist: 240,
        layers: [{ geo: clay2, mat: clayM, castShadow: false, receiveShadow: false }],
      },
    ],
    1.35,
    0.25,
  );

  mountainRing(group, { count: high ? 40 : 24, rMin: 300, rMax: 400, hMin: 40, hMax: 90, color: 0x6f5a48, seed: 9 });
  colliders.push({ kind: 'rect-in', ...MUZ.bounds });

  const tick = walkers(group, high ? 90 : 35, [
    { axis: 'z', from: 56, to: -50, a: -5, b: -1, dir: -1 },
    { axis: 'z', from: 56, to: -50, a: 1, b: 5, dir: -1 },
  ]);
  return { group, colliders, tick };
}
