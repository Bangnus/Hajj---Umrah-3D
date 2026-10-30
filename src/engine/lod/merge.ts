import * as THREE from 'three';

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
export const _col = new THREE.Color();

/**
 * Merge multiple primitives with transforms and per-part vertex colors (+ vertical AO gradient)
 * into a single indexed BufferGeometry so complex close-up models render in 1 draw call.
 */
export function mergeParts(parts: PartSpec[]): THREE.BufferGeometry {
  const prepared: {
    pos: THREE.BufferAttribute; norm: THREE.BufferAttribute; idx: ArrayLike<number>;
    r: number; g: number; b: number; minY: number; spanY: number; aoB: number; aoT: number; gRef: THREE.BufferGeometry;
  }[] = [];
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
      positions[o] = px; positions[o + 1] = py; positions[o + 2] = pz;
      normals[o] = norm.getX(i); normals[o + 1] = norm.getY(i); normals[o + 2] = norm.getZ(i);
      const t = aoB === 1 && aoT === 1 ? 1 : aoB + (aoT - aoB) * Math.min(1, Math.max(0, (py - minY) / spanY));
      colors[o] = r * t; colors[o + 1] = g * t; colors[o + 2] = b * t;
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

