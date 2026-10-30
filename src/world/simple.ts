import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { makeLabel, textTexture } from '../engine/label';
import { makeLOD, mergeParts } from '../engine/lod';
import { box, boxCollider, floor, mat, tileTexture, type Scene3D } from './common';
import { tr } from '../i18n';

/** Thai house interior (12 x 10 m) with a door to the street and a waiting car. */
export const HOME = {
  door: { x: 0, z: -5 },
  outside: { x: 0, z: -8.5 },
  items: [
    { x: -4, z: 2.5 }, { x: 4, z: 2.5 }, { x: -4.2, z: -2 }, { x: 4.2, z: -2 }, { x: 0, z: 3.4 },
  ],
};

export function buildHome(): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const wood = tileTexture('#b98b5e', 'rgba(90,60,30,0.25)', 6);
  wood.repeat.set(3, 3);
  floor(group, 12, 10, mat(0xffffff, 0.65, { map: wood }));
  floor(group, 40, 20, mat(0x585b60, 0.9), 0, -15); // street asphalt
  // Sidewalk curb between yard & street
  box(group, 40, 0.12, 1.4, mat(0xc8c4ba, 0.8), 0, 0, -5.8, false);
  floor(group, 60, 60, mat(0x759960, 1), 0, 0).position.y = -0.01; // garden

  const wall = mat(0xf2eadb, 0.84);
  box(group, 12, 3, 0.2, wall, 0, 0, 5);
  box(group, 0.2, 3, 10, wall, -6, 0, 0);
  box(group, 0.2, 3, 10, wall, 6, 0, 0);
  box(group, 5, 3, 0.2, wall, -3.5, 0, -5);
  box(group, 5, 3, 0.2, wall, 3.5, 0, -5);
  box(group, 2, 0.8, 0.2, wall, 0, 2.2, -5);
  // Wooden door frame around entrance
  box(group, 0.12, 2.25, 0.26, mat(0x6b4c32, 0.65), -1.02, 0, -5, false);
  box(group, 0.12, 2.25, 0.26, mat(0x6b4c32, 0.65), 1.02, 0, -5, false);
  colliders.push(
    { kind: 'box', minX: -6.2, maxX: 6.2, minZ: 4.9, maxZ: 5.2 },
    { kind: 'box', minX: -6.2, maxX: -5.9, minZ: -5.2, maxZ: 5.2 },
    { kind: 'box', minX: 5.9, maxX: 6.2, minZ: -5.2, maxZ: 5.2 },
    { kind: 'box', minX: -6.2, maxX: -1, minZ: -5.2, maxZ: -4.9 },
    { kind: 'box', minX: 1, maxX: 6.2, minZ: -5.2, maxZ: -4.9 },
    { kind: 'rect-in', minX: -6, maxX: 6, minZ: -12, maxZ: 5 },
  );

  // Sculpted furniture (merged in 1 draw call: 4-legged wooden table + ihram stack, wheeled suitcase, cushioned sofa).
  const furniture = new THREE.Mesh(
    mergeParts([
      // Wooden table at (0, 0, 0.5)
      { geo: new THREE.BoxGeometry(2.4, 0.08, 1.0), x: 0, y: 0.76, z: 0.5, color: 0x7b5638 },
      { geo: new THREE.BoxGeometry(2.2, 0.08, 0.82), x: 0, y: 0.69, z: 0.5, color: 0x65462d },
      { geo: new THREE.BoxGeometry(0.09, 0.72, 0.09), x: -1.06, y: 0.36, z: 0.1, color: 0x65462d, aoBottom: 0.8 },
      { geo: new THREE.BoxGeometry(0.09, 0.72, 0.09), x: 1.06, y: 0.36, z: 0.1, color: 0x65462d, aoBottom: 0.8 },
      { geo: new THREE.BoxGeometry(0.09, 0.72, 0.09), x: -1.06, y: 0.36, z: 0.9, color: 0x65462d, aoBottom: 0.8 },
      { geo: new THREE.BoxGeometry(0.09, 0.72, 0.09), x: 1.06, y: 0.36, z: 0.9, color: 0x65462d, aoBottom: 0.8 },
      // Folded white ihram towels & green guidebook on table
      { geo: new THREE.BoxGeometry(0.48, 0.10, 0.36), x: -0.45, y: 0.85, z: 0.48, color: 0xf6f4ee },
      { geo: new THREE.BoxGeometry(0.24, 0.04, 0.32), x: 0.38, y: 0.82, z: 0.52, ry: 0.2, color: 0x1b5e46 },
      // Hardshell suitcase with wheels & telescopic handle at (1.5, 0, -3.8)
      { geo: new THREE.BoxGeometry(0.52, 0.68, 0.34), x: 1.5, y: 0.38, z: -3.8, color: 0x26537d, aoBottom: 0.85 },
      { geo: new THREE.BoxGeometry(0.54, 0.04, 0.36), x: 1.5, y: 0.38, z: -3.8, color: 0x1a2026 },
      { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), x: 1.30, y: 0.03, z: -3.68, rz: Math.PI / 2, color: 0x1d1d1f },
      { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), x: 1.70, y: 0.03, z: -3.68, rz: Math.PI / 2, color: 0x1d1d1f },
      { geo: new THREE.BoxGeometry(0.22, 0.24, 0.03), x: 1.5, y: 0.82, z: -3.92, color: 0x8f969e },
      // 3-seat cushioned sofa at (-3.5, 0, 4.3)
      { geo: new THREE.BoxGeometry(2.96, 0.34, 0.92), x: -3.5, y: 0.22, z: 4.3, color: 0x3b6859, aoBottom: 0.8 },
      { geo: new THREE.BoxGeometry(2.96, 0.56, 0.22), x: -3.5, y: 0.62, z: 4.66, color: 0x457868 },
      { geo: new THREE.BoxGeometry(0.22, 0.48, 0.94), x: -4.92, y: 0.46, z: 4.3, color: 0x3f6e5f },
      { geo: new THREE.BoxGeometry(0.22, 0.48, 0.94), x: -2.08, y: 0.46, z: 4.3, color: 0x3f6e5f },
      { geo: new THREE.BoxGeometry(0.84, 0.14, 0.68), x: -4.36, y: 0.44, z: 4.22, color: 0x4e8573 },
      { geo: new THREE.BoxGeometry(0.84, 0.14, 0.68), x: -3.50, y: 0.44, z: 4.22, color: 0x4e8573 },
      { geo: new THREE.BoxGeometry(0.84, 0.14, 0.68), x: -2.64, y: 0.44, z: 4.22, color: 0x4e8573 },
      // Gold picture frame border behind calligraphy
      { geo: new THREE.BoxGeometry(1.74, 1.14, 0.05), x: 0, y: 1.9, z: 4.90, color: 0xc9a24a },
    ]),
    mat(0xffffff, 0.72, { vertexColors: true }),
  );
  furniture.castShadow = furniture.receiveShadow = true;
  group.add(furniture);
  colliders.push(boxCollider(0, 0.5, 2.4, 1), boxCollider(-3.5, 4.3, 3, 1));

  const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshBasicMaterial({ map: textTexture(['بِسْمِ اللَّهِ'], 512, 320, '#0d2622', '#e2c46c', 80) }));
  frame.position.set(0, 1.9, 4.86);
  frame.rotation.y = Math.PI;
  group.add(frame);

  // Waiting sedan car outside at (3.5, 0, -12) with 3-tier LOD (sculpted sedan -> clay far).
  const carLod0 = new THREE.Group();
  const carBody = new THREE.Mesh(
    mergeParts([
      // Lower body chassis, sloped hood (+z) & trunk (-z)
      { geo: new THREE.BoxGeometry(1.88, 0.62, 4.28), y: 0.56, color: 0xedeff2, aoBottom: 0.84 },
      { geo: new THREE.BoxGeometry(1.94, 0.22, 0.24), y: 0.36, z: 2.08, color: 0x2c3035 },
      { geo: new THREE.BoxGeometry(1.94, 0.24, 0.22), y: 0.38, z: -2.08, color: 0x2c3035 },
      // Cabin roof + pillars
      { geo: new THREE.BoxGeometry(1.62, 0.52, 2.05), y: 1.12, z: -0.15, color: 0xf2f4f7 },
      // Front grille + headlights + rear taillights + mirrors
      { geo: new THREE.BoxGeometry(0.92, 0.22, 0.06), y: 0.58, z: 2.15, color: 0x22262a },
      { geo: new THREE.BoxGeometry(0.36, 0.14, 0.06), x: -0.68, y: 0.64, z: 2.15, color: 0xfff8df },
      { geo: new THREE.BoxGeometry(0.36, 0.14, 0.06), x: 0.68, y: 0.64, z: 2.15, color: 0xfff8df },
      { geo: new THREE.BoxGeometry(0.42, 0.15, 0.06), x: -0.65, y: 0.68, z: -2.15, color: 0xc92a2a },
      { geo: new THREE.BoxGeometry(0.42, 0.15, 0.06), x: 0.65, y: 0.68, z: -2.15, color: 0xc92a2a },
      { geo: new THREE.BoxGeometry(0.18, 0.11, 0.14), x: -0.98, y: 0.94, z: 0.68, color: 0xedeff2 },
      { geo: new THREE.BoxGeometry(0.18, 0.11, 0.14), x: 0.98, y: 0.94, z: 0.68, color: 0xedeff2 },
      // 4 wheels with rubber tires & silver alloy rims
      ...([[-0.88, -1.32], [0.88, -1.32], [-0.88, 1.32], [0.88, 1.32]] as const).flatMap(([wx, wz]) => [
        { geo: new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14), x: wx, y: 0.33, z: wz, rz: Math.PI / 2, color: 0x1d1e20 },
        { geo: new THREE.CylinderGeometry(0.20, 0.20, 0.26, 10), x: wx * 1.01, y: 0.33, z: wz, rz: Math.PI / 2, color: 0xc8cfd6 },
      ]),
    ]),
    mat(0xffffff, 0.32, { metalness: 0.3, vertexColors: true }),
  );
  carBody.castShadow = carBody.receiveShadow = true;
  const carGlass = new THREE.Mesh(
    mergeParts([
      { geo: new THREE.BoxGeometry(1.66, 0.44, 1.88), y: 1.10, z: -0.15, color: 0x253a4a },
      { geo: new THREE.BoxGeometry(1.54, 0.48, 0.08), y: 1.08, z: 0.86, rx: -0.52, color: 0x253a4a },
      { geo: new THREE.BoxGeometry(1.50, 0.44, 0.08), y: 1.08, z: -1.14, rx: 0.48, color: 0x253a4a },
    ]),
    mat(0xffffff, 0.12, { metalness: 0.4, vertexColors: true }),
  );
  carLod0.add(carBody, carGlass);

  const carClay = new THREE.Mesh(
    mergeParts([
      { geo: new THREE.BoxGeometry(1.9, 0.72, 4.3), y: 0.56, color: 0xe8eaed, aoBottom: 0.82 },
      { geo: new THREE.BoxGeometry(1.62, 0.52, 2.1), y: 1.14, z: -0.15, color: 0x344958 },
    ]),
    mat(0xffffff, 0.92, { vertexColors: true }),
  );
  group.add(makeLOD(3.5, 0, -12, [[carLod0, 0], [carClay, 38]]));
  colliders.push(boxCollider(3.5, -12, 2, 4.4));
  return { group, colliders };
}

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

