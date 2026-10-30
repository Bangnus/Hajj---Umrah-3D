import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { makeLabel, textTexture } from '../engine/label';
import { box, crowdMesh, cyl, mat, placeCrowd, tileTexture, type Scene3D } from './common';

/**
 * Masjid al-Haram around the Ka'bah. Ka'bah centred at the origin, walls on the axes:
 * +x = east, -z = north. Corners: Black Stone SE (+x,+z), Yamani SW, Shami NW, Iraqi NE.
 * Hijr Ismail is the half-disc on the north side. Tawaf runs counter-clockwise seen
 * from above, i.e. the angle atan2(-z, x) increases.
 */
export const KAABA = { hx: 6, hz: 5.2, h: 13 };
export const HIJR = { z: -KAABA.hz, r: 7.4 };
export const MATAF_R = 36;
/** Angle of the Black Stone line (atan2(-z, x) of the SE corner). */
export const STONE_ANGLE = Math.atan2(-KAABA.hz, KAABA.hx);
/** Angle of the Yamani corner (SW), as the CCW-preceding corner of the Black Stone. */
export const YAMANI_ANGLE = Math.atan2(-KAABA.hz, -KAABA.hx);

export const SPOTS = {
  tawafStart: polar(9.6, STONE_ANGLE),
  // Close enough that the follow camera (≈7 m behind) stays inside the open mataf, clear of the arcade columns.
  entry: { x: 19, z: 19 },
  maqam: { x: 16, z: 1.2 },
  prayer: { x: 20.5, z: 1.2 },
  zamzam: { x: 30, z: -9 },
};

export function polar(r: number, a: number) {
  return { x: r * Math.cos(a), z: -r * Math.sin(a) };
}

export interface HaramOpts {
  floorLine: boolean;
  crowd: number;
}

