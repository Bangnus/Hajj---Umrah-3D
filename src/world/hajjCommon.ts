import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { makeLabel, textTexture } from '../engine/label';
import { createPropFieldLOD, keepAlive, mergeParts, type PropInstance } from '../engine/lod';
import { box, boxCollider, crowdMesh, cyl, mat, placeCrowd } from './common';

/** Shared builders for the Hajj sites (Mina, Arafah, Muzdalifah, Jamarat). */

/** Deterministic random numbers so each site looks the same every visit. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Speckled ground texture (sand, gravel, asphalt). */
export function speckTexture(base: string, specks: string[], n = 2200, size = 256, repeat = 40): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const r = rng(size + n);
  for (let i = 0; i < n; i++) {
    g.fillStyle = specks[i % specks.length];
    const s = 0.6 + r() * 1.8;
    g.fillRect(r() * size, r() * size, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

/** Flat ground plane centred at (x, z). */
export function ground(parent: THREE.Object3D, w: number, d: number, m: THREE.Material, x = 0, z = 0, y = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

let _mtnGeo: THREE.BufferGeometry | null = null;
let _mtnMat: THREE.MeshStandardMaterial | null = null;
function getMountainAssets() {
  if (_mtnGeo && _mtnMat) return { geo: _mtnGeo, m: _mtnMat };
  const raw = new THREE.IcosahedronGeometry(1, 2);
  const pos = raw.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // Flatten below base and carve craggy desert granite ridges
    if (y < -0.15) y = -0.15 + (y + 0.15) * 0.2;
    const hNorm = Math.max(0, Math.min(1, (y + 0.18) / 1.18));
    const ridge = 1 - Math.abs(Math.sin(x * 3.8 + z * 2.7)) * 0.24 - Math.abs(Math.cos(z * 4.3 - x * 2.1)) * 0.16;
    const strata = 1 + Math.sin(y * 11.0) * 0.035;
    const radXZ = (1.18 - hNorm * 0.55) * ridge * strata;
    x *= radXZ;
    z *= radXZ;
    y = y * (0.85 + ridge * 0.28);
    pos.setXYZ(i, x, y, z);

    // Elevation shading: darker warm scree base -> sun-bleached rocky crest
    const shade = 0.72 + hNorm * 0.36;
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade * 0.98;
    colors[i * 3 + 2] = shade * 0.94;
  }
  raw.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  raw.computeVertexNormals();
  raw.computeBoundingSphere();
  _mtnGeo = keepAlive(raw);
  _mtnMat = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, flatShading: true, vertexColors: true }));
  return { geo: _mtnGeo, m: _mtnMat };
}

/** Ring of craggy Hijaz granite mountains around the site (frustum-culled per mountain). */
export function mountainRing(parent: THREE.Object3D, o: { count: number; rMin: number; rMax: number; hMin: number; hMax: number; color?: number; seed?: number; cx?: number; cz?: number }) {
  const r = rng(o.seed ?? 7);
  const { geo, m } = getMountainAssets();
  const baseCol = new THREE.Color(o.color ?? 0x8c6f55);
  const cTmp = new THREE.Color();
  const instances: PropInstance[] = [];
  for (let i = 0; i < o.count; i++) {
    const a = (i / o.count) * Math.PI * 2 + r() * 0.2;
    const rad = o.rMin + r() * (o.rMax - o.rMin);
    const h = o.hMin + r() * (o.hMax - o.hMin);
    const w = h * (1.35 + r() * 1.15);
    const tint = 0.92 + r() * 0.16;
    cTmp.copy(baseCol).multiplyScalar(tint);
    instances.push({
      x: (o.cx ?? 0) + Math.cos(a) * rad,
      y: h * 0.08,
      z: (o.cz ?? 0) + Math.sin(a) * rad,
      yaw: r() * Math.PI * 2,
      sx: w,
      sy: h,
      sz: w * (0.72 + r() * 0.56),
      color: cTmp.getHex(),
    });
  }
  return createPropFieldLOD(parent, instances, [{ maxDist: 920, layers: [{ geo, mat: m, castShadow: false, receiveShadow: true, useColor: true }] }], 1.25, 0.35);
}

export interface SignOpts {
  x: number; z: number;
  /** Rotation around y; 0 = the front faces +z. */
  yaw?: number;
  w?: number; h?: number;
  /** Height of the board's bottom edge. */
  y?: number;
  bg?: string; color?: string; size?: number;
  /** Optional text on the back face. */
  back?: string[];
  posts?: boolean;
}

