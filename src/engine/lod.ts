import * as THREE from 'three';

/**
 * Multi-tier Level of Detail (LOD) + per-instance camera Frustum Culling.
 * - Close range (LOD 0): high-detail sculpted multi-part geometry + shadows.
 * - Mid range (LOD 1): clean medium-poly geometry.
 * - Far range (LOD 2): ultra-low-poly matte "clay" (ดินน้ำมัน) silhouette, no shadow casting.
 * - Outside camera frustum or beyond max view distance: 0 instances uploaded / 0 triangles drawn.
 */

export const lodStats = {
  crowds: 0,
  propFields: 0,
  totalInstances: 0,
  visibleInstances: 0,
  culledInstances: 0,
  lod0: 0,
  lod1: 0,
  lod2: 0,
};

export interface PartSpec {
  geo: THREE.BufferGeometry;
  color?: number;
  x?: number; y?: number; z?: number;
  rx?: number; ry?: number; rz?: number;
  sx?: number; sy?: number; sz?: number;
  /** Brightness multiplier at the bottom of this part for natural ambient occlusion (default 1). */
  aoBottom?: number;
  /** Brightness multiplier at the top of this part (default 1). */
  aoTop?: number;
  /** Keep input geometry instead of disposing it after merge. */
  keepGeo?: boolean;
}

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _eu = new THREE.Euler();
const _v3 = new THREE.Vector3();
const _sc = new THREE.Vector3();
const _col = new THREE.Color();

/**
 * Merge multiple primitives with transforms and per-part vertex colors (+ vertical AO gradient)
 * into a single indexed BufferGeometry so complex close-up models render in 1 draw call.
 */
