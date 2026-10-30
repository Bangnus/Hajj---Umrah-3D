import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { textTexture } from '../../engine/label';
import { mergeParts } from '../../engine/lod';
import { box, boxCollider, floor, mat, tileTexture, type Scene3D } from '../common';
import { tr } from '../../i18n';

/** Airport hall with check-in, immigration, security and Gate 14. */
export const AIRPORT = {
  start: { x: 0, z: 14 },
  steps: [
    { x: -8, z: 6, label: tr('เคาน์เตอร์เช็กอิน') },
    { x: 8, z: 0, label: tr('ตรวจคนเข้าเมือง') },
    { x: 0, z: -6, label: tr('จุดตรวจความปลอดภัย') },
    { x: 0, z: -15, label: tr('ประตูขึ้นเครื่อง 14') },
  ],
};

export function buildAirport(): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const tex = tileTexture('#e9ecef', 'rgba(140,150,160,0.28)', 8);
  tex.repeat.set(6, 8);
  floor(group, 44, 44, mat(0xffffff, 0.28, { map: tex }));
  // Tarmac apron outside window
  floor(group, 90, 60, mat(0x52565c, 0.92), 0, -52).position.y = -0.02;

  const wall = mat(0xdfe6ec, 0.6);
  box(group, 44, 9, 0.4, wall, 0, 0, -21);
  box(group, 0.4, 9, 44, wall, -22, 0, 0);
  box(group, 0.4, 9, 44, wall, 22, 0, 0);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(36, 7), mat(0x9fd0f0, 0.1, { transparent: true, opacity: 0.42 }));
  glass.position.set(0, 4, -20.7);
  group.add(glass);
  // Curtain-wall mullions
  for (let mx = -18; mx <= 18; mx += 6) box(group, 0.14, 7.2, 0.22, mat(0x69747e, 0.4, { metalness: 0.5 }), mx, 0.4, -20.72, false);

  // Sculpted wide-body airliner outside the terminal window (1 merged mesh!)
  const airliner = new THREE.Mesh(
    mergeParts([
      // Cylindrical fuselage + nose radome + tail cone (orientated along X across the apron!)
      { geo: new THREE.CylinderGeometry(2.05, 2.05, 28, 18), x: 0, y: 3.4, z: -40, rz: Math.PI / 2, color: 0xf5f6f8, aoBottom: 0.85 },
      { geo: new THREE.SphereGeometry(2.05, 16, 12), x: -14, y: 3.4, z: -40, sx: 1.65, sy: 0.95, sz: 1.0, color: 0xf5f6f8 },
      { geo: new THREE.BoxGeometry(1.4, 0.48, 1.8), x: -15.4, y: 3.85, z: -40, rz: 0.25, color: 0x1e2d3b }, // cockpit windshield
      { geo: new THREE.ConeGeometry(2.05, 7.5, 16), x: 17.5, y: 3.6, z: -40, rz: -Math.PI / 2, color: 0xf2f4f7 },
      // Emerald livery cheatline + vertical tail fin + winglets
      { geo: new THREE.BoxGeometry(27.5, 0.36, 4.14), x: 0, y: 3.55, z: -40, color: 0x186146 },
      { geo: new THREE.BoxGeometry(4.2, 6.2, 0.28), x: 17.2, y: 7.2, z: -40, rz: -0.35, color: 0x186146 },
      // Swept main wings + twin underwing turbofan jet engines
      { geo: new THREE.BoxGeometry(4.6, 0.28, 30), x: -1.5, y: 2.8, z: -40, color: 0xe6eaee },
      { geo: new THREE.CylinderGeometry(0.88, 0.78, 3.2, 14), x: -2.6, y: 1.85, z: -32.5, rz: Math.PI / 2, color: 0xd8dee4 },
      { geo: new THREE.CylinderGeometry(0.88, 0.78, 3.2, 14), x: -2.6, y: 1.85, z: -47.5, rz: Math.PI / 2, color: 0xd8dee4 },
      { geo: new THREE.CylinderGeometry(0.72, 0.72, 0.2, 12), x: -4.2, y: 1.85, z: -32.5, rz: Math.PI / 2, color: 0x24292e },
      { geo: new THREE.CylinderGeometry(0.72, 0.72, 0.2, 12), x: -4.2, y: 1.85, z: -47.5, rz: Math.PI / 2, color: 0x24292e },
    ]),
    mat(0xffffff, 0.35, { metalness: 0.2, vertexColors: true }),
  );
  group.add(airliner);
  colliders.push({ kind: 'rect-in', minX: -21, maxX: 21, minZ: -20, maxZ: 21 });

  // Check-in counters with baggage scales & agent monitors.
  for (let i = 0; i < 4; i++) {
    const cx = -14 + i * 3;
    box(group, 2.0, 1.1, 0.82, mat(0x1f5f4b, 0.48), cx, 0, 8);
    box(group, 2.06, 0.08, 0.90, mat(0xf2efe9, 0.35), cx, 1.1, 8, false);
    box(group, 0.46, 0.34, 0.06, mat(0x22282e, 0.3), cx, 1.25, 7.85, false); // monitor
    box(group, 0.72, 0.12, 0.85, mat(0x3a3f45, 0.7), cx + 1.42, 0, 8, false); // baggage belt
    colliders.push(boxCollider(cx, 8, 2.4, 0.8));
  }
  // Immigration booths with glass shields.
  for (const x of [4, 12]) {
    box(group, 1.6, 1.15, 1.6, mat(0x4b5a68, 0.55), x, 0, 0);
    box(group, 1.56, 1.05, 1.56, mat(0xb8dcf2, 0.12, { transparent: true, opacity: 0.45 }), x, 1.15, 0, false);
    box(group, 1.66, 0.12, 1.66, mat(0x3b4854, 0.5), x, 2.2, 0, false);
    colliders.push(boxCollider(x, 0, 1.6, 1.6));
  }
  // Security scanner arches + green ready LEDs + X-ray belt.
  for (const x of [-3, 3]) {
    box(group, 0.18, 2.3, 0.62, 0x85919e, x - 0.62, 0, -6);
    box(group, 0.18, 2.3, 0.62, 0x85919e, x + 0.62, 0, -6);
    box(group, 1.42, 0.22, 0.64, 0x6b7785, x, 2.3, -6);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0x36e08b }));
    led.position.set(x, 2.38, -5.67);
    group.add(led);
  }
  // Gate sign & contoured waiting benches (instanced in 1 draw call).
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.4), new THREE.MeshBasicMaterial({ map: textTexture([tr('ประตู 14  ✈  เจดดาห์')], 768, 256, '#11302a', '#f2d06b', 76) }));
  sign.position.set(0, 4.5, -18.5);
  group.add(sign);

  const benchGeo = mergeParts([
    { geo: new THREE.BoxGeometry(3.8, 0.08, 0.12), y: 0.36, color: 0x8f98a2 },
    { geo: new THREE.BoxGeometry(0.10, 0.38, 0.48), x: -1.65, y: 0.19, color: 0x7a838d },
    { geo: new THREE.BoxGeometry(0.10, 0.38, 0.48), x: 1.65, y: 0.19, color: 0x7a838d },
    ...[-1.4, -0.47, 0.47, 1.4].flatMap((sx) => [
      { geo: new THREE.BoxGeometry(0.76, 0.08, 0.50), x: sx, y: 0.43, z: 0.04, color: 0x2f4356 },
      { geo: new THREE.BoxGeometry(0.76, 0.44, 0.08), x: sx, y: 0.66, z: -0.20, rx: -0.15, color: 0x354b60 },
    ]),
  ]);
  const benches = new THREE.InstancedMesh(benchGeo, mat(0xffffff, 0.55, { metalness: 0.25, vertexColors: true }), 6);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 6; i++) {
    const bx = i % 2 ? 5 : -5, bz = -12 - Math.floor(i / 2) * 2.2;
    benches.setMatrixAt(i, m4.makeTranslation(bx, 0, bz));
    colliders.push(boxCollider(bx, bz, 4, 0.7));
  }
  benches.castShadow = true;
  group.add(benches);
  return { group, colliders };
}