/** Sign board on two posts with text on the front (and optionally the back). */
export function signBoard(parent: THREE.Object3D, lines: string[], o: SignOpts) {
  const g = new THREE.Group();
  const w = o.w ?? 6, h = o.h ?? 2, y = o.y ?? 2.2;
  const px = Math.round((512 * w) / h);
  const W = Math.min(2048, Math.max(256, px));
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(lines, W, 512, o.bg ?? '#11302a', o.color ?? '#ffffff', o.size ?? 120) }));
  front.position.set(0, y + h / 2, 0.06);
  g.add(front);
  const backMat = o.back
    ? new THREE.MeshBasicMaterial({ map: textTexture(o.back, W, 512, o.bg ?? '#11302a', o.color ?? '#ffffff', o.size ?? 120) })
    : mat(0x5b5f63, 0.7);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), backMat);
  back.position.set(0, y + h / 2, -0.06);
  back.rotation.y = Math.PI;
  g.add(back);
  box(g, w + 0.2, h + 0.2, 0.1, 0x3a3f44, 0, y - 0.1, 0, false);
  if (o.posts !== false) for (const s of [-1, 1]) box(g, 0.18, y, 0.18, 0x6b7076, s * (w / 2 - 0.3), 0, 0, false);
  g.position.set(o.x, 0, o.z);
  g.rotation.y = o.yaw ?? 0;
  parent.add(g);
  return g;
}

/** Floating label sprite. */
export function label(parent: THREE.Object3D, text: string, x: number, y: number, z: number, height = 0.8, bg?: string) {
  const l = makeLabel(text, { height, bg });
  l.position.set(x, y, z);
  parent.add(l);
  return l;
}

export interface TentSpot { x: number; z: number }

let _tentAssets: { g0: THREE.BufferGeometry; g1: THREE.BufferGeometry; g2: THREE.BufferGeometry; matStd: THREE.MeshStandardMaterial; matClay: THREE.MeshStandardMaterial } | null = null;
function getTentAssets() {
  if (_tentAssets) return _tentAssets;
  // Built at unit footprint 1 x 1 (scaled by sx=size, sz=size, sy=1) with baseH=2.5, roofH=2.2.
  const baseH = 2.5, roofH = 2.2;
  const g0 = keepAlive(mergeParts([
    // Fire-proof Teflon fabric walls with natural ground shadow AO
    { geo: new THREE.BoxGeometry(0.98, baseH, 0.98), y: baseH / 2, color: 0xf6f4ee, aoBottom: 0.82 },
    // Lower sand skirt band
    { geo: new THREE.BoxGeometry(1.00, 0.24, 1.00), y: 0.12, color: 0xdad4c6 },
    // 4 structural corner posts
    { geo: new THREE.BoxGeometry(0.035, baseH + 0.04, 0.035), x: -0.485, y: baseH / 2, z: -0.485, color: 0xe2dfd7 },
    { geo: new THREE.BoxGeometry(0.035, baseH + 0.04, 0.035), x: 0.485, y: baseH / 2, z: -0.485, color: 0xe2dfd7 },
    { geo: new THREE.BoxGeometry(0.035, baseH + 0.04, 0.035), x: -0.485, y: baseH / 2, z: 0.485, color: 0xe2dfd7 },
    { geo: new THREE.BoxGeometry(0.035, baseH + 0.04, 0.035), x: 0.485, y: baseH / 2, z: 0.485, color: 0xe2dfd7 },
    // Entrance flap & trim on front (+z)
    { geo: new THREE.BoxGeometry(0.20, 1.95, 0.025), y: 0.98, z: 0.492, color: 0xeae6dc },
    { geo: new THREE.BoxGeometry(0.24, 0.08, 0.035), y: 1.98, z: 0.495, color: 0x2a6950 },
    // Overhanging eaves cornice
    { geo: new THREE.BoxGeometry(1.05, 0.14, 1.05), y: baseH + 0.05, color: 0xeeece6 },
    // Pitched pyramid roof
    { geo: new THREE.ConeGeometry(1 / Math.SQRT2 * 1.05, roofH, 4, 1), y: baseH + 0.10 + roofH / 2, ry: Math.PI / 4, color: 0xfcfbf8, aoBottom: 0.90 },
    // Iconic Mina rooftop square ventilation lantern cupola
    { geo: new THREE.BoxGeometry(0.16, 0.34, 0.16), y: baseH + roofH + 0.02, color: 0xe2dfd7 },
    { geo: new THREE.ConeGeometry(0.14, 0.24, 4, 1), y: baseH + roofH + 0.30, ry: Math.PI / 4, color: 0xffffff },
    // Side desert AC unit box + duct
    { geo: new THREE.BoxGeometry(0.11, 0.58, 0.14), x: 0.52, y: 1.75, z: 0.08, color: 0xd0d4d8 },
    { geo: new THREE.BoxGeometry(0.03, 0.38, 0.10), x: 0.578, y: 1.75, z: 0.08, color: 0x5c636a },
  ]));

  const g1 = keepAlive(mergeParts([
    { geo: new THREE.BoxGeometry(0.99, baseH, 0.99), y: baseH / 2, color: 0xf5f4ee, aoBottom: 0.84 },
    { geo: new THREE.ConeGeometry(1 / Math.SQRT2 * 1.04, roofH, 4, 1), y: baseH + roofH / 2, ry: Math.PI / 4, color: 0xffffff },
    { geo: new THREE.BoxGeometry(0.15, 0.30, 0.15), y: baseH + roofH + 0.05, color: 0xe5e3dc },
  ]));

  // Far clay silhouette (~10 tris per tent!)
  const g2 = keepAlive(mergeParts([
    { geo: new THREE.BoxGeometry(0.99, baseH, 0.99), y: baseH / 2, color: 0xf3f1ea, aoBottom: 0.84 },
    { geo: new THREE.ConeGeometry(1 / Math.SQRT2 * 1.03, roofH, 4, 1), y: baseH + roofH / 2, ry: Math.PI / 4, color: 0xfaf9f5 },
  ]));

  const matStd = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68, vertexColors: true }));
  const matClay = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, vertexColors: true }));
  _tentAssets = { g0, g1, g2, matStd, matClay };
  return _tentAssets;
}