export function mergeParts(parts: PartSpec[]): THREE.BufferGeometry {
  const prepared: { pos: THREE.BufferAttribute; norm: THREE.BufferAttribute; idx: ArrayLike<number>; r: number; g: number; b: number; minY: number; spanY: number; aoB: number; aoT: number; gRef: THREE.BufferGeometry }[] = [];
  let totalVerts = 0;
  let totalIndices = 0;

  for (const p of parts) {
    const g = p.geo.clone();
    if (!p.keepGeo) p.geo.dispose();
    _eu.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0, 'YXZ');
    _q.setFromEuler(_eu);
    _v3.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
    _sc.set(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1);
    _m4.compose(_v3, _q, _sc);
    g.applyMatrix4(_m4);
    if (!g.getAttribute('normal')) g.computeVertexNormals();

    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const norm = g.getAttribute('normal') as THREE.BufferAttribute;
    const vCount = pos.count;
    let idx: ArrayLike<number>;
    if (g.index) {
      idx = g.index.array;
    } else {
      const seq = new Uint32Array(vCount);
      for (let i = 0; i < vCount; i++) seq[i] = i;
      idx = seq;
    }

    let minY = Infinity, maxY = -Infinity;
    const aoB = p.aoBottom ?? 1;
    const aoT = p.aoTop ?? 1;
    if (aoB !== 1 || aoT !== 1) {
      for (let i = 0; i < vCount; i++) {
        const y = pos.getY(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    } else {
      minY = 0; maxY = 1;
    }

    _col.setHex(p.color ?? 0xffffff);
    prepared.push({
      pos, norm, idx,
      r: _col.r, g: _col.g, b: _col.b,
      minY, spanY: Math.max(1e-4, maxY - minY),
      aoB, aoT, gRef: g,
    });
    totalVerts += vCount;
    totalIndices += idx.length;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);
  const indices = totalVerts > 65535 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);

  let vOff = 0;
  let iOff = 0;
  for (const it of prepared) {
    const { pos, norm, idx, r, g, b, minY, spanY, aoB, aoT, gRef } = it;
    const vc = pos.count;
    for (let i = 0; i < vc; i++) {
      const o = (vOff + i) * 3;
      const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
      positions[o] = px;
      positions[o + 1] = py;
      positions[o + 2] = pz;
      normals[o] = norm.getX(i);
      normals[o + 1] = norm.getY(i);
      normals[o + 2] = norm.getZ(i);
      const t = aoB === 1 && aoT === 1 ? 1 : aoB + (aoT - aoB) * Math.min(1, Math.max(0, (py - minY) / spanY));
      colors[o] = r * t;
      colors[o + 1] = g * t;
      colors[o + 2] = b * t;
    }
    for (let i = 0; i < idx.length; i++) indices[iOff + i] = idx[i] + vOff;
    vOff += vc;
    iOff += idx.length;
    gRef.dispose();
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  out.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  out.computeBoundingSphere();
  return out;
}

/** Keep a shared geometry or material alive across stage disposals. */
export function keepAlive<T extends { userData: Record<string, unknown> }>(res: T): T {
  res.userData.keep = true;
  return res;
}

/** Build a Multi-Level THREE.LOD object placed at (x, y, z). */
export function makeLOD(x: number, y: number, z: number, levels: [THREE.Object3D, number][]): THREE.LOD {
  const lod = new THREE.LOD();
  lod.position.set(x, y, z);
  for (const [obj, dist] of levels) lod.addLevel(obj, dist);
  return lod;
}

// ============================================================================
// Frustum Culling & Global LOD Registry
// ============================================================================

interface LodUpdatable {
  readonly group: THREE.Group;
  update(camX: number, camY: number, camZ: number, planes: readonly THREE.Plane[], time: number): void;
}

const activeSet = new Set<LodUpdatable>();
const _projScreen = new THREE.Matrix4();
const _frustum = new THREE.Frustum();
let _time = 0;

function isMounted(o: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = o;
  while (cur.parent) cur = cur.parent;
  return (cur as THREE.Scene).isScene === true;
}

function inFrustum(planes: readonly THREE.Plane[], x: number, y: number, z: number, r: number): boolean {
  for (let i = 0; i < 6; i++) {
    const p = planes[i];
    if (p.normal.x * x + p.normal.y * y + p.normal.z * z + p.constant < -r) return false;
  }
  return true;
}

function writeMatY(arr: Float32Array, slot: number, tx: number, ty: number, tz: number, yaw: number, sx: number, sy: number, sz: number) {
  const o = slot * 16;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  arr[o] = c * sx;     arr[o + 1] = 0;  arr[o + 2] = -s * sx; arr[o + 3] = 0;
  arr[o + 4] = 0;      arr[o + 5] = sy; arr[o + 6] = 0;       arr[o + 7] = 0;
  arr[o + 8] = s * sz; arr[o + 9] = 0;  arr[o + 10] = c * sz; arr[o + 11] = 0;
  arr[o + 12] = tx;    arr[o + 13] = ty; arr[o + 14] = tz;    arr[o + 15] = 1;
}

function flushInstanced(im: THREE.InstancedMesh, cnt: number, withColor: boolean) {
  im.count = cnt;
  im.visible = cnt > 0;
  if (cnt > 0) {
    im.instanceMatrix.clearUpdateRanges();
    im.instanceMatrix.addUpdateRange(0, cnt * 16);
    im.instanceMatrix.needsUpdate = true;
    if (withColor && im.instanceColor) {
      im.instanceColor.clearUpdateRanges();
      im.instanceColor.addUpdateRange(0, cnt * 3);
      im.instanceColor.needsUpdate = true;
    }
  }
}

/**
 * Run per-instance frustum culling & LOD bucketing right before rendering.
 * Must be called after camera pose is updated for the current frame.
 */
export function updateLodSystem(camera: THREE.PerspectiveCamera, dt: number) {
  _time += dt;
  camera.updateMatrixWorld();
  _projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  _frustum.setFromProjectionMatrix(_projScreen);
  const camEl = camera.matrixWorld.elements;
  const cx = camEl[12], cy = camEl[13], cz = camEl[14];
  const planes = _frustum.planes;

  lodStats.crowds = 0;
  lodStats.propFields = 0;
  lodStats.totalInstances = 0;
  lodStats.visibleInstances = 0;
  lodStats.culledInstances = 0;
  lodStats.lod0 = 0;
  lodStats.lod1 = 0;
  lodStats.lod2 = 0;

  for (const item of activeSet) {
    if (!item.group.parent) {
      activeSet.delete(item);
      continue;
    }
    if (!item.group.visible || !isMounted(item.group)) continue;
    item.group.updateWorldMatrix(true, false);
    item.update(cx, cy, cz, planes, _time);
  }
}

// ============================================================================
// 3-Tier Crowd Pilgrim System (Sculpted Close -> Smooth Mid -> Soft Clay Far)
// ============================================================================

interface CrowdAssets {
  cloth0: THREE.BufferGeometry;
  skin0: THREE.BufferGeometry;
  cloth1: THREE.BufferGeometry;
  skin1: THREE.BufferGeometry;
  cloth2: THREE.BufferGeometry;
  skin2: THREE.BufferGeometry;
  matStd: THREE.MeshStandardMaterial;
  matClay: THREE.MeshStandardMaterial;
}

let _crowdAssets: CrowdAssets | null = null;

function getCrowdAssets(): CrowdAssets {
  if (_crowdAssets) return _crowdAssets;

  // LOD 0 (< 18 m): Sculpted pilgrim with draped garment pleats, chest/shoulder anatomy, sleeves, head, hair, eyes & sandals.
  const cloth0 = keepAlive(mergeParts([
    // Lower draped garment (izar / gown) with natural hem ambient occlusion
    { geo: new THREE.CylinderGeometry(0.185, 0.25, 0.84, 14), y: 0.45, sx: 1.04, sz: 0.94, color: 0xffffff, aoBottom: 0.78, aoTop: 0.98 },
    // Front & back subtle fabric pleat folds
    { geo: new THREE.CylinderGeometry(0.032, 0.048, 0.78, 6), x: -0.05, y: 0.44, z: 0.19, color: 0xf4f4f4, aoBottom: 0.74 },
    { geo: new THREE.CylinderGeometry(0.028, 0.042, 0.76, 6), x: 0.06, y: 0.44, z: 0.185, color: 0xededed, aoBottom: 0.74 },
    { geo: new THREE.CylinderGeometry(0.035, 0.05, 0.78, 6), x: 0.02, y: 0.44, z: -0.19, color: 0xefefef, aoBottom: 0.74 },
    // Waist belt / sash crease
    { geo: new THREE.CylinderGeometry(0.194, 0.198, 0.065, 12), y: 0.87, sx: 1.05, sz: 0.92, color: 0xe6e4de },
    // Anatomically proportioned chest torso (broader across X than Z)
    { geo: new THREE.CylinderGeometry(0.205, 0.185, 0.48, 14), y: 1.12, sx: 1.12, sz: 0.84, color: 0xffffff, aoBottom: 0.9 },
    // Rounded shoulder shawl / drape bridging torso and sleeves seamlessly
    { geo: new THREE.SphereGeometry(0.205, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), y: 1.35, sx: 1.12, sy: 0.42, sz: 0.84, color: 0xfafafa },
    // Curved diagonal shawl fold across chest & back (zero boxy corners)
    { geo: new THREE.CylinderGeometry(0.21, 0.202, 0.22, 14), x: 0.015, y: 1.15, rz: -0.28, sx: 1.08, sz: 0.86, color: 0xf3f3f3 },
    // Left & right deltoid caps + sleeves (upper + slightly forward forearm)
    { geo: new THREE.SphereGeometry(0.062, 8, 6), x: -0.232, y: 1.33, color: 0xfcfcfc },
    { geo: new THREE.CylinderGeometry(0.062, 0.054, 0.28, 8), x: -0.242, y: 1.19, rz: 0.07, rx: -0.05, color: 0xfcfcfc },
    { geo: new THREE.CylinderGeometry(0.052, 0.044, 0.25, 8), x: -0.256, y: 0.95, z: 0.03, rx: -0.18, color: 0xf7f7f7, aoBottom: 0.88 },
    { geo: new THREE.SphereGeometry(0.062, 8, 6), x: 0.232, y: 1.33, color: 0xfcfcfc },
    { geo: new THREE.CylinderGeometry(0.062, 0.054, 0.28, 8), x: 0.242, y: 1.19, rz: -0.07, rx: -0.05, color: 0xfcfcfc },
    { geo: new THREE.CylinderGeometry(0.052, 0.044, 0.25, 8), x: 0.256, y: 0.95, z: 0.03, rx: -0.18, color: 0xf7f7f7, aoBottom: 0.88 },
  ]));

  const skin0 = keepAlive(mergeParts([
    // Neck
    { geo: new THREE.CylinderGeometry(0.056, 0.066, 0.12, 8), y: 1.40, color: 0xffffff, aoBottom: 0.85 },
    // Sculpted cranium + tapered jaw
    { geo: new THREE.SphereGeometry(0.132, 14, 12), y: 1.545, sx: 0.94, sy: 1.08, sz: 0.98, color: 0xffffff, aoBottom: 0.9 },
    // Nose bridge (+z is forward)
    { geo: new THREE.ConeGeometry(0.022, 0.055, 5), y: 1.535, z: 0.132, rx: Math.PI * 0.42, color: 0xf7f0eb },
    // Ears
    { geo: new THREE.SphereGeometry(0.028, 6, 5), x: -0.124, y: 1.535, z: -0.01, sx: 0.45, sy: 1.1, sz: 0.75, color: 0xf5ebe4 },
    { geo: new THREE.SphereGeometry(0.028, 6, 5), x: 0.124, y: 1.535, z: -0.01, sx: 0.45, sy: 1.1, sz: 0.75, color: 0xf5ebe4 },
    // Dark hair cap on crown & nape (tinted dark via vertex color * skin instanceColor)
    { geo: new THREE.SphereGeometry(0.137, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56), y: 1.555, z: -0.012, rx: -0.22, sx: 0.95, sy: 1.06, sz: 1.0, color: 0x241b16 },
    // Subtle eyes
    { geo: new THREE.SphereGeometry(0.014, 5, 4), x: -0.044, y: 1.555, z: 0.118, color: 0x1c1512 },
    { geo: new THREE.SphereGeometry(0.014, 5, 4), x: 0.044, y: 1.555, z: 0.118, color: 0x1c1512 },
    // Hands
    { geo: new THREE.SphereGeometry(0.044, 7, 6), x: -0.262, y: 0.81, z: 0.055, sx: 0.75, sy: 1.15, sz: 0.9, color: 0xffffff },
    { geo: new THREE.SphereGeometry(0.044, 7, 6), x: 0.262, y: 0.81, z: 0.055, sx: 0.75, sy: 1.15, sz: 0.9, color: 0xffffff },
    // Feet / sandals peeking beneath hem
    { geo: new THREE.BoxGeometry(0.095, 0.038, 0.21), x: -0.095, y: 0.02, z: 0.035, color: 0x2d2119 },
    { geo: new THREE.BoxGeometry(0.095, 0.038, 0.21), x: 0.095, y: 0.02, z: 0.035, color: 0x2d2119 },
  ]));

  // LOD 1 (18 m – 48 m): Clean medium-poly silhouette.
  const cloth1 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.18, 0.25, 0.86, 10), y: 0.44, sx: 1.04, sz: 0.92, color: 0xffffff, aoBottom: 0.8 },
    { geo: new THREE.CylinderGeometry(0.22, 0.18, 0.50, 10), y: 1.12, sx: 1.14, sz: 0.84, color: 0xffffff },
    { geo: new THREE.SphereGeometry(0.24, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), y: 1.24, sx: 1.18, sy: 0.55, sz: 0.84, color: 0xf8f8f8 },
  ]));
  const skin1 = keepAlive(mergeParts([
    { geo: new THREE.SphereGeometry(0.132, 9, 7), y: 1.54, sx: 0.95, sy: 1.08, sz: 0.98, color: 0xffffff },
    { geo: new THREE.SphereGeometry(0.136, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), y: 1.56, z: -0.01, rx: -0.2, color: 0x261d17 },
  ]));

  // LOD 2 (> 48 m): Soft "playdough / clay" (ดินน้ำมัน) low-poly organic silhouette (~28 tris total!).
  const cloth2 = keepAlive(mergeParts([
    { geo: new THREE.CylinderGeometry(0.17, 0.26, 1.34, 6), y: 0.68, sx: 1.08, sz: 0.92, color: 0xffffff, aoBottom: 0.82 },
  ]));
  const skin2 = keepAlive(mergeParts([
    { geo: new THREE.SphereGeometry(0.14, 6, 4), y: 1.52, sy: 1.08, color: 0xffffff },
  ]));

  const matStd = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, vertexColors: true }));
  const matClay = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, metalness: 0.0, vertexColors: true }));

  _crowdAssets = { cloth0, skin0, cloth1, skin1, cloth2, skin2, matStd, matClay };
  return _crowdAssets;
}

