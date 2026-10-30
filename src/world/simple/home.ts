import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { textTexture } from '../../engine/label';
import { makeLOD, mergeParts } from '../../engine/lod';
import { box, boxCollider, floor, mat, tileTexture, type Scene3D } from '../common';

/** Thai house interior (12 x 10 m) with a door to the street and a waiting car. */
export const HOME = {
  door: { x: 0, z: -5 },
  outside: { x: 0, z: -8.5 },
  items: [
    { x: -4, z: 2.5 }, { x: 4, z: 2.5 }, { x: -4.2, z: -2 }, { x: 4.2, z: -2 }, { x: 0, z: 3.4 },
  ],
};

export function buildHome(): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];
  const wood = tileTexture('#b98b5e', 'rgba(90,60,30,0.25)', 6);
  wood.repeat.set(3, 3);
  floor(group, 12, 10, mat(0xffffff, 0.65, { map: wood }));
  floor(group, 40, 20, mat(0x585b60, 0.9), 0, -15); // street asphalt
  // Sidewalk curb between yard & street
  box(group, 40, 0.12, 1.4, mat(0xc8c4ba, 0.8), 0, 0, -5.8, false);
  floor(group, 60, 60, mat(0x759960, 1), 0, 0).position.y = -0.01; // garden

  const wall = mat(0xf2eadb, 0.84);
  box(group, 12, 3, 0.2, wall, 0, 0, 5);
  box(group, 0.2, 3, 10, wall, -6, 0, 0);
  box(group, 0.2, 3, 10, wall, 6, 0, 0);
  box(group, 5, 3, 0.2, wall, -3.5, 0, -5);
  box(group, 5, 3, 0.2, wall, 3.5, 0, -5);
  box(group, 2, 0.8, 0.2, wall, 0, 2.2, -5);
  // Wooden door frame around entrance
  box(group, 0.12, 2.25, 0.26, mat(0x6b4c32, 0.65), -1.02, 0, -5, false);
  box(group, 0.12, 2.25, 0.26, mat(0x6b4c32, 0.65), 1.02, 0, -5, false);
  colliders.push(
    { kind: 'box', minX: -6.2, maxX: 6.2, minZ: 4.9, maxZ: 5.2 },
    { kind: 'box', minX: -6.2, maxX: -5.9, minZ: -5.2, maxZ: 5.2 },
    { kind: 'box', minX: 5.9, maxX: 6.2, minZ: -5.2, maxZ: 5.2 },
    { kind: 'box', minX: -6.2, maxX: -1, minZ: -5.2, maxZ: -4.9 },
    { kind: 'box', minX: 1, maxX: 6.2, minZ: -5.2, maxZ: -4.9 },
    { kind: 'rect-in', minX: -6, maxX: 6, minZ: -12, maxZ: 5 },
  );

  // Sculpted furniture (merged in 1 draw call: 4-legged wooden table + ihram stack, wheeled suitcase, cushioned sofa).
  const furniture = new THREE.Mesh(
    mergeParts([
      // Wooden table at (0, 0, 0.5)
      { geo: new THREE.BoxGeometry(2.4, 0.08, 1.0), x: 0, y: 0.76, z: 0.5, color: 0x7b5638 },
      { geo: new THREE.BoxGeometry(2.2, 0.08, 0.82), x: 0, y: 0.69, z: 0.5, color: 0x65462d },
      { geo: new THREE.BoxGeometry(0.09, 0.72, 0.09), x: -1.06, y: 0.36, z: 0.1, color: 0x65462d, aoBottom: 0.8 },
      { geo: new THREE.BoxGeometry(0.09, 0.72, 0.09), x: 1.06, y: 0.36, z: 0.1, color: 0x65462d, aoBottom: 0.8 },
      { geo: new THREE.BoxGeometry(0.09, 0.72, 0.09), x: -1.06, y: 0.36, z: 0.9, color: 0x65462d, aoBottom: 0.8 },
      { geo: new THREE.BoxGeometry(0.09, 0.72, 0.09), x: 1.06, y: 0.36, z: 0.9, color: 0x65462d, aoBottom: 0.8 },
      // Folded white ihram towels & green guidebook on table
      { geo: new THREE.BoxGeometry(0.48, 0.10, 0.36), x: -0.45, y: 0.85, z: 0.48, color: 0xf6f4ee },
      { geo: new THREE.BoxGeometry(0.24, 0.04, 0.32), x: 0.38, y: 0.82, z: 0.52, ry: 0.2, color: 0x1b5e46 },
      // Hardshell suitcase with wheels & telescopic handle at (1.5, 0, -3.8)
      { geo: new THREE.BoxGeometry(0.52, 0.68, 0.34), x: 1.5, y: 0.38, z: -3.8, color: 0x26537d, aoBottom: 0.85 },
      { geo: new THREE.BoxGeometry(0.54, 0.04, 0.36), x: 1.5, y: 0.38, z: -3.8, color: 0x1a2026 },
      { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), x: 1.30, y: 0.03, z: -3.68, rz: Math.PI / 2, color: 0x1d1d1f },
      { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), x: 1.70, y: 0.03, z: -3.68, rz: Math.PI / 2, color: 0x1d1d1f },
      { geo: new THREE.BoxGeometry(0.22, 0.24, 0.03), x: 1.5, y: 0.82, z: -3.92, color: 0x8f969e },
      // 3-seat cushioned sofa at (-3.5, 0, 4.3)
      { geo: new THREE.BoxGeometry(2.96, 0.34, 0.92), x: -3.5, y: 0.22, z: 4.3, color: 0x3b6859, aoBottom: 0.8 },
      { geo: new THREE.BoxGeometry(2.96, 0.56, 0.22), x: -3.5, y: 0.62, z: 4.66, color: 0x457868 },
      { geo: new THREE.BoxGeometry(0.22, 0.48, 0.94), x: -4.92, y: 0.46, z: 4.3, color: 0x3f6e5f },
      { geo: new THREE.BoxGeometry(0.22, 0.48, 0.94), x: -2.08, y: 0.46, z: 4.3, color: 0x3f6e5f },
      { geo: new THREE.BoxGeometry(0.84, 0.14, 0.68), x: -4.36, y: 0.44, z: 4.22, color: 0x4e8573 },
      { geo: new THREE.BoxGeometry(0.84, 0.14, 0.68), x: -3.50, y: 0.44, z: 4.22, color: 0x4e8573 },
      { geo: new THREE.BoxGeometry(0.84, 0.14, 0.68), x: -2.64, y: 0.44, z: 4.22, color: 0x4e8573 },
      // Gold picture frame border behind calligraphy
      { geo: new THREE.BoxGeometry(1.74, 1.14, 0.05), x: 0, y: 1.9, z: 4.90, color: 0xc9a24a },
    ]),
    mat(0xffffff, 0.72, { vertexColors: true }),
  );
  furniture.castShadow = furniture.receiveShadow = true;
  group.add(furniture);
  colliders.push(boxCollider(0, 0.5, 2.4, 1), boxCollider(-3.5, 4.3, 3, 1));

  const frame = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshBasicMaterial({ map: textTexture(['بِسْمِ اللَّهِ'], 512, 320, '#0d2622', '#e2c46c', 80) }));
  frame.position.set(0, 1.9, 4.86);
  frame.rotation.y = Math.PI;
  group.add(frame);

  // Waiting sedan car outside at (3.5, 0, -12) with 3-tier LOD (sculpted sedan -> clay far).
  const carLod0 = new THREE.Group();
  const carBody = new THREE.Mesh(
    mergeParts([
      // Lower body chassis, sloped hood (+z) & trunk (-z)
      { geo: new THREE.BoxGeometry(1.88, 0.62, 4.28), y: 0.56, color: 0xedeff2, aoBottom: 0.84 },
      { geo: new THREE.BoxGeometry(1.94, 0.22, 0.24), y: 0.36, z: 2.08, color: 0x2c3035 },
      { geo: new THREE.BoxGeometry(1.94, 0.24, 0.22), y: 0.38, z: -2.08, color: 0x2c3035 },
      // Cabin roof + pillars
      { geo: new THREE.BoxGeometry(1.62, 0.52, 2.05), y: 1.12, z: -0.15, color: 0xf2f4f7 },
      // Front grille + headlights + rear taillights + mirrors
      { geo: new THREE.BoxGeometry(0.92, 0.22, 0.06), y: 0.58, z: 2.15, color: 0x22262a },
      { geo: new THREE.BoxGeometry(0.36, 0.14, 0.06), x: -0.68, y: 0.64, z: 2.15, color: 0xfff8df },
      { geo: new THREE.BoxGeometry(0.36, 0.14, 0.06), x: 0.68, y: 0.64, z: 2.15, color: 0xfff8df },
      { geo: new THREE.BoxGeometry(0.42, 0.15, 0.06), x: -0.65, y: 0.68, z: -2.15, color: 0xc92a2a },
      { geo: new THREE.BoxGeometry(0.42, 0.15, 0.06), x: 0.65, y: 0.68, z: -2.15, color: 0xc92a2a },
      { geo: new THREE.BoxGeometry(0.18, 0.11, 0.14), x: -0.98, y: 0.94, z: 0.68, color: 0xedeff2 },
      { geo: new THREE.BoxGeometry(0.18, 0.11, 0.14), x: 0.98, y: 0.94, z: 0.68, color: 0xedeff2 },
      // 4 wheels with rubber tires & silver alloy rims
      ...([[-0.88, -1.32], [0.88, -1.32], [-0.88, 1.32], [0.88, 1.32]] as const).flatMap(([wx, wz]) => [
        { geo: new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14), x: wx, y: 0.33, z: wz, rz: Math.PI / 2, color: 0x1d1e20 },
        { geo: new THREE.CylinderGeometry(0.20, 0.20, 0.26, 10), x: wx * 1.01, y: 0.33, z: wz, rz: Math.PI / 2, color: 0xc8cfd6 },
      ]),
    ]),
    mat(0xffffff, 0.32, { metalness: 0.3, vertexColors: true }),
  );
  carBody.castShadow = carBody.receiveShadow = true;
  const carGlass = new THREE.Mesh(
    mergeParts([
      { geo: new THREE.BoxGeometry(1.66, 0.44, 1.88), y: 1.10, z: -0.15, color: 0x253a4a },
      { geo: new THREE.BoxGeometry(1.54, 0.48, 0.08), y: 1.08, z: 0.86, rx: -0.52, color: 0x253a4a },
      { geo: new THREE.BoxGeometry(1.50, 0.44, 0.08), y: 1.08, z: -1.14, rx: 0.48, color: 0x253a4a },
    ]),
    mat(0xffffff, 0.12, { metalness: 0.4, vertexColors: true }),
  );
  carLod0.add(carBody, carGlass);

  const carClay = new THREE.Mesh(
    mergeParts([
      { geo: new THREE.BoxGeometry(1.9, 0.72, 4.3), y: 0.56, color: 0xe8eaed, aoBottom: 0.82 },
      { geo: new THREE.BoxGeometry(1.62, 0.52, 2.1), y: 1.14, z: -0.15, color: 0x344958 },
    ]),
    mat(0xffffff, 0.92, { vertexColors: true }),
  );
  group.add(makeLOD(3.5, 0, -12, [[carLod0, 0], [carClay, 38]]));
  colliders.push(boxCollider(3.5, -12, 2, 4.4));
  return { group, colliders };
}