/** Aircraft cabin: the player walks the aisle; changing room at the rear. */
export const CABIN = { start: { x: 0, z: 10 }, changing: { x: 0, z: -15.5 } };

export function buildCabin(): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  floor(group, 6, 40, mat(0x2d3c4d, 0.9));
  // Aisle carpet runner strip
  const aisle = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 32), mat(0x1f5240, 0.92));
  aisle.rotation.x = -Math.PI / 2;
  aisle.position.set(0, 0.01, -1.5);
  group.add(aisle);

  const hull = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 40, 32, 1, true, -Math.PI / 2 - 1.2, Math.PI + 2.4), mat(0xf0f2f5, 0.68, { side: THREE.BackSide }));
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 1.2;
  group.add(hull);

  // Overhead luggage bins along both sides
  for (const s of [-1, 1]) {
    box(group, 1.05, 0.46, 28, mat(0xe3e7ec, 0.55), s * 1.95, 2.18, 0, false);
  }

  // Contoured airline seats (3-3 layout, 84 seats instanced in 1 draw call instead of 168 separate meshes!)
  const seatGeo = mergeParts([
    { geo: new THREE.BoxGeometry(0.10, 0.34, 0.32), y: 0.17, color: 0x5c646d },
    { geo: new THREE.BoxGeometry(0.50, 0.12, 0.48), y: 0.40, color: 0x234463 },
    { geo: new THREE.BoxGeometry(0.48, 0.68, 0.10), y: 0.76, z: 0.21, rx: 0.10, color: 0x284d70 },
    // Crisp white antimacassar headrest cover + armrests
    { geo: new THREE.BoxGeometry(0.38, 0.20, 0.115), y: 1.04, z: 0.23, rx: 0.10, color: 0xf4f5f7 },
    { geo: new THREE.BoxGeometry(0.05, 0.06, 0.42), x: -0.25, y: 0.58, z: 0.04, color: 0x3b424a },
    { geo: new THREE.BoxGeometry(0.05, 0.06, 0.42), x: 0.25, y: 0.58, z: 0.04, color: 0x3b424a },
  ]);
  const seatCount = 14 * 6;
  const seats = new THREE.InstancedMesh(seatGeo, mat(0xffffff, 0.72, { vertexColors: true }), seatCount);
  const m4 = new THREE.Matrix4();
  let si = 0;
  for (let row = 0; row < 14; row++) {
    const z = 13 - row * 2;
    for (const x of [-2.3, -1.7, -1.1, 1.1, 1.7, 2.3]) {
      seats.setMatrixAt(si++, m4.makeTranslation(x, 0, z));
    }
  }
  group.add(seats);

  // Cabin oval windows instanced in 1 draw call
  const winGeo = mergeParts([
    { geo: new THREE.CylinderGeometry(0.20, 0.20, 0.04, 14), rz: Math.PI / 2, sy: 1.35, color: 0xd0d6dc },
    { geo: new THREE.CylinderGeometry(0.15, 0.15, 0.05, 14), rz: Math.PI / 2, sy: 1.35, color: 0xbfe2ff },
  ]);
  const wins = new THREE.InstancedMesh(winGeo, new THREE.MeshBasicMaterial({ vertexColors: true }), 28);
  let wi = 0;
  for (let i = 0; i < 14; i++) {
    for (const s of [-1, 1]) {
      wins.setMatrixAt(wi++, m4.makeTranslation(s * 2.86, 1.45, 13 - i * 2));
    }
  }
  group.add(wins);

  box(group, 5.4, 2.4, 0.2, mat(0xd8dde2, 0.6), 0, 0, -17.6);
  box(group, 1.1, 2.05, 0.06, mat(0xb8c2cc, 0.45), 0, 0, -17.48, false); // lavatory/changing door
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ map: textTexture([tr('ห้องเปลี่ยนชุด')], 512, 160, '#11302a', '#ffffff', 64) }));
  sign.position.set(0, 2.2, -17.45);
  group.add(sign);
  const lb = makeLabel(tr('แอร์ไลน์ → เจดดาห์'), { height: 0.4 });
  lb.position.set(0, 2.4, 14.5);
  group.add(lb);
  colliders.push({ kind: 'rect-in', minX: -0.75, maxX: 0.75, minZ: -17.4, maxZ: 14.5 });
  // Cabin light.
  const l = new THREE.PointLight(0xfff6e6, 20, 30);
  l.position.set(0, 2.4, 0);
  group.add(l);
  return { group, colliders };
}

