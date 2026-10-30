import * as THREE from 'three';
import { mergeParts } from '../../engine/lod';
import { mat } from '../common';
import { MATAF_R } from './constants';

export function addArcadeAndMinarets(group: THREE.Group) {
  // Arcade (two rows of sculpted columns with marble bases & golden capitals + parapet domes), outer wall, minarets.
  const colGeo = mergeParts([
    { geo: new THREE.BoxGeometry(1.22, 0.45, 1.22), y: 0.225, color: 0xdad2c2 },
    { geo: new THREE.CylinderGeometry(0.44, 0.50, 7.8, 12), y: 4.35, color: 0xefe9dc, aoBottom: 0.88 },
    { geo: new THREE.CylinderGeometry(0.58, 0.44, 0.45, 12), y: 8.48, color: 0xd6b25a },
    { geo: new THREE.BoxGeometry(1.18, 0.32, 1.18), y: 8.84, color: 0xe5decb },
  ]);
  const colMat = mat(0xffffff, 0.48, { vertexColors: true });
  const N = 72;
  const m4 = new THREE.Matrix4();
  for (const r of [MATAF_R + 4, MATAF_R + 12] as const) {
    const cols = new THREE.InstancedMesh(colGeo, colMat, N);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      m4.makeTranslation(Math.cos(a) * r, 0, Math.sin(a) * r);
      cols.setMatrixAt(i, m4);
    }
    cols.castShadow = cols.receiveShadow = true;
    group.add(cols);
  }
  const roof = new THREE.Mesh(new THREE.RingGeometry(MATAF_R + 3.5, 70, 96), mat(0xe2dccf, 0.6, { side: THREE.DoubleSide }));
  roof.rotation.x = -Math.PI / 2;
  roof.position.y = 9;
  roof.castShadow = true;
  group.add(roof);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(MATAF_R + 3.5, MATAF_R + 3.5, 1.8, 96, 1, true), mat(0xd8cfbd, 0.5, { side: THREE.DoubleSide }));
  rim.position.y = 9.9;
  group.add(rim);

  // Ring of 36 white arcade domes crowning the Haram colonnade
  const domeGeo = mergeParts([
    { geo: new THREE.SphereGeometry(1.85, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), y: 10.6, sy: 1.05, color: 0xf4f0e6 },
    { geo: new THREE.CylinderGeometry(0.05, 0.07, 0.7, 6), y: 12.85, color: 0xd6b25a },
  ]);
  const arcadeDomes = new THREE.InstancedMesh(domeGeo, colMat, 36);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    arcadeDomes.setMatrixAt(i, m4.makeTranslation(Math.cos(a) * (MATAF_R + 7.8), 0, Math.sin(a) * (MATAF_R + 7.8)));
  }
  group.add(arcadeDomes);

  const wall = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 22, 96, 1, true), mat(0xe4dccb, 0.7, { side: THREE.BackSide }));
  wall.position.y = 11;
  group.add(wall);

  // 8 Haram Minarets with balconies, lantern galleries & golden crescents (instanced in 1 draw call!)
  const minGeo = mergeParts([
    { geo: new THREE.BoxGeometry(4.4, 22, 4.4), y: 11, color: 0xece6d9, aoBottom: 0.85 },
    { geo: new THREE.CylinderGeometry(1.55, 1.85, 52, 12), y: 48, color: 0xf0eadc },
    { geo: new THREE.CylinderGeometry(2.55, 1.85, 1.4, 12), y: 44, color: 0xdcd3c0 },
    { geo: new THREE.CylinderGeometry(2.45, 1.75, 1.4, 12), y: 62, color: 0xdcd3c0 },
    { geo: new THREE.CylinderGeometry(1.25, 1.40, 8, 12), y: 76, color: 0xefe9db },
    { geo: new THREE.ConeGeometry(1.45, 8.5, 12), y: 84.2, color: 0xd6b25a },
    { geo: new THREE.TorusGeometry(0.45, 0.08, 6, 14, Math.PI * 1.4), y: 89.2, rz: Math.PI * 0.8, color: 0xe6c468 },
  ]);
  const haramMinarets = new THREE.InstancedMesh(minGeo, mat(0xffffff, 0.42, { metalness: 0.2, vertexColors: true }), 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    haramMinarets.setMatrixAt(i, m4.makeTranslation(Math.cos(a) * 74, 0, Math.sin(a) * 74));
  }
  group.add(haramMinarets);
}
