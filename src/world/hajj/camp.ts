import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { makeLabel, textTexture } from '../../engine/label';
import { mergeParts } from '../../engine/lod';
import { box, boxCollider, cyl, mat } from '../common';
import type { TentSpot } from './tents';

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
