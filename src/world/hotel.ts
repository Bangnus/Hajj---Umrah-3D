import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { textTexture } from '../engine/label';
import { box, boxCollider, floor, mat, tileTexture, type Scene3D } from './common';
import { tr } from '../i18n';

/**
 * Hotel room in Makkah (16 x 12 m) where a tamattu' pilgrim puts on ihram on day 8.
 * Window on the north wall looks out at the clock tower; the door is on the south wall.
 */
export const HOTEL = {
  start: { x: 0, z: 1 },
  bath: { x: -5.4, z: -3.6 },
  wardrobe: { x: 5.2, z: -3.6 },
  door: { x: 0, z: 5 },
};

export function buildHotel(): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const carpet = tileTexture('#8a6e5a', 'rgba(60,40,30,0.15)', 4);
  carpet.repeat.set(4, 3);
  floor(group, 16, 12, mat(0xffffff, 0.95, { map: carpet }));
  const wall = mat(0xf0e9dc, 0.85);
  box(group, 16, 3.2, 0.2, wall, 0, 0, -6);
  box(group, 0.2, 3.2, 12, wall, -8, 0, 0);
  box(group, 0.2, 3.2, 12, wall, 8, 0, 0);
  box(group, 7, 3.2, 0.2, wall, -4.5, 0, 6);
  box(group, 7, 3.2, 0.2, wall, 4.5, 0, 6);
  box(group, 2, 1, 0.2, wall, 0, 2.2, 6);
  const door = box(group, 1.8, 2.2, 0.08, mat(0x7b5a3c, 0.6), 0, 0, 6.15);
  door.castShadow = false;
  colliders.push({ kind: 'rect-in', minX: -7.9, maxX: 7.9, minZ: -5.9, maxZ: 5.9 });

  // Window with the clock tower outside.
  const view = new THREE.Mesh(new THREE.PlaneGeometry(6, 2), new THREE.MeshBasicMaterial({ map: windowView() }));
  view.position.set(0, 1.8, -5.88);
  group.add(view);

  // Beds, bathroom door, wardrobe, prayer mat.
  for (const x of [-3, 3]) {
    box(group, 2, 0.55, 3.2, mat(0xf4f4f0, 0.8), x, 0, -0.5);
    box(group, 2, 0.9, 0.2, mat(0x6b4a33, 0.7), x, 0, -2.1);
    box(group, 1.2, 0.12, 0.5, mat(0xffffff, 0.8), x, 0.55, -1.6, false);
    colliders.push(boxCollider(x, -0.5, 2, 3.4));
  }
  box(group, 1.6, 2.4, 0.1, mat(0xd9d2c2, 0.6), -5.4, 0, -5.9, false);
  const bath = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshBasicMaterial({ map: textTexture([tr('ห้องน้ำ')], 256, 72, '#11302a', '#ffffff', 44) }));
  bath.position.set(-5.4, 2.6, -5.84);
  group.add(bath);
  box(group, 2.2, 2.4, 0.8, mat(0x8b6a4a, 0.6), 5.2, 0, -5.5);
  colliders.push(boxCollider(5.2, -5.5, 2.2, 0.8));
  const mt = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), mat(0x2f6d5a, 0.9));
  mt.rotation.x = -Math.PI / 2;
  mt.position.set(5.5, 0.02, 2.5);
  group.add(mt);
  // Suitcase and ihram cloth on the wardrobe shelf.
  box(group, 0.8, 0.6, 0.4, mat(0x2f5e8a, 0.5), 6.9, 0, 0.8);
  box(group, 1.2, 0.15, 0.6, mat(0xffffff, 0.8), 5.2, 0.9, -4.9, false);

  const l = new THREE.PointLight(0xfff3e0, 22, 26);
  l.position.set(0, 2.9, 0);
  group.add(l);
  return { group, colliders };
}

function windowView(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 170;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 170);
  grad.addColorStop(0, '#7fb0e0');
  grad.addColorStop(1, '#f2e6cf');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 170);
  g.fillStyle = '#cdbfa8';
  for (let i = 0; i < 12; i++) g.fillRect(i * 44, 110 - (i % 3) * 18, 40, 80);
  g.fillStyle = '#d8cdb8';
  g.fillRect(236, 20, 40, 150);
  g.fillStyle = '#f4f1e8';
  g.beginPath(); g.arc(256, 48, 14, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c9a24a';
  g.beginPath(); g.moveTo(244, 20); g.lineTo(256, 0); g.lineTo(268, 20); g.fill();
  g.strokeStyle = '#6b5a44';
  g.lineWidth = 6;
  g.strokeRect(3, 3, 506, 164);
  g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 170); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
