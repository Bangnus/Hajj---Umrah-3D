import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { makeLabel } from '../engine/label';
import { makeLOD, mergeParts, type PartSpec } from '../engine/lod';
import { box, crowdMesh, cyl, mat, placeCrowd, tileTexture, type Scene3D } from './common';
import { tr } from '../i18n';

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

  // Mataf: cool Thassos white marble disc with concentric tawaf rings, then covered arcade floor.
  const marble = tileTexture('#f6f4ef', 'rgba(182,178,168,0.34)', 10);
  marble.repeat.set(9, 9);
  const mataf = new THREE.Mesh(new THREE.CircleGeometry(MATAF_R, 96), mat(0xffffff, 0.30, { map: marble }));
  mataf.rotation.x = -Math.PI / 2;
  mataf.receiveShadow = true;
  group.add(mataf);
  const outerMarble = tileTexture('#e4ddd0', 'rgba(150,140,125,0.32)', 8);
  outerMarble.repeat.set(14, 14);
  const outer = new THREE.Mesh(new THREE.RingGeometry(MATAF_R, 70, 96), mat(0xffffff, 0.5, { map: outerMarble }));
  outer.rotation.x = -Math.PI / 2;
  outer.receiveShadow = true;
  group.add(outer);

  // Ka'bah with silk-damask Kiswah, gold Hizam, sloped Shadharwan marble base, 3D Golden Door, Mizab & Black Stone.
  const kiswa = kiswaMaterial();
  const kaaba = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, h, hz * 2), kiswa);
  kaaba.position.y = h / 2;
  kaaba.castShadow = kaaba.receiveShadow = true;
  group.add(kaaba);

  // Roof parapet trim + Golden Mizab ar-Rahmah (rain spout over Hijr Ismail on north side -z)
  const goldMat = mat(0xd8b356, 0.25, { metalness: 0.85 });
  const kaabaDetails = new THREE.Mesh(
    mergeParts([
      // Sloped white marble Shadharwan base around east, north & west/south walls
      { geo: new THREE.BoxGeometry(hx * 2 + 0.72, 0.26, hz * 2 + 0.72), y: 0.13, color: 0xefece4 },
      { geo: new THREE.BoxGeometry(hx * 2 + 0.42, 0.24, hz * 2 + 0.42), y: 0.34, color: 0xe5e0d5 },
      // Brass tie-rings along Shadharwan
      ...Array.from({ length: 7 }, (_, i) => ({
        geo: new THREE.TorusGeometry(0.045, 0.015, 5, 10),
        x: -hx + 1.5 + i * 1.5, y: 0.44, z: hz + 0.23, rx: Math.PI / 2, color: 0xc9a24a,
      })),
      // 3D Sculpted Golden Door (Bab al-Ka'bah) on East Wall (+x)
      { geo: new THREE.BoxGeometry(0.14, 3.35, 2.24), x: hx + 0.04, y: 3.75, z: 2.35, color: 0xb88f38 },
      { geo: new THREE.BoxGeometry(0.18, 0.32, 2.42), x: hx + 0.06, y: 5.48, z: 2.35, color: 0xdcb85c },
      { geo: new THREE.BoxGeometry(0.16, 2.95, 0.96), x: hx + 0.07, y: 3.68, z: 1.82, color: 0xd6b052 },
      { geo: new THREE.BoxGeometry(0.16, 2.95, 0.96), x: hx + 0.07, y: 3.68, z: 2.88, color: 0xd6b052 },
      // Door decorative medallions & lock bar
      { geo: new THREE.CylinderGeometry(0.24, 0.24, 0.06, 14), x: hx + 0.15, y: 4.35, z: 1.82, rz: Math.PI / 2, color: 0xf0d27a },
      { geo: new THREE.CylinderGeometry(0.24, 0.24, 0.06, 14), x: hx + 0.15, y: 4.35, z: 2.88, rz: Math.PI / 2, color: 0xf0d27a },
      { geo: new THREE.BoxGeometry(0.08, 0.14, 0.55), x: hx + 0.16, y: 3.45, z: 2.35, color: 0xe8c668 },
      // Golden Mizab (rain spout) projecting north (-z) over Hijr Ismail
      { geo: new THREE.BoxGeometry(0.42, 0.28, 1.35), x: 0, y: h - 0.35, z: -hz - 0.58, rx: 0.06, color: 0xe0bc5e },
      { geo: new THREE.BoxGeometry(0.48, 0.34, 0.18), x: 0, y: h - 0.34, z: -hz - 0.05, color: 0xc9a24a },
      // Rukn al-Yamani subtle stone corner trim (SW: -hx, +hz)
      { geo: new THREE.BoxGeometry(0.18, 1.5, 0.18), x: -hx - 0.01, y: 1.25, z: hz + 0.01, color: 0x8d7b68 },
    ]),
    mat(0xffffff, 0.34, { metalness: 0.55, vertexColors: true }),
  );
  kaabaDetails.castShadow = kaabaDetails.receiveShadow = true;
  group.add(kaabaDetails);

  // Black Stone (Al-Hajar al-Aswad) at SE corner (+hx, +hz) in sculpted silver hood frame
  const stonePos = new THREE.Vector3(hx + 0.06, 1.5, hz + 0.06);
  const silverMat = mat(0xe2e4e8, 0.16, { metalness: 0.92 });
  const stoneFrame = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.075, 12, 28), silverMat);
  stoneFrame.position.copy(stonePos);
  stoneFrame.rotation.y = Math.PI / 4;
  const stoneHood = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI, 0, Math.PI), silverMat);
  stoneHood.position.copy(stonePos);
  stoneHood.rotation.y = -Math.PI * 0.75;
  stoneHood.scale.set(1, 1.15, 0.65);
  const stone = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), mat(0x1c1210, 0.35, { metalness: 0.15 }));
  stone.position.copy(stonePos);
  stone.scale.set(0.95, 1.15, 0.48);
  stone.rotation.y = Math.PI / 4;
  group.add(stoneFrame, stoneHood, stone);
  colliders.push({ kind: 'box', minX: -hx - 0.35, maxX: hx + 0.35, minZ: -hz - 0.35, maxZ: hz + 0.35 });

  // Hijr Ismail (Al-Hatim): semicircular white marble wall with marble coping & ornate brass lanterns.
  const wallMat = mat(0xf2efe7, 0.36, { side: THREE.DoubleSide });
  const arc = new THREE.Mesh(new THREE.CylinderGeometry(HIJR.r, HIJR.r, 1.32, 64, 1, true, Math.PI / 2, Math.PI), wallMat);
  arc.position.set(0, 0.66, HIJR.z);
  arc.castShadow = arc.receiveShadow = true;
  group.add(arc);
  const innerArc = new THREE.Mesh(new THREE.CylinderGeometry(HIJR.r - 0.42, HIJR.r - 0.42, 1.32, 64, 1, true, Math.PI / 2, Math.PI), wallMat);
  innerArc.position.set(0, 0.66, HIJR.z);
  group.add(innerArc);
  const cap = new THREE.Mesh(new THREE.RingGeometry(HIJR.r - 0.46, HIJR.r + 0.06, 64, 1, 0, Math.PI), mat(0xd8d1c2, 0.35, { side: THREE.DoubleSide }));
  cap.rotation.x = -Math.PI / 2;
  cap.position.set(0, 1.33, HIJR.z);
  group.add(cap);
  for (const ang of [0.22, 0.5, 0.78]) {
    const a = ang * Math.PI;
    const lx = Math.cos(a) * (HIJR.r - 0.2), lz = HIJR.z - Math.sin(a) * (HIJR.r - 0.2);
    cyl(group, 0.06, 0.08, 0.45, goldMat, lx, 1.33, lz, 8);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xaef7c8 }));
    bulb.position.set(lx, 1.85, lz);
    group.add(bulb);
  }
  colliders.push({ kind: 'halfdisc', x: 0, z: HIJR.z, r: HIJR.r + 0.35, side: -1 });

  // Maqam Ibrahim: 3-tier LOD (ornate gilded cage + crystal chamber + footprint stone -> mid -> clay).
  const mq = SPOTS.maqam;
  const mqLod0 = new THREE.Group();
  const mqStruct = new THREE.Mesh(
    mergeParts([
      // Stepped marble octagonal pedestal
      { geo: new THREE.CylinderGeometry(0.96, 1.08, 0.26, 8), y: 0.13, color: 0xefece4 },
      { geo: new THREE.CylinderGeometry(0.78, 0.90, 0.34, 8), y: 0.43, color: 0xe2dcd0 },
      // Sacred footprint stone visible inside glass chamber
      { geo: new THREE.CylinderGeometry(0.32, 0.36, 0.22, 10), y: 0.72, color: 0xc8b89a },
      { geo: new THREE.SphereGeometry(0.075, 8, 6), x: -0.09, y: 0.83, z: 0.02, sx: 0.75, sy: 0.35, sz: 1.35, color: 0x7a684e },
      { geo: new THREE.SphereGeometry(0.075, 8, 6), x: 0.09, y: 0.83, z: 0.02, sx: 0.75, sy: 0.35, sz: 1.35, color: 0x7a684e },
      // 8 golden cage corner columns
      ...Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return { geo: new THREE.CylinderGeometry(0.042, 0.048, 1.65, 8), x: Math.cos(a) * 0.62, y: 1.42, z: Math.sin(a) * 0.62, color: 0xdcb858 };
      }),
      // Lower & upper embossed golden frieze bands + ribbed dome + crescent finial
      { geo: new THREE.CylinderGeometry(0.68, 0.72, 0.22, 8), y: 0.70, color: 0xcfa84a },
      { geo: new THREE.CylinderGeometry(0.70, 0.66, 0.36, 8), y: 2.32, color: 0xdcb858 },
      { geo: new THREE.SphereGeometry(0.64, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), y: 2.48, sy: 1.15, color: 0xe2be62 },
      { geo: new THREE.CylinderGeometry(0.035, 0.05, 0.48, 8), y: 3.42, color: 0xe6c468 },
      { geo: new THREE.TorusGeometry(0.14, 0.028, 6, 16, Math.PI * 1.4), y: 3.74, rz: Math.PI * 0.8, color: 0xf0d072 },
    ]),
    mat(0xffffff, 0.26, { metalness: 0.78, vertexColors: true }),
  );
  mqStruct.castShadow = mqStruct.receiveShadow = true;
  const mqGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.54, 0.54, 1.45, 16),
    mat(0xdff4ff, 0.1, { transparent: true, opacity: 0.38, metalness: 0.2 }),
  );
  mqGlass.position.y = 1.48;
  mqLod0.add(mqStruct, mqGlass);

  const mqLod1 = new THREE.Mesh(
    mergeParts([
      { geo: new THREE.CylinderGeometry(0.92, 1.04, 0.5, 8), y: 0.25, color: 0xeae5da },
      { geo: new THREE.CylinderGeometry(0.62, 0.62, 1.9, 8), y: 1.45, color: 0xd6b25a },
      { geo: new THREE.SphereGeometry(0.62, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), y: 2.4, color: 0xe0bc5e },
    ]),
    mat(0xffffff, 0.32, { metalness: 0.7, vertexColors: true }),
  );
  const mqLod2 = new THREE.Mesh(
    mergeParts([
      { geo: new THREE.CylinderGeometry(0.9, 1.0, 0.5, 6), y: 0.25, color: 0xe8e2d6 },
      { geo: new THREE.CylinderGeometry(0.6, 0.64, 2.0, 6), y: 1.5, color: 0xd4b058 },
      { geo: new THREE.SphereGeometry(0.6, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), y: 2.5, color: 0xdcb85e },
    ]),
    mat(0xffffff, 0.9, { vertexColors: true }),
  );
  group.add(makeLOD(mq.x, 0, mq.z, [[mqLod0, 0], [mqLod1, 28], [mqLod2, 68]]));
  colliders.push({ kind: 'circle', x: mq.x, z: mq.z, r: 1.0 });
  const mql = makeLabel(tr('มะกอมอิบรอฮีม'), { height: 0.5 });
  mql.position.set(mq.x, 4.1, mq.z);
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
  const lampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, 0.45), new THREE.MeshBasicMaterial({ color: 0x3dff9a }));
  lampMesh.position.set(lamp.x, 6.5, lamp.z);
  group.add(lampMesh);
  const lampLight = new THREE.PointLight(0x3dff9a, 6, 14);
  lampLight.position.copy(lampMesh.position);
  group.add(lampLight);

  // Arcade (two rows of sculpted columns with marble bases & golden capitals + parapet domes), outer wall, minarets.
  const colGeo = mergeParts([
    { geo: new THREE.BoxGeometry(1.22, 0.45, 1.22), y: 0.225, color: 0xdad2c2 },
    { geo: new THREE.CylinderGeometry(0.44, 0.50, 7.8, 12), y: 4.35, color: 0xefe9dc, aoBottom: 0.88 },
    { geo: new THREE.CylinderGeometry(0.58, 0.44, 0.45, 12), y: 8.48, color: 0xd6b25a },
    { geo: new THREE.BoxGeometry(1.18, 0.32, 1.18), y: 8.84, color: 0xe5decb },
  ]);
  const colMat = mat(0xffffff, 0.48, { vertexColors: true });
  const N = 72;
  const m4 = new THREE.Matrix4();
  for (const r of [MATAF_R + 4, MATAF_R + 12] as const) {
    const cols = new THREE.InstancedMesh(colGeo, colMat, N);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      m4.makeTranslation(Math.cos(a) * r, 0, Math.sin(a) * r);
      cols.setMatrixAt(i, m4);
    }
    cols.castShadow = cols.receiveShadow = true;
    group.add(cols);
  }
  const roof = new THREE.Mesh(new THREE.RingGeometry(MATAF_R + 3.5, 70, 96), mat(0xe2dccf, 0.6, { side: THREE.DoubleSide }));
  roof.rotation.x = -Math.PI / 2;
  roof.position.y = 9;
  roof.castShadow = true;
  group.add(roof);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(MATAF_R + 3.5, MATAF_R + 3.5, 1.8, 96, 1, true), mat(0xd8cfbd, 0.5, { side: THREE.DoubleSide }));
  rim.position.y = 9.9;
  group.add(rim);

  // Ring of 36 white arcade domes crowning the Haram colonnade
  const domeGeo = mergeParts([
    { geo: new THREE.SphereGeometry(1.85, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), y: 10.6, sy: 1.05, color: 0xf4f0e6 },
    { geo: new THREE.CylinderGeometry(0.05, 0.07, 0.7, 6), y: 12.85, color: 0xd6b25a },
  ]);
  const arcadeDomes = new THREE.InstancedMesh(domeGeo, colMat, 36);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    arcadeDomes.setMatrixAt(i, m4.makeTranslation(Math.cos(a) * (MATAF_R + 7.8), 0, Math.sin(a) * (MATAF_R + 7.8)));
  }
  group.add(arcadeDomes);

  const wall = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 22, 96, 1, true), mat(0xe4dccb, 0.7, { side: THREE.BackSide }));
  wall.position.y = 11;
  group.add(wall);

  // 8 Haram Minarets with balconies, lantern galleries & golden crescents (instanced in 1 draw call!)
  const minGeo = mergeParts([
    { geo: new THREE.BoxGeometry(4.4, 22, 4.4), y: 11, color: 0xece6d9, aoBottom: 0.85 },
    { geo: new THREE.CylinderGeometry(1.55, 1.85, 52, 12), y: 48, color: 0xf0eadc },
    { geo: new THREE.CylinderGeometry(2.55, 1.85, 1.4, 12), y: 44, color: 0xdcd3c0 },
    { geo: new THREE.CylinderGeometry(2.45, 1.75, 1.4, 12), y: 62, color: 0xdcd3c0 },
    { geo: new THREE.CylinderGeometry(1.25, 1.40, 8, 12), y: 76, color: 0xefe9db },
    { geo: new THREE.ConeGeometry(1.45, 8.5, 12), y: 84.2, color: 0xd6b25a },
    { geo: new THREE.TorusGeometry(0.45, 0.08, 6, 14, Math.PI * 1.4), y: 89.2, rz: Math.PI * 0.8, color: 0xe6c468 },
  ]);
  const haramMinarets = new THREE.InstancedMesh(minGeo, mat(0xffffff, 0.42, { metalness: 0.2, vertexColors: true }), 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    haramMinarets.setMatrixAt(i, m4.makeTranslation(Math.cos(a) * 74, 0, Math.sin(a) * 74));
  }
  group.add(haramMinarets);

  // Makkah Royal Clock Tower (Abraj Al Bait) complex to the south (+z = 190).
  const clockTower = new THREE.Mesh(
    mergeParts([
      // Podium & flanking wing towers
      { geo: new THREE.BoxGeometry(74, 85, 32), x: 10, y: 42.5, z: 196, color: 0xc9beaa, aoBottom: 0.82 },
      { geo: new THREE.BoxGeometry(18, 145, 22), x: -20, y: 72.5, z: 194, color: 0xd1c7b4, aoBottom: 0.85 },
      { geo: new THREE.BoxGeometry(18, 145, 22), x: 40, y: 72.5, z: 194, color: 0xd1c7b4, aoBottom: 0.85 },
      // Central clock shaft + emerald clock bezel + corner golden domes
      { geo: new THREE.BoxGeometry(28, 224, 28), x: 10, y: 112, z: 190, color: 0xd8cfc0, aoBottom: 0.85 },
      { geo: new THREE.BoxGeometry(26, 28, 28.6), x: 10, y: 195, z: 190, color: 0x1c5942 },
      { geo: new THREE.BoxGeometry(30, 3.5, 30), x: 10, y: 212, z: 190, color: 0xcbbca2 },
      // Stepped spire + golden crescent (Hilal)
      { geo: new THREE.BoxGeometry(16, 24, 16), x: 10, y: 225, z: 190, color: 0xe2dacb },
      { geo: new THREE.ConeGeometry(5.5, 52, 12), x: 10, y: 263, z: 190, color: 0xd6b25a },
      { geo: new THREE.TorusGeometry(3.8, 0.55, 8, 20, Math.PI * 1.4), x: 10, y: 293, z: 190, rz: Math.PI * 0.8, color: 0xf0cf70 },
    ]),
    mat(0xffffff, 0.62, { vertexColors: true }),
  );
  group.add(clockTower);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(21, 21), new THREE.MeshBasicMaterial({ map: clockFaceTexture() }));
  face.position.set(10, 195, 175.6);
  face.rotation.y = Math.PI;
  group.add(face);

  // Zamzam drinking station (3-tier LOD: detailed stainless-steel & cream coolers + spigots + tray -> clay far).
  const zz = SPOTS.zamzam;
  const zzParts0: PartSpec[] = [
    // Marble counter stand + stainless drip tray
    { geo: new THREE.BoxGeometry(3.8, 0.52, 0.95), y: 0.26, color: 0xe6e0d4 },
    { geo: new THREE.BoxGeometry(3.6, 0.06, 0.32), y: 0.53, z: -0.28, color: 0x9aa2aa },
  ];
  for (let i = 0; i < 4; i++) {
    const cx = (i - 1.5) * 0.82;
    zzParts0.push(
      { geo: new THREE.CylinderGeometry(0.27, 0.28, 0.82, 16), x: cx, y: 0.94, z: 0.06, color: 0xf4f2ec },
      { geo: new THREE.CylinderGeometry(0.285, 0.285, 0.10, 16), x: cx, y: 1.38, z: 0.06, color: 0x2a6950 },
      { geo: new THREE.BoxGeometry(0.05, 0.05, 0.14), x: cx, y: 0.68, z: -0.24, color: 0xc9a24a },
    );
  }
  // Cup dispenser tube on the right
  zzParts0.push({ geo: new THREE.CylinderGeometry(0.065, 0.065, 0.65, 10), x: 1.72, y: 0.95, z: -0.2, color: 0xdce6ee });
  const zz0 = new THREE.Mesh(mergeParts(zzParts0), mat(0xffffff, 0.35, { metalness: 0.2, vertexColors: true }));
  zz0.castShadow = zz0.receiveShadow = true;
  const zz2 = new THREE.Mesh(
    mergeParts([
      { geo: new THREE.BoxGeometry(3.8, 0.52, 0.9), y: 0.26, color: 0xe6e0d4 },
      { geo: new THREE.BoxGeometry(3.3, 0.88, 0.6), y: 0.96, color: 0xf4f2ec },
    ]),
    mat(0xffffff, 0.92, { vertexColors: true }),
  );
  group.add(makeLOD(zz.x, 0, zz.z + 2.4, [[zz0, 0], [zz2, 42]]));
  const zzl = makeLabel(tr('จุดน้ำซัมซัม'), { height: 0.5 });
  zzl.position.set(zz.x, 2.4, zz.z + 2.4);
  group.add(zzl);

  // Keep the player inside the mosque.
  colliders.push({ kind: 'disc-in', x: 0, z: 0, r: 66 });

  // Crowd doing tawaf (frustum-culled + 3-tier LOD).
  const n = o.crowd;
  const crowd = crowdMesh(n, [0xf4f2ec, 0xf4f2ec, 0xf4f2ec, 0x1f1f24, 0xf4f2ec, 0x2b2b33, 0xf4f2ec]);
  group.add(crowd.group);
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
      placeCrowd(crowd, i, q.x, q.z, -p.a + Math.PI, 0, true);
    });
  };
  tick(0);

  return { group, colliders, tick };
}

function clockFaceTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#194f3a';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#d6b25a';
  g.lineWidth = 8;
  g.strokeRect(8, 8, 240, 240);
  g.fillStyle = '#f7f4ea';
  g.beginPath(); g.arc(128, 128, 102, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#c9a24a';
  g.lineWidth = 5;
  g.stroke();
  // Hour ticks
  g.strokeStyle = '#174432';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineWidth = i % 3 === 0 ? 5 : 3;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * 80, 128 + Math.sin(a) * 80);
    g.lineTo(128 + Math.cos(a) * 95, 128 + Math.sin(a) * 95);
    g.stroke();
  }
  // Clock hands
  g.strokeStyle = '#122920';
  g.lineCap = 'round';
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 68); g.stroke();
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(128, 128); g.lineTo(172, 104); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function kiswaMaterial(): THREE.Material[] {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const g = c.getContext('2d')!;
  g.fillStyle = '#101012';
  g.fillRect(0, 0, 1024, 1024);

  // Silk-damask chevron & subtle woven calligraphy waves across the black cloth
  g.strokeStyle = 'rgba(255,255,255,0.042)';
  g.lineWidth = 2;
  for (let y = 16; y < 1024; y += 28) {
    g.beginPath();
    for (let x = 0; x <= 1024; x += 32) {
      g.lineTo(x, y + (x % 64 === 0 ? -7 : 7));
    }
    g.stroke();
  }

  // Embroidered Golden Hizam (Quranic calligraphy belt) with cartouches & silver-gold borders
  const y0 = 285, bh = 96;
  g.fillStyle = '#171614';
  g.fillRect(0, y0, 1024, bh);
  g.strokeStyle = '#d8b254';
  g.lineWidth = 6;
  g.strokeRect(-4, y0 + 5, 1032, bh - 10);
  g.strokeStyle = '#e8cf82';
  g.lineWidth = 2;
  g.strokeRect(-4, y0 + 13, 1032, bh - 26);

  // Ornamental cartouches & stylized Arabic thuluth calligraphy strokes inside Hizam
  for (let cx = 24; cx < 1024; cx += 256) {
    const cw = 208;
    g.strokeStyle = '#d8b254';
    g.lineWidth = 3;
    g.strokeRect(cx, y0 + 20, cw, bh - 40);
    g.strokeStyle = '#f2da8c';
    g.lineWidth = 3.5;
    for (let x = cx + 14; x < cx + cw - 16; x += 22) {
      g.beginPath();
      g.moveTo(x, y0 + bh * 0.62);
      g.quadraticCurveTo(x + 6, y0 + 26, x + 11, y0 + bh * 0.5);
      g.quadraticCurveTo(x + 16, y0 + bh - 26, x + 20, y0 + bh * 0.38);
      g.stroke();
    }
  }

  // Qandil (lantern medallions) below the Hizam
  for (const mx of [128, 384, 640, 896]) {
    const my = y0 + bh + 66;
    g.fillStyle = '#181612';
    g.beginPath(); g.arc(mx, my, 36, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#d8b254';
    g.lineWidth = 4;
    g.stroke();
    g.strokeStyle = '#f0d686';
    g.lineWidth = 2;
    g.beginPath(); g.arc(mx, my, 24, 0, Math.PI * 2); g.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const side = new THREE.MeshStandardMaterial({ map: t, roughness: 0.86 });
  const top = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.9 });
  return [side, side, top, top, side, side];
}