const SKINS = [0xd4a37d, 0x966344, 0xe4bb98, 0x67422c, 0xba835c, 0xc8966e];

export interface CrowdHandle {
  readonly group: THREE.Group;
  readonly count: number;
  place(i: number, x: number, z: number, yaw: number, y?: number, moving?: boolean): void;
}

const CROWD_D0_SQ = 18 * 18;
const CROWD_D1_SQ = 48 * 48;
const CROWD_MAX_SQ = 270 * 270;
const SHADOW_KEEP_SQ = 5.5 * 5.5;

class CrowdLODImpl implements CrowdHandle, LodUpdatable {
  readonly group = new THREE.Group();
  readonly count: number;

  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly pz: Float32Array;
  private readonly pyaw: Float32Array;
  private readonly sxz: Float32Array;
  private readonly sy: Float32Array;
  private readonly phase: Float32Array;
  private readonly moving: Uint8Array;
  private readonly clothRGB: Float32Array;
  private readonly skinRGB: Float32Array;

  private readonly c0: THREE.InstancedMesh;
  private readonly s0: THREE.InstancedMesh;
  private readonly c1: THREE.InstancedMesh;
  private readonly s1: THREE.InstancedMesh;
  private readonly c2: THREE.InstancedMesh;
  private readonly s2: THREE.InstancedMesh;