/**
 * White fire-proof Mina-style tents with frustum culling + 3-tier LOD:
 * Close (< 48 m): paneled tent with door flap, eaves, roof lantern & side AC unit.
 * Mid (48–115 m): clean tent + pyramid roof.
 * Far (> 115 m): 10-triangle clay silhouette without shadow casting.
 */
export function tentField(parent: THREE.Object3D, spots: TentSpot[], size = 7, collide = false): Collider[] {
  const { g0, g1, g2, matStd, matClay } = getTentAssets();
  const colliders: Collider[] = [];
  const instances: PropInstance[] = spots.map((s, i) => {
    if (collide) colliders.push(boxCollider(s.x, s.z, size, size));
    return { x: s.x, z: s.z, sx: size, sy: 1, sz: size, yaw: ((i * 7) % 4) * (Math.PI / 2) };
  });
  createPropFieldLOD(
    parent,
    instances,
    [
      { maxDist: 48, layers: [{ geo: g0, mat: matStd, castShadow: true, receiveShadow: true }] },
      { maxDist: 115, layers: [{ geo: g1, mat: matStd, castShadow: false, receiveShadow: true }] },
      { maxDist: 380, layers: [{ geo: g2, mat: matClay, castShadow: false, receiveShadow: false }] },
    ],
    0.85,
    2.4,
  );
  return colliders;
}

/**
 * Open-sided group tent (the player's own camp): three walls, carpet, mattresses with pillows,
 * water cooler, structural posts and a vented pyramid roof.
 */
