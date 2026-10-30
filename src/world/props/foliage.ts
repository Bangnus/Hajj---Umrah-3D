import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { keepAlive, makeLOD, mergeParts, type PartSpec } from '../../engine/lod';
import { vcolClay, vcolStd } from './materials';

let _palmGeos: { g0: THREE.BufferGeometry; g1: THREE.BufferGeometry; g2: THREE.BufferGeometry } | null = null;
function getPalmGeos() {
  if (_palmGeos) return _palmGeos;
  const H = 7.5;
  const parts0: PartSpec[] = [];
  // Stacked ringed trunk with slight natural curve & bark texture variation
  const segs = 8;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const yMid = ((t0 + t1) * 0.5) * H;
    const bend = Math.sin(t0 * Math.PI * 0.7) * 0.16;
    const rb = 0.29 - t0 * 0.11;
    const rt = 0.29 - t1 * 0.11 + 0.025; // slight diamond leaf-scar ring flare
    parts0.push({
      geo: new THREE.CylinderGeometry(rt, rb, H / segs + 0.04, 9),
      x: bend, y: yMid, rz: -0.025 * (1 - t0),
      color: i % 2 === 0 ? 0x866544 : 0x765739,
      aoBottom: 0.78,
    });
  }
  const topX = Math.sin(0.7 * Math.PI * 0.875) * 0.16;
  // Crown heart + golden-amber date clusters (อินทผลัม)
  parts0.push({ geo: new THREE.SphereGeometry(0.32, 9, 7), x: topX, y: H - 0.05, sy: 0.85, color: 0x5c422a });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    parts0.push({
      geo: new THREE.SphereGeometry(0.19, 7, 6),
      x: topX + Math.cos(a) * 0.34, y: H - 0.28, z: Math.sin(a) * 0.34,
      sx: 0.8, sy: 1.35, sz: 0.8, color: 0xc9882c, aoBottom: 0.75,
    });
  }
  // 11 gracefully arched multi-segment palm fronds
  const nFronds = 11;
  for (let i = 0; i < nFronds; i++) {
    const az = (i / nFronds) * Math.PI * 2 + (i % 2) * 0.12;
    const upperTier = i % 2 === 0;
    const baseTilt = upperTier ? 0.55 : 0.92;
    const col = upperTier ? 0x4b863e : 0x3b6e32;
    const ca = Math.cos(az), sa = Math.sin(az);
    // 3 arched segments along each frond
    let rDist = 0.15, curY = H + 0.05;
    for (let s = 0; s < 3; s++) {
      const len = 1.05 - s * 0.08;
      const pitch = baseTilt + s * 0.42;
      const dr = Math.sin(pitch) * len;
      const dy = Math.cos(pitch) * len;
      const mx = topX + ca * (rDist + dr * 0.5);
      const mz = sa * (rDist + dr * 0.5);
      const my = curY + dy * 0.5;
      const w = s === 0 ? 0.42 : s === 1 ? 0.62 : 0.34;
      // Two V-angled leaflet planes forming a crisp 3D palm frond
      for (const vSign of [-1, 1]) {
        parts0.push({
          geo: new THREE.BoxGeometry(w * 0.52, 0.028, len + 0.06),
          x: mx - sa * vSign * w * 0.2, y: my, z: mz + ca * vSign * w * 0.2,
          ry: Math.atan2(ca, sa), rx: pitch - Math.PI / 2, rz: vSign * 0.28,
          color: s === 2 ? 0x569146 : col, aoBottom: 0.84,
        });
      }
      rDist += dr;
      curY += dy;
    }
  }
  const g0 = keepAlive(mergeParts(parts0));

  // LOD 1 (35 m): Simple trunk + 7 curved frond blades
  const parts1: PartSpec[] = [
    { geo: new THREE.CylinderGeometry(0.18, 0.28, H, 7), y: H / 2, color: 0x826242, aoBottom: 0.8 },
  ];
  for (let i = 0; i < 7; i++) {
    const az = (i / 7) * Math.PI * 2;
    const ca = Math.cos(az), sa = Math.sin(az);
    parts1.push({
      geo: new THREE.BoxGeometry(0.58, 0.04, 2.7),
      x: ca * 1.25, y: H - 0.15, z: sa * 1.25,
      ry: Math.atan2(ca, sa), rx: 0.22, color: i % 2 ? 0x49823c : 0x3c6f32,
    });
  }
  const g1 = keepAlive(mergeParts(parts1));

  // LOD 2 (80 m): Soft clay palm silhouette (~28 tris, no shadow)
  const g2 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.17, 0.29, H, 5), y: H / 2, color: 0x826242, aoBottom: 0.8 },
    { geo: new THREE.SphereGeometry(2.1, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.62), y: H - 0.4, sy: 0.58, color: 0x447838, aoBottom: 0.78 },
  ]));

  _palmGeos = { g0, g1, g2 };
  return _palmGeos;
}

/** Date palm with curved ringed trunk, date clusters, arched 3D fronds and 3-tier clay LOD. */
export function palm(parent: THREE.Object3D, x: number, z: number, h = 7): Collider {
  const { g0, g1, g2 } = getPalmGeos();
  const s = h / 7.5;
  const sXZ = 0.92 + (s - 1) * 0.5;
  const yaw = ((Math.abs(Math.sin(x * 12.9898 + z * 78.233)) * 43758.5453) % 1) * Math.PI * 2;

  const m0 = new THREE.Mesh(g0, vcolStd());
  m0.castShadow = m0.receiveShadow = true;
  const m1 = new THREE.Mesh(g1, vcolStd());
  const m2 = new THREE.Mesh(g2, vcolClay());

  const lod = makeLOD(x, 0, z, [[m0, 0], [m1, 35], [m2, 80]]);
  lod.scale.set(sXZ, s, sXZ);
  lod.rotation.y = yaw;
  parent.add(lod);
  return { kind: 'circle', x, z, r: 0.35 };
}