  constructor(count: number, palette: number[]) {
    this.count = count;
    this.px = new Float32Array(count);
    this.py = new Float32Array(count);
    this.pz = new Float32Array(count);
    this.pyaw = new Float32Array(count);
    this.sxz = new Float32Array(count);
    this.sy = new Float32Array(count);
    this.phase = new Float32Array(count);
    this.moving = new Uint8Array(count);
    this.clothRGB = new Float32Array(count * 3);
    this.skinRGB = new Float32Array(count * 3);

    const a = getCrowdAssets();
    const mk = (geo: THREE.BufferGeometry, m: THREE.Material, shadow: boolean) => {
      const im = new THREE.InstancedMesh(geo, m, Math.max(1, count));
      im.castShadow = shadow;
      im.receiveShadow = shadow;
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.setColorAt(0, _col.setHex(0xffffff));
      im.instanceColor!.setUsage(THREE.DynamicDrawUsage);
      im.count = 0;
      im.visible = false;
      return im;
    };

    this.c0 = mk(a.cloth0, a.matStd, true);
    this.s0 = mk(a.skin0, a.matStd, true);
    this.c1 = mk(a.cloth1, a.matStd, true);
    this.s1 = mk(a.skin1, a.matStd, false);
    this.c2 = mk(a.cloth2, a.matClay, false);
    this.s2 = mk(a.skin2, a.matClay, false);

    for (let i = 0; i < count; i++) {
      const h1 = ((i * 2654435761) >>> 0) / 4294967296;
      const h2 = (((i + 37) * 2246822519) >>> 0) / 4294967296;
      this.sxz[i] = 0.94 + h1 * 0.13;
      this.sy[i] = 0.93 + h2 * 0.13;
      this.phase[i] = h1 * Math.PI * 2;

      _col.setHex(palette[i % palette.length]);
      this.clothRGB[i * 3] = _col.r;
      this.clothRGB[i * 3 + 1] = _col.g;
      this.clothRGB[i * 3 + 2] = _col.b;

      _col.setHex(SKINS[(i * 7 + 3) % SKINS.length]);
      this.skinRGB[i * 3] = _col.r;
      this.skinRGB[i * 3 + 1] = _col.g;
      this.skinRGB[i * 3 + 2] = _col.b;
    }

    if (count > 0) {
      this.group.add(this.c0, this.s0, this.c1, this.s1, this.c2, this.s2);
      activeSet.add(this);
    }
  }

