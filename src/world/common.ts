import * as THREE from 'three';
import type { Collider } from '../engine/player';

export interface Scene3D {
  group: THREE.Group;
  colliders: Collider[];
  /** Per-frame animation (crowds, lights). */
  tick?: (dt: number) => void;
}

export function mat(color: number, rough = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
}

export function box(parent: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material | number, x = 0, y = 0, z = 0, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'number' ? mat(m) : m);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cyl(parent: THREE.Object3D, rt: number, rb: number, h: number, m: THREE.Material | number, x = 0, y = 0, z = 0, seg = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof m === 'number' ? mat(m) : m);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Solid box collider matching an axis-aligned footprint. */
export function boxCollider(x: number, z: number, w: number, d: number, pad = 0): Collider {
  return { kind: 'box', minX: x - w / 2 - pad, maxX: x + w / 2 + pad, minZ: z - d / 2 - pad, maxZ: z + d / 2 + pad };
}

export function floor(parent: THREE.Object3D, w: number, d: number, m: THREE.Material, x = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Procedural marble/tile texture. */
export function tileTexture(base: string, line: string, tiles = 8, size = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  // Soft veins.
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(150,150,160,${Math.random() * 0.06})`;
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    g.moveTo(Math.random() * size, Math.random() * size);
    g.bezierCurveTo(Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size);
    g.stroke();
  }
  g.strokeStyle = line;
  g.lineWidth = 2;
  const s = size / tiles;
  for (let i = 0; i <= tiles; i++) {
    g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, size); g.stroke();
    g.beginPath(); g.moveTo(0, i * s); g.lineTo(size, i * s); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** A simple instanced crowd of pilgrims (capsules with heads). */
export function crowdMesh(count: number, palette: number[]): { body: THREE.InstancedMesh; head: THREE.InstancedMesh } {
  const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 1.0, 4, 8), mat(0xffffff, 0.85), count);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 10, 8), mat(0xffffff, 0.8), count);
  const col = new THREE.Color();
  const skins = [0xc99a74, 0x8d5a3b, 0xe2b896, 0x5b3a26, 0xb07a55];
  for (let i = 0; i < count; i++) {
    body.setColorAt(i, col.setHex(palette[i % palette.length]));
    head.setColorAt(i, col.setHex(skins[(i * 7) % skins.length]));
  }
  body.castShadow = true;
  return { body, head };
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export function placeCrowd(c: { body: THREE.InstancedMesh; head: THREE.InstancedMesh }, i: number, x: number, z: number, yaw: number) {
  _q.setFromAxisAngle(_up, yaw);
  _m.compose(_p.set(x, 0.72, z), _q, _s);
  c.body.setMatrixAt(i, _m);
  _m.compose(_p.set(x, 1.5, z), _q, _s);
  c.head.setMatrixAt(i, _m);
}
