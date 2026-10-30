import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { makeLabel } from '../engine/label';
import { makeLOD, mergeParts } from '../engine/lod';
import { box, crowdMesh, floor, mat, placeCrowd, tileTexture, type Scene3D } from './common';
import { tr } from '../i18n';

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
  const midZ = (zMin + zMax) / 2, spanZ = zMax - zMin;

  const tex = tileTexture('#f2f0ea', 'rgba(170,165,155,0.34)', 6);
  tex.repeat.set(4, 26);
  floor(group, halfW * 2 + 6, spanZ, mat(0xffffff, 0.30, { map: tex }), 0, midZ);

  // Subtle central lane guide stripes (wheelchair / two-way divider markings on the real Mas'a floor)
  for (const lx of [-0.9, 0.9]) {
    const laneLine = new THREE.Mesh(new THREE.PlaneGeometry(0.10, len - 6), new THREE.MeshBasicMaterial({ color: 0xc8bfa8 }));
    laneLine.rotation.x = -Math.PI / 2;
    laneLine.position.set(lx, 0.015, -len / 2);
    group.add(laneLine);
  }

  // Side walls, sculpted instanced columns with golden capitals, coffered ceiling & chandeliers.
  const wallMat = mat(0xeae2d2, 0.68);
  for (const s of [-1, 1]) {
    box(group, 0.6, 11, spanZ, wallMat, s * (halfW + 3), 0, midZ, false);
  }
  const colPositions: [number, number][] = [];
  for (const s of [-1, 1]) for (let z = zMax - 4; z > zMin; z -= 8) colPositions.push([s * halfW, z]);
  const colGeo = mergeParts([
    { geo: new THREE.BoxGeometry(1.18, 0.55, 1.18), y: 0.275, color: 0xd8d0c0 },
    { geo: new THREE.BoxGeometry(0.94, 8.75, 0.94), y: 4.92, color: 0xf2ede2, aoBottom: 0.9 },
    { geo: new THREE.BoxGeometry(1.16, 0.38, 1.16), y: 9.48, color: 0xd6b25a },
    { geo: new THREE.BoxGeometry(1.26, 0.32, 1.26), y: 9.84, color: 0xe6decb },
  ]);
  const cols = new THREE.InstancedMesh(colGeo, mat(0xffffff, 0.46, { vertexColors: true }), colPositions.length);
  const m4 = new THREE.Matrix4();
  colPositions.forEach(([cx, cz], i) => cols.setMatrixAt(i, m4.makeTranslation(cx, 0, cz)));
  cols.castShadow = cols.receiveShadow = true;
  group.add(cols);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2 + 6, spanZ), mat(0xf4efe6, 0.78, { side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 10, midZ);
  group.add(ceil);

  // Coffered transverse ceiling beams + golden chandeliers
  const beamZs: number[] = [];
  for (let z = zMax - 4; z > zMin; z -= 8) beamZs.push(z);
  const beamGeo = mergeParts([
    { geo: new THREE.BoxGeometry(halfW * 2 + 5.6, 0.42, 0.65), y: 9.78, color: 0xe4dccb },
    { geo: new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), y: 9.15, color: 0xc9a24a },
    { geo: new THREE.TorusGeometry(0.55, 0.06, 6, 14), y: 8.68, rx: Math.PI / 2, color: 0xdcb858 },
    { geo: new THREE.SphereGeometry(0.16, 8, 6), y: 8.65, color: 0xfff7df },
  ]);
  const beams = new THREE.InstancedMesh(beamGeo, mat(0xffffff, 0.45, { metalness: 0.25, vertexColors: true }), beamZs.length);
  beamZs.forEach((bz, i) => beams.setMatrixAt(i, m4.makeTranslation(0, 0, bz)));
  group.add(beams);

  // 3 wide-throw warm corridor lights instead of 11 per-bay PointLights (avoids heavy 13-light PBR shader unrolling).
  for (const z of [-8, -50, -92]) {
    const l = new THREE.PointLight(0xfff3dd, 24, 58, 1);
    l.position.set(0, 8.6, z);
    group.add(l);
  }

  // Safa & Marwah natural granite rock outcrops preserved behind framed glass balustrades (3-tier LOD).
  const rockHiGeo = mergeParts([
    { geo: new THREE.DodecahedronGeometry(3.6, 2), x: 0, y: 0.65, z: 0, sx: 1.75, sy: 0.52, sz: 1.05, color: 0x8a745f, aoBottom: 0.72 },
    { geo: new THREE.DodecahedronGeometry(2.4, 2), x: -2.8, y: 0.48, z: 0.6, sx: 1.4, sy: 0.48, sz: 1.0, color: 0x7c6753, aoBottom: 0.72 },
    { geo: new THREE.DodecahedronGeometry(2.5, 2), x: 2.7, y: 0.52, z: -0.4, sx: 1.35, sy: 0.50, sz: 0.95, color: 0x937d67, aoBottom: 0.72 },
    { geo: new THREE.DodecahedronGeometry(1.7, 1), x: 0.6, y: 1.42, z: 0.2, sx: 1.3, sy: 0.55, sz: 0.9, color: 0x9b856e, aoBottom: 0.78 },
  ]);
  const rockClayGeo = mergeParts([
    { geo: new THREE.DodecahedronGeometry(4.2, 1), y: 0.75, sx: 1.65, sy: 0.5, sz: 1.0, color: 0x8a7560, aoBottom: 0.76 },
  ]);
  const rockMat = mat(0xffffff, 0.95, { flatShading: true, vertexColors: true });
  const rockClayMat = mat(0xffffff, 0.95, { vertexColors: true });

  for (const [z, name] of [[MASA.safaZ + 7, tr('เนินเศาะฟา')], [MASA.marwahZ - 7, tr('เนินมัรวะฮ์')]] as const) {
    const h0 = new THREE.Mesh(rockHiGeo, rockMat);
    h0.castShadow = h0.receiveShadow = true;
    const h2 = new THREE.Mesh(rockClayGeo, rockClayMat);
    group.add(makeLOD(0, 0, z, [[h0, 0], [h2, 55]]));

    const gzPos = z + (z > -50 ? -3.8 : 3.8);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 0.08), mat(0xbfe3ff, 0.1, { transparent: true, opacity: 0.35 }));
    glass.position.set(0, 0.6, gzPos);
    group.add(glass);
    // Stainless steel top handrail + posts on the glass barrier
    box(group, 14.2, 0.07, 0.12, mat(0xc8cfd6, 0.25, { metalness: 0.8 }), 0, 1.2, gzPos, false);
    for (let px = -7; px <= 7; px += 3.5) box(group, 0.08, 1.22, 0.10, mat(0xb5bcc4, 0.3, { metalness: 0.75 }), px, 0, gzPos, false);

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
  }
  const gl = new THREE.PointLight(0x35e08f, 14, 28, 1);
  gl.position.set(0, 8, (MASA.green.from + MASA.green.to) / 2);
  group.add(gl);
  const gz = makeLabel(tr('ไฟเขียว: ผู้ชายวิ่งเหยาะ ๆ'), { height: 0.6, bg: 'rgba(20,90,55,0.85)' });
  gz.position.set(0, 7.5, MASA.green.from);
  group.add(gz);

  colliders.push({ kind: 'rect-in', minX: -halfW + 0.6, maxX: halfW - 0.6, minZ: MASA.marwahZ - 3.4, maxZ: zMax - 1 });

  // Crowd walking back and forth (frustum-culled + 3-tier LOD).
  const crowd = crowdMesh(crowdCount, [0xf4f2ec, 0xf4f2ec, 0x1f1f24, 0xf4f2ec, 0x30303a]);
  group.add(crowd.group);
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
      placeCrowd(crowd, i, p.x, p.z, p.v > 0 ? 0 : Math.PI, 0, true);
    });
  };
  tick(0);
  return { group, colliders, tick };
}