  place(i: number, x: number, z: number, yaw: number, y = 0, moving = false) {
    if (i < 0 || i >= this.count) return;
    this.px[i] = x;
    this.py[i] = y;
    this.pz[i] = z;
    this.pyaw[i] = yaw;
    this.moving[i] = moving ? 1 : 0;
  }

  update(camX: number, camY: number, camZ: number, planes: readonly THREE.Plane[], time: number) {
    const n = this.count;
    if (n === 0) return;
    lodStats.crowds++;
    lodStats.totalInstances += n;

    const mw = this.group.matrixWorld.elements;
    const wx = mw[12], wy = mw[13], wz = mw[14];

    const c0M = this.c0.instanceMatrix.array as Float32Array;
    const s0M = this.s0.instanceMatrix.array as Float32Array;
    const c1M = this.c1.instanceMatrix.array as Float32Array;
    const s1M = this.s1.instanceMatrix.array as Float32Array;
    const c2M = this.c2.instanceMatrix.array as Float32Array;
    const s2M = this.s2.instanceMatrix.array as Float32Array;

    const c0C = this.c0.instanceColor!.array as Float32Array;
    const s0C = this.s0.instanceColor!.array as Float32Array;
    const c1C = this.c1.instanceColor!.array as Float32Array;
    const s1C = this.s1.instanceColor!.array as Float32Array;
    const c2C = this.c2.instanceColor!.array as Float32Array;
    const s2C = this.s2.instanceColor!.array as Float32Array;

    let n0 = 0, n1 = 0, n2 = 0;

    for (let i = 0; i < n; i++) {
      const lx = this.px[i], ly = this.py[i], lz = this.pz[i];
      const gx = lx + wx, gy = ly + wy, gz = lz + wz;
      const dx = gx - camX, dy = (gy + 0.9) - camY, dz = gz - camZ;
      const d2 = dx * dx + dy * dy + dz * dz;

      if (d2 > CROWD_MAX_SQ) continue;
      if (d2 > SHADOW_KEEP_SQ && !inFrustum(planes, gx, gy + 0.9, gz, 1.35)) continue;

      const sxz = this.sxz[i], sy = this.sy[i];
      let yaw = this.pyaw[i];
      let yOff = ly;
      const ci = i * 3;
      const cr = this.clothRGB[ci], cg = this.clothRGB[ci + 1], cb = this.clothRGB[ci + 2];
      const sr = this.skinRGB[ci], sg = this.skinRGB[ci + 1], sb = this.skinRGB[ci + 2];

      if (d2 < CROWD_D0_SQ) {
        if (this.moving[i]) {
          const ph = this.phase[i] + time * 5.6;
          yOff += Math.abs(Math.sin(ph)) * 0.032;
          yaw += Math.sin(ph) * 0.045;
        }
        writeMatY(c0M, n0, lx, yOff, lz, yaw, sxz, sy, sxz);
        writeMatY(s0M, n0, lx, yOff, lz, yaw, sxz, sy, sxz);
        const co = n0 * 3;
        c0C[co] = cr; c0C[co + 1] = cg; c0C[co + 2] = cb;
        s0C[co] = sr; s0C[co + 1] = sg; s0C[co + 2] = sb;
        n0++;
      } else if (d2 < CROWD_D1_SQ) {
        writeMatY(c1M, n1, lx, yOff, lz, yaw, sxz, sy, sxz);
        writeMatY(s1M, n1, lx, yOff, lz, yaw, sxz, sy, sxz);
        const co = n1 * 3;
        c1C[co] = cr; c1C[co + 1] = cg; c1C[co + 2] = cb;
        s1C[co] = sr; s1C[co + 1] = sg; s1C[co + 2] = sb;
        n1++;
      } else {
        writeMatY(c2M, n2, lx, yOff, lz, yaw, sxz, sy, sxz);
        writeMatY(s2M, n2, lx, yOff, lz, yaw, sxz, sy, sxz);
        const co = n2 * 3;
        c2C[co] = cr; c2C[co + 1] = cg; c2C[co + 2] = cb;
        s2C[co] = sr; s2C[co + 1] = sg; s2C[co + 2] = sb;
        n2++;
      }
    }

    flushInstanced(this.c0, n0, true);
    flushInstanced(this.s0, n0, true);
    flushInstanced(this.c1, n1, true);
    flushInstanced(this.s1, n1, true);
    flushInstanced(this.c2, n2, true);
    flushInstanced(this.s2, n2, true);

    const vis = n0 + n1 + n2;
    lodStats.visibleInstances += vis;
    lodStats.culledInstances += n - vis;
    lodStats.lod0 += n0;
    lodStats.lod1 += n1;
    lodStats.lod2 += n2;
  }
}

