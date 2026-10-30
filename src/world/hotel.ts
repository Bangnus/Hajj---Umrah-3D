import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { textTexture } from '../engine/label';
import { mergeParts } from '../engine/lod';
import { box, boxCollider, floor, mat, tileTexture, type Scene3D } from './common';
import { carpetTexture } from './props';
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
  const carpet = tileTexture('#947862', 'rgba(65,45,32,0.14)', 4);
  carpet.repeat.set(4, 3);
  floor(group, 16, 12, mat(0xffffff, 0.92, { map: carpet }));
  const wall = mat(0xf2ecdf, 0.84);
  box(group, 16, 3.2, 0.2, wall, 0, 0, -6);
  box(group, 0.2, 3.2, 12, wall, -8, 0, 0);
  box(group, 0.2, 3.2, 12, wall, 8, 0, 0);
  box(group, 7, 3.2, 0.2, wall, -4.5, 0, 6);
  box(group, 7, 3.2, 0.2, wall, 4.5, 0, 6);
  box(group, 2, 1, 0.2, wall, 0, 2.2, 6);
  const door = box(group, 1.8, 2.2, 0.08, mat(0x704e32, 0.55), 0, 0, 6.15);
  door.castShadow = false;
  colliders.push({ kind: 'rect-in', minX: -7.9, maxX: 7.9, minZ: -5.9, maxZ: 5.9 });

  // Window overlooking the Makkah Clock Tower + side curtains & wooden sill.
  const view = new THREE.Mesh(new THREE.PlaneGeometry(6, 2), new THREE.MeshBasicMaterial({ map: windowView() }));
  view.position.set(0, 1.8, -5.88);
  group.add(view);
  box(group, 6.4, 0.08, 0.22, mat(0x6b4c32, 0.6), 0, 0.76, -5.84, false);
  for (const s of [-1, 1]) box(group, 0.55, 2.35, 0.14, mat(0xcfc2ac, 0.88), s * 3.18, 0.68, -5.82, false);

  // Detailed beds (headboard, mattress, emerald runner blanket, plump pillows), nightstand, bathroom door & paneled wardrobe.
  const roomProps = new THREE.Mesh(
    mergeParts([
      ...([-3, 3] as const).flatMap((bx) => [
        // Wooden bed frame + headboard
        { geo: new THREE.BoxGeometry(2.04, 0.26, 3.24), x: bx, y: 0.13, z: -0.5, color: 0x63432c, aoBottom: 0.8 },
        { geo: new THREE.BoxGeometry(2.08, 1.08, 0.16), x: bx, y: 0.54, z: -2.12, color: 0x6b4931 },
        // Crisp white hotel mattress + emerald foot runner + two pillows
        { geo: new THREE.BoxGeometry(1.94, 0.30, 3.08), x: bx, y: 0.41, z: -0.46, color: 0xf7f6f2 },
        { geo: new THREE.BoxGeometry(1.98, 0.31, 0.78), x: bx, y: 0.415, z: 0.62, color: 0x1e5c45 },
        { geo: new THREE.BoxGeometry(0.74, 0.13, 0.46), x: bx - 0.46, y: 0.61, z: -1.68, rx: 0.12, color: 0xffffff },
        { geo: new THREE.BoxGeometry(0.74, 0.13, 0.46), x: bx + 0.46, y: 0.61, z: -1.68, rx: 0.12, color: 0xffffff },
      ]),
      // Center nightstand + warm bedside lamp shade
      { geo: new THREE.BoxGeometry(0.68, 0.56, 0.54), x: 0, y: 0.28, z: -1.85, color: 0x6b4931, aoBottom: 0.8 },
      { geo: new THREE.CylinderGeometry(0.06, 0.10, 0.22, 10), x: 0, y: 0.67, z: -1.85, color: 0xd6b25a },
      { geo: new THREE.CylinderGeometry(0.14, 0.20, 0.24, 12), x: 0, y: 0.88, z: -1.85, color: 0xfff3d6 },
      // Bathroom door + frame at (-5.4, 0, -5.9)
      { geo: new THREE.BoxGeometry(1.6, 2.4, 0.08), x: -5.4, y: 1.2, z: -5.88, color: 0xdfd8c8 },
      { geo: new THREE.SphereGeometry(0.04, 8, 6), x: -4.78, y: 1.05, z: -5.81, color: 0xc9a24a },
      // Paneled wooden wardrobe with brass handles + folded ihram towels on shelf
      { geo: new THREE.BoxGeometry(2.2, 2.42, 0.82), x: 5.2, y: 1.21, z: -5.5, color: 0x826040, aoBottom: 0.82 },
      { geo: new THREE.BoxGeometry(0.98, 2.16, 0.04), x: 4.66, y: 1.22, z: -5.08, color: 0x8f6b49 },
      { geo: new THREE.BoxGeometry(0.98, 2.16, 0.04), x: 5.74, y: 1.22, z: -5.08, color: 0x8f6b49 },
      { geo: new THREE.BoxGeometry(0.03, 0.24, 0.04), x: 5.10, y: 1.22, z: -5.04, color: 0xd6b25a },
      { geo: new THREE.BoxGeometry(0.03, 0.24, 0.04), x: 5.30, y: 1.22, z: -5.04, color: 0xd6b25a },
      { geo: new THREE.BoxGeometry(1.1, 0.16, 0.56), x: 5.2, y: 0.98, z: -4.85, color: 0xf8f7f3 },
      // Pilgrim suitcase by the wall
      { geo: new THREE.BoxGeometry(0.8, 0.62, 0.4), x: 6.9, y: 0.31, z: 0.8, color: 0x29547d, aoBottom: 0.82 },
    ]),
    mat(0xffffff, 0.68, { vertexColors: true }),
  );
  roomProps.castShadow = roomProps.receiveShadow = true;
  group.add(roomProps);
  colliders.push(boxCollider(-3, -0.5, 2, 3.4), boxCollider(3, -0.5, 2, 3.4), boxCollider(5.2, -5.5, 2.2, 0.8));

  const bath = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), new THREE.MeshBasicMaterial({ map: textTexture([tr('ห้องน้ำ')], 256, 72, '#11302a', '#ffffff', 44) }));
  bath.position.set(-5.4, 2.6, -5.84);
  group.add(bath);

  // Prayer rug with mihrab motif oriented toward Qibla
  const rugTex = carpetTexture('#1f664c', '#2d7f60', 'rgba(240,218,145,0.55)');
  const mt = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.65), mat(0xffffff, 0.9, { map: rugTex }));
  mt.rotation.x = -Math.PI / 2;
  mt.position.set(5.5, 0.02, 2.5);
  group.add(mt);

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
  grad.addColorStop(0, '#72a7dc');
  grad.addColorStop(1, '#f3e5cc');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 170);
  g.fillStyle = '#cbbca3';
  for (let i = 0; i < 12; i++) g.fillRect(i * 44, 110 - (i % 3) * 18, 40, 80);
  // Abraj Al Bait tower silhouette + green clock bezel + golden spire
  g.fillStyle = '#dfd4c0';
  g.fillRect(234, 22, 44, 148);
  g.fillStyle = '#1b5941';
  g.fillRect(236, 32, 40, 34);
  g.fillStyle = '#f6f3ea';
  g.beginPath(); g.arc(256, 49, 13, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d6b25a';
  g.beginPath(); g.moveTo(244, 22); g.lineTo(256, 2); g.lineTo(268, 22); g.fill();
  g.strokeStyle = '#6b5a44';
  g.lineWidth = 6;
  g.strokeRect(3, 3, 506, 164);
  g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 170); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