export function pavilion(parent: THREE.Object3D, o: { x: number; z: number; w: number; d: number; open: 'east' | 'west'; title: string[] }): Collider[] {
  const { x, z, w, d } = o;
  const g = new THREE.Group();
  const wall = mat(0xf4f1ea, 0.72, { side: THREE.DoubleSide });
  const trim = mat(0x2a6950, 0.55);
  const h = 3.2;
  const backX = o.open === 'east' ? x - w / 2 : x + w / 2;
  const frontX = o.open === 'east' ? x + w / 2 : x - w / 2;
  box(g, 0.25, h, d, wall, backX, 0, z);
  box(g, w, h, 0.25, wall, x, 0, z - d / 2);
  box(g, w, h, 0.25, wall, x, 0, z + d / 2);
  // Corner steel posts at the open front
  for (const sz of [-1, 1]) cyl(g, 0.09, 0.09, h, mat(0xd8dce0, 0.4, { metalness: 0.5 }), frontX, 0, z + sz * (d / 2 - 0.12), 10);

  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.6, d - 0.6), mat(0x8e282c, 0.92));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(x, 0.02, z);
  carpet.receiveShadow = true;
  g.add(carpet);

  // Mattresses with white pillows along the back wall + water cooler near front corner
  const matDir = o.open === 'east' ? 1 : -1;
  for (let i = 0; i < 5; i++) {
    const mz = z - d / 2 + 1.5 + i * ((d - 3) / 4);
    const mx = backX + matDir * 1.25;
    box(g, 1.85, 0.14, 0.84, mat(0x3f6e96, 0.85), mx, 0, mz, false);
    box(g, 0.36, 0.10, 0.62, mat(0xf7f6f2, 0.8), backX + matDir * 0.56, 0.14, mz, false);
  }
  // Drinking water dispenser inside camp
  cyl(g, 0.22, 0.24, 0.95, mat(0xf2f2ef, 0.35), frontX - matDir * 1.1, 0, z - d / 2 + 1.1, 12);
  cyl(g, 0.18, 0.18, 0.42, mat(0x7fc4f0, 0.18, { transparent: true, opacity: 0.78 }), frontX - matDir * 1.1, 0.95, z - d / 2 + 1.1, 12);

  // Eaves + green fascia band + pyramid roof + lantern cupola
  box(g, w + 0.45, 0.28, d + 0.45, mat(0xffffff, 0.58), x, h, z);
  box(g, 0.08, 0.18, d + 0.48, trim, frontX + matDir * 0.2, h + 0.05, z, false);
  const roofGeo = new THREE.ConeGeometry(Math.max(w, d) / Math.SQRT2 * 1.03, 2.6, 4, 1);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, mat(0xffffff, 0.58));
  roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
  roof.position.set(x, h + 0.28 + 1.3, z);
  roof.castShadow = true;
  g.add(roof);
  box(g, 1.1, 0.45, 1.1, mat(0xe6e3da, 0.65), x, h + 2.75, z, false);

  const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w, d) * 0.9, 1.3), new THREE.MeshBasicMaterial({ map: textTexture(o.title, 1024, 256, '#11302a', '#f2d06b', o.title.length > 1 ? 84 : 110) }));
  sign.position.set(frontX + (o.open === 'east' ? 0.08 : -0.08), h - 0.2, z);
  sign.rotation.y = o.open === 'east' ? Math.PI / 2 : -Math.PI / 2;
  g.add(sign);
  // A small Thai flag on a pole at the entrance.
  const fx = frontX, fz = z + d / 2 - 0.4;
  box(g, 0.08, 4.6, 0.08, 0xcccccc, fx, 0, fz, false);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), new THREE.MeshBasicMaterial({ map: thaiFlag(), side: THREE.DoubleSide }));
  flag.position.set(fx, 4.2, fz + 0.62);
  flag.rotation.y = Math.PI / 2;
  g.add(flag);
  parent.add(g);
  const t = 0.3;
  return [
    boxCollider(backX, z, t, d),
    boxCollider(x, z - d / 2, w, t),
    boxCollider(x, z + d / 2, w, t),
  ];
}

function thaiFlag(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 64;
  const g = c.getContext('2d')!;
  const bands = ['#a51931', '#f4f5f8', '#2d2a4a', '#2d2a4a', '#f4f5f8', '#a51931'];
  bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, (i * 64) / 6, 96, 64 / 6 + 1); });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Street / flood light poles with tapered base, twin bracket arms and glowing LED heads (instanced). */
export function lampPosts(parent: THREE.Object3D, spots: TentSpot[], h = 9, color = 0xfff1cf) {
  const poleGeo = mergeParts([
    { geo: new THREE.CylinderGeometry(0.22, 0.28, 0.9, 8), y: 0.45, color: 0x676d74 },
    { geo: new THREE.CylinderGeometry(0.10, 0.17, h - 0.8, 8), y: 0.8 + (h - 0.8) / 2, color: 0x8d949c },
    { geo: new THREE.BoxGeometry(1.65, 0.12, 0.14), y: h - 0.08, color: 0x7a8088 },
    { geo: new THREE.BoxGeometry(0.55, 0.14, 0.38), x: -0.65, y: h + 0.02, color: 0x565c63 },
    { geo: new THREE.BoxGeometry(0.55, 0.14, 0.38), x: 0.65, y: h + 0.02, color: 0x565c63 },
  ]);
  const headGeo = mergeParts([
    { geo: new THREE.BoxGeometry(0.48, 0.08, 0.32), x: -0.65, y: h - 0.04, color: 0xffffff },
    { geo: new THREE.BoxGeometry(0.48, 0.08, 0.32), x: 0.65, y: h - 0.04, color: 0xffffff },
  ]);
  const pole = new THREE.InstancedMesh(poleGeo, mat(0xffffff, 0.45, { metalness: 0.45, vertexColors: true }), spots.length);
  const head = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color, vertexColors: true }), spots.length);
  const m4 = new THREE.Matrix4();
  spots.forEach((s, i) => {
    m4.makeTranslation(s.x, 0, s.z);
    pole.setMatrixAt(i, m4);
    head.setMatrixAt(i, m4);
  });
  parent.add(pole, head);
  return { pole, head };
}