export function createCrowdLOD(count: number, palette: number[]): CrowdHandle {
  return new CrowdLODImpl(count, palette);
}

// ============================================================================
// Multi-Tier Frustum-Culled Prop Field (Tents, Trees, Resting Mats, etc.)
// ============================================================================

export interface PropTierLayer {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Multiply instance color onto this layer (e.g. colored mats). */
  useColor?: boolean;
}

export interface PropTierSpec {
  /** Max camera distance for this tier (the last tier acts as the max view distance before culling). */
  maxDist: number;
  layers: PropTierLayer[];
}

export interface PropInstance {
  x: number;
  y?: number;
  z: number;
  yaw?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  color?: number;
}

class PropFieldLODImpl implements LodUpdatable {
  readonly group = new THREE.Group();
  private readonly count: number;
  private readonly radius: number;
  private readonly centerY: number;
  private readonly shadowKeepSq: number;
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly pz: Float32Array;
  private readonly pyaw: Float32Array;
  private readonly psx: Float32Array;
  private readonly psy: Float32Array;
  private readonly psz: Float32Array;
  private readonly prgb: Float32Array;
  private readonly tiers: { maxSq: number; meshes: { im: THREE.InstancedMesh; useColor: boolean }[] }[];

  constructor(instances: PropInstance[], tiers: PropTierSpec[], radius: number, centerY = 1.5) {
    const n = instances.length;
    this.count = n;
    this.radius = radius;
    this.centerY = centerY;
    this.shadowKeepSq = (radius + 5) * (radius + 5);

    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.pz = new Float32Array(n);
    this.pyaw = new Float32Array(n);
    this.psx = new Float32Array(n);
    this.psy = new Float32Array(n);
    this.psz = new Float32Array(n);
    this.prgb = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      const it = instances[i];
      this.px[i] = it.x;
      this.py[i] = it.y ?? 0;
      this.pz[i] = it.z;
      this.pyaw[i] = it.yaw ?? 0;
      this.psx[i] = it.sx ?? 1;
      this.psy[i] = it.sy ?? 1;
      this.psz[i] = it.sz ?? 1;
      _col.setHex(it.color ?? 0xffffff);
      this.prgb[i * 3] = _col.r;
      this.prgb[i * 3 + 1] = _col.g;
      this.prgb[i * 3 + 2] = _col.b;
    }

