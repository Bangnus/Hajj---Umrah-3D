import * as THREE from 'three';
import { getCrowdAssets, SKINS } from './crowdAssets';
import { _col } from './merge';
import { activeSet, flushInstanced, inFrustum, lodStats, type LodUpdatable, writeMatY } from './system';

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
    const cap = Math.max(1, count);
    this.px = new Float32Array(cap);
    this.py = new Float32Array(cap);
    this.pz = new Float32Array(cap);
    this.pyaw = new Float32Array(cap);
    this.sxz = new Float32Array(cap);
    this.sy = new Float32Array(cap);
    this.phase = new Float32Array(cap);
    this.moving = new Uint8Array(cap);
    this.clothRGB = new Float32Array(cap * 3);
    this.skinRGB = new Float32Array(cap * 3);

    const a = getCrowdAssets();
    const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, shadow: boolean) => {
      const im = new THREE.InstancedMesh(geo, mat, cap);
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
    this.c1 = mk(a.cloth1, a.matStd, false);
    this.s1 = mk(a.skin1, a.matStd, false);
    this.c2 = mk(a.cloth2, a.matClay, false);
    this.s2 = mk(a.skin2, a.matClay, false);

    let seed = (count * 2654435761) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

    for (let i = 0; i < count; i++) {
      this.sxz[i] = 0.94 + rnd() * 0.12;
      this.sy[i] = 0.93 + rnd() * 0.13;
      this.phase[i] = rnd() * Math.PI * 2;
      _col.setHex(palette[Math.floor(rnd() * palette.length)] ?? 0xf4f2ec);
      this.clothRGB[i * 3] = _col.r; this.clothRGB[i * 3 + 1] = _col.g; this.clothRGB[i * 3 + 2] = _col.b;
      _col.setHex(SKINS[Math.floor(rnd() * SKINS.length)]);
      this.skinRGB[i * 3] = _col.r; this.skinRGB[i * 3 + 1] = _col.g; this.skinRGB[i * 3 + 2] = _col.b;
    }

    if (count > 0) {
      this.group.add(this.c0, this.s0, this.c1, this.s1, this.c2, this.s2);
      activeSet.add(this);
    }
  }

  place(i: number, x: number, z: number, yaw: number, y = 0, moving = false) {
    if (i < 0 || i >= this.count) return;
    this.px[i] = x; this.py[i] = y; this.pz[i] = z;
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

    const c0M = this.c0.instanceMatrix.array as Float32Array, s0M = this.s0.instanceMatrix.array as Float32Array;
    const c1M = this.c1.instanceMatrix.array as Float32Array, s1M = this.s1.instanceMatrix.array as Float32Array;
    const c2M = this.c2.instanceMatrix.array as Float32Array, s2M = this.s2.instanceMatrix.array as Float32Array;
    const c0C = this.c0.instanceColor!.array as Float32Array, s0C = this.s0.instanceColor!.array as Float32Array;
    const c1C = this.c1.instanceColor!.array as Float32Array, s1C = this.s1.instanceColor!.array as Float32Array;
    const c2C = this.c2.instanceColor!.array as Float32Array, s2C = this.s2.instanceColor!.array as Float32Array;

    let n0 = 0, n1 = 0, n2 = 0;

    for (let i = 0; i < n; i++) {
      const lx = this.px[i], ly = this.py[i], lz = this.pz[i];
      const gx = lx + wx, gy = ly + wy, gz = lz + wz;
      const dx = gx - camX, dy = (gy + 0.9) - camY, dz = gz - camZ;
      const d2 = dx * dx + dy * dy + dz * dz;

      if (d2 > CROWD_MAX_SQ) continue;
      if (d2 > SHADOW_KEEP_SQ && !inFrustum(planes, gx, gy + 0.9, gz, 1.35)) continue;

      const sxz = this.sxz[i], sy = this.sy[i];
      let yaw = this.pyaw[i], yOff = ly;
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

    flushInstanced(this.c0, n0, true); flushInstanced(this.s0, n0, true);
    flushInstanced(this.c1, n1, true); flushInstanced(this.s1, n1, true);
    flushInstanced(this.c2, n2, true); flushInstanced(this.s2, n2, true);

    const vis = n0 + n1 + n2;
    lodStats.visibleInstances += vis;
    lodStats.culledInstances += n - vis;
    lodStats.lod0 += n0; lodStats.lod1 += n1; lodStats.lod2 += n2;
  }
}

export function createCrowdLOD(count: number, palette: number[]): CrowdHandle {
  return new CrowdLODImpl(count, palette);
}