let _treeAssets: { g0: THREE.BufferGeometry; g1: THREE.BufferGeometry; g2: THREE.BufferGeometry; matStd: THREE.MeshStandardMaterial; matClay: THREE.MeshStandardMaterial } | null = null;
function getTreeAssets() {
  if (_treeAssets) return _treeAssets;
  //Close (< 40 m): Flared roots, slightly leaning trunk, 3 forked branches & 5 organic Neem foliage domes
  const g0 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.20, 0.34, 0.6, 8), y: 0.3, color: 0x5e402b, aoBottom: 0.72 },
    { geo: new THREE.CylinderGeometry(0.15, 0.22, 1.85, 8), y: 1.45, rz: 0.04, color: 0x6c4b33, aoBottom: 0.84 },
    // 3 spreading branches
    { geo: new THREE.CylinderGeometry(0.07, 0.12, 1.15, 6), x: -0.35, y: 2.45, z: 0.15, rz: 0.58, rx: 0.2, color: 0x65452e },
    { geo: new THREE.CylinderGeometry(0.07, 0.12, 1.15, 6), x: 0.38, y: 2.42, z: -0.18, rz: -0.60, rx: -0.22, color: 0x65452e },
    { geo: new THREE.CylinderGeometry(0.06, 0.10, 1.0, 6), x: 0.08, y: 2.52, z: 0.36, rx: 0.55, color: 0x65452e },
    // 5 overlapping organic leafy sub-crowns with rich under-canopy AO
    { geo: new THREE.IcosahedronGeometry(1.45, 2), x: 0, y: 3.55, z: 0, sx: 1.25, sy: 0.85, sz: 1.25, color: 0x557b37, aoBottom: 0.68 },
    { geo: new THREE.IcosahedronGeometry(1.12, 2), x: -0.95, y: 3.12, z: 0.35, sx: 1.15, sy: 0.78, sz: 1.1, color: 0x4b702f, aoBottom: 0.68 },
    { geo: new THREE.IcosahedronGeometry(1.15, 2), x: 0.92, y: 3.08, z: -0.32, sx: 1.15, sy: 0.80, sz: 1.12, color: 0x5c843c, aoBottom: 0.68 },
    { geo: new THREE.IcosahedronGeometry(1.02, 2), x: 0.18, y: 3.15, z: 0.92, sx: 1.1, sy: 0.76, sz: 1.05, color: 0x517734, aoBottom: 0.68 },
    { geo: new THREE.IcosahedronGeometry(0.98, 2), x: -0.22, y: 3.10, z: -0.88, sx: 1.1, sy: 0.76, sz: 1.05, color: 0x476b2c, aoBottom: 0.68 },
  ]));

  // Mid (40–95 m): Clean trunk + 2-cluster medium canopy
  const g1 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.16, 0.28, 2.5, 6), y: 1.25, color: 0x684830, aoBottom: 0.78 },
    { geo: new THREE.IcosahedronGeometry(1.85, 1), y: 3.25, sx: 1.25, sy: 0.82, sz: 1.25, color: 0x557b36, aoBottom: 0.70 },
  ]));

  // Far (> 95 m): Soft clay silhouette (~22 tris, no shadow)
  const g2 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.16, 0.28, 2.4, 5), y: 1.2, color: 0x684830, aoBottom: 0.78 },
    { geo: new THREE.SphereGeometry(2.15, 7, 5), y: 3.2, sy: 0.72, color: 0x547936, aoBottom: 0.72 },
  ]));

  const matStd = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, vertexColors: true }));
  const matClay = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true }));
  _treeAssets = { g0, g1, g2, matStd, matClay };
  return _treeAssets;
}