    this.tiers = tiers.map((t) => ({
      maxSq: t.maxDist * t.maxDist,
      meshes: t.layers.map((l) => {
        const im = new THREE.InstancedMesh(l.geo, l.mat, Math.max(1, n));
        im.castShadow = !!l.castShadow;
        im.receiveShadow = l.receiveShadow ?? true;
        im.frustumCulled = false;
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        if (l.useColor) {
          im.setColorAt(0, _col.setHex(0xffffff));
          im.instanceColor!.setUsage(THREE.DynamicDrawUsage);
        }
        im.count = 0;
        im.visible = false;
        if (n > 0) this.group.add(im);
        return { im, useColor: !!l.useColor };
      }),
    }));

    if (n > 0) activeSet.add(this);
  }

  update(camX: number, camY: number, camZ: number, planes: readonly THREE.Plane[]) {
    const n = this.count;
    if (n === 0) return;
    lodStats.propFields++;
    lodStats.totalInstances += n;

    const mw = this.group.matrixWorld.elements;
    const wx = mw[12], wy = mw[13], wz = mw[14];
    const tLen = this.tiers.length;
    const maxAllSq = this.tiers[tLen - 1].maxSq;
    const counts = new Int32Array(tLen);

    for (let i = 0; i < n; i++) {
      const lx = this.px[i], ly = this.py[i], lz = this.pz[i];
      const gx = lx + wx, gy = ly + wy, gz = lz + wz;
      const sy = this.psy[i];
      const dx = gx - camX, dy = (gy + this.centerY * sy) - camY, dz = gz - camZ;
      const d2 = dx * dx + dy * dy + dz * dz;

      if (d2 > maxAllSq) continue;
      const rScaled = this.radius * Math.max(this.psx[i], sy, this.psz[i]);
      if (d2 > this.shadowKeepSq && !inFrustum(planes, gx, gy + this.centerY * sy, gz, rScaled)) continue;

      let ti = tLen - 1;
      for (let k = 0; k < tLen - 1; k++) {
        if (d2 < this.tiers[k].maxSq) { ti = k; break; }
      }

      const slot = counts[ti]++;
      const yaw = this.pyaw[i], sx = this.psx[i], sz = this.psz[i];
      const ci = i * 3;
      const cr = this.prgb[ci], cg = this.prgb[ci + 1], cb = this.prgb[ci + 2];

      const meshes = this.tiers[ti].meshes;
      for (let m = 0; m < meshes.length; m++) {
        const entry = meshes[m];
        writeMatY(entry.im.instanceMatrix.array as Float32Array, slot, lx, ly, lz, yaw, sx, sy, sz);
        if (entry.useColor && entry.im.instanceColor) {
          const ca = entry.im.instanceColor.array as Float32Array;
          const co = slot * 3;
          ca[co] = cr; ca[co + 1] = cg; ca[co + 2] = cb;
        }
      }
    }

    let vis = 0;
    for (let k = 0; k < tLen; k++) {
      const c = counts[k];
      vis += c;
      if (k === 0) lodStats.lod0 += c;
      else if (k === 1) lodStats.lod1 += c;
      else lodStats.lod2 += c;
      for (const entry of this.tiers[k].meshes) flushInstanced(entry.im, c, entry.useColor);
    }
    lodStats.visibleInstances += vis;
    lodStats.culledInstances += n - vis;
  }
}

export function createPropFieldLOD(parent: THREE.Object3D, instances: PropInstance[], tiers: PropTierSpec[], radius: number, centerY = 1.5): THREE.Group {
  const field = new PropFieldLODImpl(instances, tiers, radius, centerY);
  parent.add(field.group);
  return field.group;
}
