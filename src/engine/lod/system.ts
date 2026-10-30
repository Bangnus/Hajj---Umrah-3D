import * as THREE from 'three';

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

export interface LodUpdatable {
  readonly group: THREE.Group;
  update(camX: number, camY: number, camZ: number, planes: readonly THREE.Plane[], time: number): void;
}

export const activeSet = new Set<LodUpdatable>();
const _projScreen = new THREE.Matrix4();
const _frustum = new THREE.Frustum();
let _time = 0;

function isMounted(o: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = o;
  while (cur.parent) cur = cur.parent;
  return (cur as THREE.Scene).isScene === true;
}

export function inFrustum(planes: readonly THREE.Plane[], x: number, y: number, z: number, r: number): boolean {
  for (let i = 0; i < 6; i++) {
    const p = planes[i];
    if (p.normal.x * x + p.normal.y * y + p.normal.z * z + p.constant < -r) return false;
  }
  return true;
}

export function writeMatY(arr: Float32Array, slot: number, tx: number, ty: number, tz: number, yaw: number, sx: number, sy: number, sz: number) {
  const o = slot * 16;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  arr[o] = c * sx;     arr[o + 1] = 0;  arr[o + 2] = -s * sx; arr[o + 3] = 0;
  arr[o + 4] = 0;      arr[o + 5] = sy; arr[o + 6] = 0;       arr[o + 7] = 0;
  arr[o + 8] = s * sz; arr[o + 9] = 0;  arr[o + 10] = c * sz; arr[o + 11] = 0;
  arr[o + 12] = tx;    arr[o + 13] = ty; arr[o + 14] = tz;    arr[o + 15] = 1;
}

export function flushInstanced(im: THREE.InstancedMesh, cnt: number, withColor: boolean) {
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

