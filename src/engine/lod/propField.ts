import * as THREE from 'three';
import { _col } from './merge';
import { activeSet, flushInstanced, inFrustum, lodStats, type LodUpdatable, writeMatY } from './system';

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

