import * as THREE from 'three';

export type Collider =
  | { kind: 'box'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: 'circle'; x: number; z: number; r: number }
  /** Solid half-disc on the side of z where sign(z - cz) === side. */
  | { kind: 'halfdisc'; x: number; z: number; r: number; side: -1 | 1 }
  | { kind: 'rect-in'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: 'disc-in'; x: number; z: number; r: number };

export type Gender = 'male' | 'female';
export type Pose = 'stand' | 'raise' | 'ruku' | 'sujud' | 'sit' | 'throw';

export interface Look {
  gender: Gender;
  outfit: 'travel' | 'ihram';
  skin: number;
  cloth: number;
  hair: 'normal' | 'shaved' | 'trimmed';
  /** Men in ihram: right shoulder uncovered (during tawaf al-qudum / umrah tawaf). */
  idtiba?: boolean;
}

export interface PlayerRig {
  body: THREE.Group;
  hips: THREE.Group;
  skirtWrap: THREE.Group;
  upper: THREE.Group;
  headGroup: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  shinL: THREE.Group;
  shinR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  forearmL: THREE.Group;
  forearmR: THREE.Group;
}

export interface PartOpts {
  rough?: number;
  metal?: number;
  sx?: number; sy?: number; sz?: number;
  rx?: number; ry?: number; rz?: number;
  side?: THREE.Side;
}

export type AddPartFn = (
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  color: number,
  x?: number, y?: number, z?: number,
  o?: PartOpts,
) => THREE.Mesh;

export const WHITE = 0xf5f3ed;
export const WHITE_SHADE = 0xe9e5dc;

export function shadeHex(hex: number, mul: number): number {
  const c = new THREE.Color(hex);
  c.multiplyScalar(mul);
  return c.getHex();
}