export function buildHaram(o: HaramOpts): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const { hx, hz, h } = KAABA;

  // Mataf: white marble disc, then covered arcade floor.
  const marble = tileTexture('#f3f1ec', 'rgba(190,186,176,0.35)', 10);
  marble.repeat.set(9, 9);
  const mataf = new THREE.Mesh(new THREE.CircleGeometry(MATAF_R, 96), mat(0xffffff, 0.35, { map: marble }));
  mataf.rotation.x = -Math.PI / 2;
  mataf.receiveShadow = true;
  group.add(mataf);
  const outer = new THREE.Mesh(new THREE.RingGeometry(MATAF_R, 70, 96), mat(0xd9d2c4, 0.6));
  outer.rotation.x = -Math.PI / 2;
  outer.receiveShadow = true;
  group.add(outer);

  // Ka'bah with kiswa, gold band, door, base and Black Stone.
  const kiswa = kiswaMaterial();
  const kaaba = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, h, hz * 2), kiswa);
  kaaba.position.y = h / 2;
  kaaba.castShadow = kaaba.receiveShadow = true;
  group.add(kaaba);
  box(group, hx * 2 + 0.7, 0.35, hz * 2 + 0.7, mat(0xe9e5dc, 0.4)); // shadharwan
  box(group, 0.12, 3.2, 2.1, mat(0xc9a24a, 0.3, { metalness: 0.8 }), hx + 0.04, 2.2, 2.4); // door
  const stoneFrame = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 10, 24), mat(0xd8d8d8, 0.2, { metalness: 0.9 }));
  stoneFrame.position.set(hx + 0.05, 1.5, hz + 0.05);
  stoneFrame.rotation.y = Math.PI / 4;
  group.add(stoneFrame);
  const stone = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), mat(0x1a1514, 0.5));
  stone.position.copy(stoneFrame.position);
  stone.scale.set(1, 1.2, 0.5);
  stone.rotation.y = Math.PI / 4;
  group.add(stone);
  colliders.push({ kind: 'box', minX: -hx - 0.35, maxX: hx + 0.35, minZ: -hz - 0.35, maxZ: hz + 0.35 });

  // Hijr Ismail: low semicircular wall on the north side.
  const wallMat = mat(0xeeeae2, 0.4, { side: THREE.DoubleSide });
  const arc = new THREE.Mesh(new THREE.CylinderGeometry(HIJR.r, HIJR.r, 1.3, 64, 1, true, Math.PI / 2, Math.PI), wallMat);
  arc.position.set(0, 0.65, HIJR.z);
  arc.castShadow = true;
  group.add(arc);
  const cap = new THREE.Mesh(new THREE.RingGeometry(HIJR.r - 0.35, HIJR.r + 0.35, 64, 1, 0, Math.PI), mat(0xd6d0c4, 0.4, { side: THREE.DoubleSide }));
  cap.rotation.x = -Math.PI / 2;
  cap.position.set(0, 1.31, HIJR.z);
  group.add(cap);
  colliders.push({ kind: 'halfdisc', x: 0, z: HIJR.z, r: HIJR.r + 0.35, side: -1 });

  // Maqam Ibrahim: small gilded enclosure facing the door.
  const mq = SPOTS.maqam;
  cyl(group, 0.9, 1.0, 0.4, mat(0xe6e1d6, 0.4), mq.x, 0, mq.z, 8);
  cyl(group, 0.6, 0.6, 2.0, mat(0xd6b25a, 0.25, { metalness: 0.85 }), mq.x, 0.4, mq.z, 8);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd6b25a, 0.25, { metalness: 0.85 }));
  dome.position.set(mq.x, 2.4, mq.z);
  group.add(dome);
  colliders.push({ kind: 'circle', x: mq.x, z: mq.z, r: 1.0 });
  const mql = makeLabel('มะกอมอิบรอฮีม', { height: 0.5 });
  mql.position.set(mq.x, 3.6, mq.z);
  group.add(mql);

  // Optional floor guide along the Black Stone line (the real mosque has none).
  if (o.floorLine) {
    const len = MATAF_R - 7.6;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.18), new THREE.MeshBasicMaterial({ color: 0x2f9e6e }));
    const mid = polar(7.6 + len / 2, STONE_ANGLE);
    line.position.set(mid.x, 0.02, mid.z);
    line.rotation.set(-Math.PI / 2, 0, STONE_ANGLE);
    group.add(line);
  }
  // Green lamp on the arcade marking the start of each circuit.
  const lamp = polar(MATAF_R + 3.6, STONE_ANGLE);
  const lampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0x3dff9a }));
  lampMesh.position.set(lamp.x, 6.5, lamp.z);
  group.add(lampMesh);
  const lampLight = new THREE.PointLight(0x3dff9a, 6, 14);
  lampLight.position.copy(lampMesh.position);
  group.add(lampLight);

  // Arcade (two rows of columns + roof ring), outer wall, minarets.
  const colMat = mat(0xece6d9, 0.5);
  const N = 72;
  for (const [r, hgt] of [[MATAF_R + 4, 9], [MATAF_R + 12, 9]] as const) {
    const cols = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45, 0.5, hgt, 10), colMat, N);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      m4.makeTranslation(Math.cos(a) * r, hgt / 2, Math.sin(a) * r);
      cols.setMatrixAt(i, m4);
    }
    cols.castShadow = true;
    group.add(cols);
  }
  const roof = new THREE.Mesh(new THREE.RingGeometry(MATAF_R + 3.5, 70, 96), mat(0xe2dccf, 0.6, { side: THREE.DoubleSide }));
  roof.rotation.x = -Math.PI / 2;
  roof.position.y = 9;
  roof.castShadow = true;
  group.add(roof);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(MATAF_R + 3.5, MATAF_R + 3.5, 1.6, 96, 1, true), mat(0xd8cfbd, 0.5, { side: THREE.DoubleSide }));
  rim.position.y = 9.8;
  group.add(rim);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 22, 96, 1, true), mat(0xe4dccb, 0.7, { side: THREE.BackSide }));
  wall.position.y = 11;
  group.add(wall);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * 74, z = Math.sin(a) * 74;
    cyl(group, 1.4, 1.8, 80, mat(0xece6d9, 0.5), x, 0, z, 12);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.4, 8, 12), mat(0xd6b25a, 0.3, { metalness: 0.7 }));
    top.position.set(x, 84, z);
    group.add(top);
  }

  // Clock tower to the south.
  const tower = box(group, 26, 230, 26, mat(0xcfc6b4, 0.7), 10, 0, 190, false);
  tower.receiveShadow = false;
  const face = new THREE.Mesh(new THREE.CircleGeometry(11, 48), new THREE.MeshBasicMaterial({ map: textTexture(['12'], 256, 256, '#f4f1e8', '#1d4d3a', 60) }));
  face.position.set(10, 195, 176.9);
  face.rotation.y = Math.PI;
  group.add(face);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(5, 50, 12), mat(0xd6b25a, 0.3, { metalness: 0.8 }));
  spire.position.set(10, 255, 190);
  group.add(spire);

  // Zamzam station.
  const zz = SPOTS.zamzam;
  for (let i = 0; i < 4; i++) cyl(group, 0.28, 0.3, 1.1, mat(0xf5f5f5, 0.3), zz.x + (i - 1.5) * 0.8, 0, zz.z + 2.4, 14);
  const zzl = makeLabel('จุดน้ำซัมซัม', { height: 0.5 });
  zzl.position.set(zz.x, 2.4, zz.z + 2.4);
  group.add(zzl);

  // Keep the player inside the mosque.
  colliders.push({ kind: 'disc-in', x: 0, z: 0, r: 66 });

  // Crowd doing tawaf.
  const n = o.crowd;
  const crowd = crowdMesh(n, [0xf4f2ec, 0xf4f2ec, 0xf4f2ec, 0x1f1f24, 0xf4f2ec, 0x2b2b33, 0xf4f2ec]);
  group.add(crowd.body, crowd.head);
  const people = Array.from({ length: n }, () => ({
    r: 9.5 + Math.pow(Math.random(), 1.6) * 24,
    a: Math.random() * Math.PI * 2,
    w: 0,
  }));
  for (const p of people) p.w = (1.0 + Math.random() * 0.8) / p.r;
  const tick = (dt: number) => {
    people.forEach((p, i) => {
      p.a += p.w * dt;
      // Keep the crowd out of Hijr Ismail.
      let r = p.r;
      const pt = polar(r, p.a);
      if (pt.z < HIJR.z && Math.hypot(pt.x, pt.z - HIJR.z) < HIJR.r + 0.8) r = Math.max(r, HIJR.r + 6.6);
      const q = polar(r, p.a);
      placeCrowd(crowd, i, q.x, q.z, -p.a + Math.PI);
    });
    crowd.body.instanceMatrix.needsUpdate = true;
    crowd.head.instanceMatrix.needsUpdate = true;
  };
  tick(0);

  return { group, colliders, tick };
}

function kiswaMaterial(): THREE.Material[] {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#121212';
  g.fillRect(0, 0, 512, 512);
  // Subtle woven pattern.
  g.strokeStyle = 'rgba(255,255,255,0.035)';
  for (let y = 0; y < 512; y += 16) for (let x = 0; x < 512; x += 16) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.stroke(); }
  // Gold band (hizam) with an abstract geometric pattern.
  const y0 = 150, bh = 46;
  g.fillStyle = '#1a1a1a';
  g.fillRect(0, y0, 512, bh);
  g.strokeStyle = '#c9a24a';
  g.lineWidth = 3;
  g.strokeRect(-2, y0 + 3, 516, bh - 6);
  g.lineWidth = 2;
  for (let x = 8; x < 512; x += 28) {
    g.beginPath();
    g.moveTo(x, y0 + bh / 2);
    g.quadraticCurveTo(x + 7, y0 + 10, x + 14, y0 + bh / 2);
    g.quadraticCurveTo(x + 21, y0 + bh - 10, x + 28, y0 + bh / 2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const side = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  const top = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  return [side, side, top, top, side, side];
}