/** Neem-like shade trees with frustum culling + 3-tier LOD (detailed multi-crown -> mid -> clay). */
export function treeField(parent: THREE.Object3D, spots: TentSpot[], seed = 3) {
  const r = rng(seed);
  const { g0, g1, g2, matStd, matClay } = getTreeAssets();
  const instances: PropInstance[] = spots.map((t) => {
    const k = 0.8 + r() * 0.68;
    return { x: t.x, z: t.z, sx: k, sy: k, sz: k, yaw: r() * Math.PI * 2 };
  });
  createPropFieldLOD(
    parent,
    instances,
    [
      { maxDist: 40, layers: [{ geo: g0, mat: matStd, castShadow: true, receiveShadow: true }] },
      { maxDist: 95, layers: [{ geo: g1, mat: matStd, castShadow: false, receiveShadow: true }] },
      { maxDist: 360, layers: [{ geo: g2, mat: matClay, castShadow: false, receiveShadow: false }] },
    ],
    2.9,
    2.5,
  );
}

/** Night sky: a dome of stars whose opacity follows the time of day. */
export function starField(count = 900) {
  const r = rng(99);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const e = Math.asin(0.08 + r() * 0.92);
    const R = 900;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * R;
    pos[i * 3 + 1] = Math.sin(e) * R;
    pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * R;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const points = new THREE.Points(geo, m);
  points.frustumCulled = false;
  points.visible = false;
  return {
    points,
    setOpacity(v: number) { m.opacity = v; points.visible = v > 0.01; },
  };
}

export interface Lane {
  /** Walking axis. */
  axis: 'x' | 'z';
  /** Range along the axis. */
  from: number; to: number;
  /** Lateral range across the axis. */
  a: number; b: number;
  /** +1 / -1 one way, 0 = both ways. */
  dir: 1 | -1 | 0;
}

/** Pilgrims walking along lanes (frustum-culled + 3-tier LOD); returns the per-frame tick. */
export function walkers(parent: THREE.Object3D, n: number, lanes: Lane[], palette = [0xf4f2ec, 0xf4f2ec, 0xf4f2ec, 0x2b2b33, 0xf4f2ec, 0x6c7a8a], seed = 11) {
  const r = rng(seed);
  const crowd = crowdMesh(n, palette);
  parent.add(crowd.group);
  const people = Array.from({ length: n }, (_, i) => {
    const lane = lanes[i % lanes.length];
    const dir = lane.dir === 0 ? (r() < 0.5 ? 1 : -1) : lane.dir;
    return { lane, s: lane.from + r() * (lane.to - lane.from), l: lane.a + r() * (lane.b - lane.a), v: (0.9 + r() * 0.7) * dir };
  });
  const tick = (dt: number) => {
    people.forEach((p, i) => {
      const { from, to, axis } = p.lane;
      p.s += p.v * dt;
      const lo = Math.min(from, to), hi = Math.max(from, to);
      if (p.s > hi) p.s = lo; else if (p.s < lo) p.s = hi;
      if (axis === 'x') placeCrowd(crowd, i, p.s, p.l, p.v > 0 ? Math.PI / 2 : -Math.PI / 2, 0, true);
      else placeCrowd(crowd, i, p.l, p.s, p.v > 0 ? 0 : Math.PI, 0, true);
    });
  };
  tick(0);
  return tick;
}

/** Pilgrims standing still in an area (frustum-culled + 3-tier LOD, supports elevation y). */
export function standers(parent: THREE.Object3D, spots: { x: number; y?: number; z: number; yaw?: number }[], palette = [0xf4f2ec, 0xf4f2ec, 0x2b2b33, 0xf4f2ec]) {
  const crowd = crowdMesh(spots.length, palette);
  spots.forEach((s, i) => placeCrowd(crowd, i, s.x, s.z, s.yaw ?? 0, s.y ?? 0, false));
  parent.add(crowd.group);
  return crowd;
}

/** Scatter n points in a rectangle, skipping any inside the `avoid` boxes. */
export function scatter(n: number, minX: number, maxX: number, minZ: number, maxZ: number, seed: number, avoid: { minX: number; maxX: number; minZ: number; maxZ: number }[] = []) {
  const r = rng(seed);
  const out: TentSpot[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const x = minX + r() * (maxX - minX), z = minZ + r() * (maxZ - minZ);
    if (avoid.some((a) => x > a.minX && x < a.maxX && z > a.minZ && z < a.maxZ)) continue;
    out.push({ x, z });
  }
  return out;
}

/** Qibla from Mina, Arafah, Muzdalifah and the Jamarat: Makkah lies to the west (-x). */
export const QIBLA_WEST = -Math.PI / 2;