/** Plaza outside Marwah with barber kiosks for tahallul. */
export const PLAZA = { start: { x: 0, z: 6 }, barber: { x: 0, z: -4 } };

export function buildPlaza(): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const tex = tileTexture('#efebe1', 'rgba(170,160,145,0.34)', 6);
  tex.repeat.set(8, 8);
  floor(group, 60, 60, mat(0xffffff, 0.36, { map: tex }));

  const kioskHiGeo = mergeParts([
    { geo: new THREE.BoxGeometry(4, 3, 3), y: 1.5, color: 0xeae2cf, aoBottom: 0.85 },
    { geo: new THREE.BoxGeometry(4.25, 0.24, 3.25), y: 3.06, color: 0xd5cab4 },
    // Storefront glass window, door, emerald awning & classic barber pole
    { geo: new THREE.BoxGeometry(2.1, 1.5, 0.08), x: -0.5, y: 1.55, z: 1.49, color: 0x2d4452 },
    { geo: new THREE.BoxGeometry(0.95, 2.2, 0.08), x: 1.25, y: 1.1, z: 1.49, color: 0x5c4632 },
    { geo: new THREE.BoxGeometry(4.1, 0.18, 0.75), y: 2.52, z: 1.80, rx: 0.22, color: 0x1e5c45 },
    { geo: new THREE.CylinderGeometry(0.08, 0.08, 0.65, 10), x: -1.78, y: 1.95, z: 1.62, color: 0xc93434 },
    { geo: new THREE.SphereGeometry(0.095, 8, 6), x: -1.78, y: 2.32, z: 1.62, color: 0xd8dce0 },
  ]);
  const kioskClayGeo = mergeParts([
    { geo: new THREE.BoxGeometry(4, 3.1, 3), y: 1.55, color: 0xe7dfcc, aoBottom: 0.84 },
  ]);
  const kioskStdMat = mat(0xffffff, 0.58, { vertexColors: true });
  const kioskClayMat = mat(0xffffff, 0.92, { vertexColors: true });

  for (let i = 0; i < 4; i++) {
    const x = -9 + i * 6;
    const m0 = new THREE.Mesh(kioskHiGeo, kioskStdMat);
    m0.castShadow = m0.receiveShadow = true;
    const m2 = new THREE.Mesh(kioskClayGeo, kioskClayMat);
    group.add(makeLOD(x, 0, -10, [[m0, 0], [m2, 42]]));

    const s = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.7), new THREE.MeshBasicMaterial({ map: textTexture([tr('ร้านตัดผม ✂')], 512, 128, '#11302a', '#f2d06b', 56) }));
    s.position.set(x, 3.55, -8.45);
    group.add(s);
    colliders.push(boxCollider(x, -10, 4, 3));
  }

  // Plaza architectural shade umbrellas (LOD close -> clay far).
  const umbHi = mergeParts([
    { geo: new THREE.CylinderGeometry(0.24, 0.30, 0.7, 10), y: 0.35, color: 0xd8d2c5 },
    { geo: new THREE.CylinderGeometry(0.15, 0.18, 5.5, 10), y: 3.1, color: 0xefece4 },
    { geo: new THREE.CylinderGeometry(0.32, 0.18, 0.45, 10), y: 5.75, color: 0xd6b25a },
    { geo: new THREE.ConeGeometry(5.1, 1.3, 8), y: 6.3, color: 0xf6f3ea },
    { geo: new THREE.SphereGeometry(0.16, 8, 6), y: 7.05, color: 0xd6b25a },
  ]);
  const umbClay = mergeParts([
    { geo: new THREE.CylinderGeometry(0.16, 0.22, 6, 6), y: 3, color: 0xe8e4dc },
    { geo: new THREE.ConeGeometry(5.0, 1.2, 6), y: 6.2, color: 0xf2eee4 },
  ]);
  for (const [x, z] of [[-14, 8], [14, 8], [-14, -2], [14, -2]]) {
    const u0 = new THREE.Mesh(umbHi, kioskStdMat);
    u0.castShadow = true;
    const u2 = new THREE.Mesh(umbClay, kioskClayMat);
    group.add(makeLOD(x, 0, z, [[u0, 0], [u2, 55]]));
  }
  colliders.push({ kind: 'rect-in', minX: -28, maxX: 28, minZ: -28, maxZ: 28 });
  return { group, colliders };
}
