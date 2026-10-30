import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { makeLabel } from '../../engine/label';
import { makeLOD, mergeParts, type PartSpec } from '../../engine/lod';
import { mat } from '../common';
import { tr } from '../../i18n';
import { MATAF_R, SPOTS, STONE_ANGLE, polar } from './constants';

export function addMaqam(group: THREE.Group, colliders: Collider[], floorLine: boolean) {
  // Maqam Ibrahim: 3-tier LOD (ornate gilded cage + crystal chamber + footprint stone -> mid -> clay).
  const mq = SPOTS.maqam;
  const mqLod0 = new THREE.Group();
  const mqStruct = new THREE.Mesh(
    mergeParts([
      // Stepped marble octagonal pedestal
      { geo: new THREE.CylinderGeometry(0.96, 1.08, 0.26, 8), y: 0.13, color: 0xefece4 },
      { geo: new THREE.CylinderGeometry(0.78, 0.90, 0.34, 8), y: 0.43, color: 0xe2dcd0 },
      // Sacred footprint stone visible inside glass chamber
      { geo: new THREE.CylinderGeometry(0.32, 0.36, 0.22, 10), y: 0.72, color: 0xc8b89a },
      { geo: new THREE.SphereGeometry(0.075, 8, 6), x: -0.09, y: 0.83, z: 0.02, sx: 0.75, sy: 0.35, sz: 1.35, color: 0x7a684e },
      { geo: new THREE.SphereGeometry(0.075, 8, 6), x: 0.09, y: 0.83, z: 0.02, sx: 0.75, sy: 0.35, sz: 1.35, color: 0x7a684e },
      // 8 golden cage corner columns
      ...Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return { geo: new THREE.CylinderGeometry(0.042, 0.048, 1.65, 8), x: Math.cos(a) * 0.62, y: 1.42, z: Math.sin(a) * 0.62, color: 0xdcb858 };
      }),
      // Lower & upper embossed golden frieze bands + ribbed dome + crescent finial
      { geo: new THREE.CylinderGeometry(0.68, 0.72, 0.22, 8), y: 0.70, color: 0xcfa84a },
      { geo: new THREE.CylinderGeometry(0.70, 0.66, 0.36, 8), y: 2.32, color: 0xdcb858 },
      { geo: new THREE.SphereGeometry(0.64, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), y: 2.48, sy: 1.15, color: 0xe2be62 },
      { geo: new THREE.CylinderGeometry(0.035, 0.05, 0.48, 8), y: 3.42, color: 0xe6c468 },
      { geo: new THREE.TorusGeometry(0.14, 0.028, 6, 16, Math.PI * 1.4), y: 3.74, rz: Math.PI * 0.8, color: 0xf0d072 },
    ]),
    mat(0xffffff, 0.26, { metalness: 0.78, vertexColors: true }),
  );
  mqStruct.castShadow = mqStruct.receiveShadow = true;
  const mqGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.54, 0.54, 1.45, 16),
    mat(0xdff4ff, 0.1, { transparent: true, opacity: 0.38, metalness: 0.2 }),
  );
  mqGlass.position.y = 1.48;
  mqLod0.add(mqStruct, mqGlass);

  const mqLod1 = new THREE.Mesh(
    mergeParts([
      { geo: new THREE.CylinderGeometry(0.92, 1.04, 0.5, 8), y: 0.25, color: 0xeae5da },
      { geo: new THREE.CylinderGeometry(0.62, 0.62, 1.9, 8), y: 1.45, color: 0xd6b25a },
      { geo: new THREE.SphereGeometry(0.62, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), y: 2.4, color: 0xe0bc5e },
    ]),
    mat(0xffffff, 0.32, { metalness: 0.7, vertexColors: true }),
  );
  const mqLod2 = new THREE.Mesh(
    mergeParts([
      { geo: new THREE.CylinderGeometry(0.9, 1.0, 0.5, 6), y: 0.25, color: 0xe8e2d6 },
      { geo: new THREE.CylinderGeometry(0.6, 0.64, 2.0, 6), y: 1.5, color: 0xd4b058 },
      { geo: new THREE.SphereGeometry(0.6, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), y: 2.5, color: 0xdcb85e },
    ]),
    mat(0xffffff, 0.9, { vertexColors: true }),
  );
  group.add(makeLOD(mq.x, 0, mq.z, [[mqLod0, 0], [mqLod1, 28], [mqLod2, 68]]));
  colliders.push({ kind: 'circle', x: mq.x, z: mq.z, r: 1.0 });
  const mql = makeLabel(tr('มะกอมอิบรอฮีม'), { height: 0.5 });
  mql.position.set(mq.x, 4.1, mq.z);
  group.add(mql);

  // Optional floor guide along the Black Stone line (the real mosque has none).
  if (floorLine) {
    const len = MATAF_R - 7.6;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.18), new THREE.MeshBasicMaterial({ color: 0x2f9e6e }));
    const mid = polar(7.6 + len / 2, STONE_ANGLE);
    line.position.set(mid.x, 0.02, mid.z);
    line.rotation.set(-Math.PI / 2, 0, STONE_ANGLE);
    group.add(line);
  }
  // Green lamp on the arcade marking the start of each circuit.
  const lamp = polar(MATAF_R + 3.6, STONE_ANGLE);
  const lampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, 0.45), new THREE.MeshBasicMaterial({ color: 0x3dff9a }));
  lampMesh.position.set(lamp.x, 6.5, lamp.z);
  group.add(lampMesh);
  const lampLight = new THREE.PointLight(0x3dff9a, 6, 14);
  lampLight.position.copy(lampMesh.position);
  group.add(lampLight);
}

export function addZamzam(group: THREE.Group) {
  // Zamzam drinking station (3-tier LOD: detailed stainless-steel & cream coolers + spigots + tray -> clay far).
  const zz = SPOTS.zamzam;
  const zzParts0: PartSpec[] = [
    // Marble counter stand + stainless drip tray
    { geo: new THREE.BoxGeometry(3.8, 0.52, 0.95), y: 0.26, color: 0xe6e0d4 },
    { geo: new THREE.BoxGeometry(3.6, 0.06, 0.32), y: 0.53, z: -0.28, color: 0x9aa2aa },
  ];
  for (let i = 0; i < 4; i++) {
    const cx = (i - 1.5) * 0.82;
    zzParts0.push(
      { geo: new THREE.CylinderGeometry(0.27, 0.28, 0.82, 16), x: cx, y: 0.94, z: 0.06, color: 0xf4f2ec },
      { geo: new THREE.CylinderGeometry(0.285, 0.285, 0.10, 16), x: cx, y: 1.38, z: 0.06, color: 0x2a6950 },
      { geo: new THREE.BoxGeometry(0.05, 0.05, 0.14), x: cx, y: 0.68, z: -0.24, color: 0xc9a24a },
    );
  }
  // Cup dispenser tube on the right
  zzParts0.push({ geo: new THREE.CylinderGeometry(0.065, 0.065, 0.65, 10), x: 1.72, y: 0.95, z: -0.2, color: 0xdce6ee });
  const zz0 = new THREE.Mesh(mergeParts(zzParts0), mat(0xffffff, 0.35, { metalness: 0.2, vertexColors: true }));
  zz0.castShadow = zz0.receiveShadow = true;
  const zz2 = new THREE.Mesh(
    mergeParts([
      { geo: new THREE.BoxGeometry(3.8, 0.52, 0.9), y: 0.26, color: 0xe6e0d4 },
      { geo: new THREE.BoxGeometry(3.3, 0.88, 0.6), y: 0.96, color: 0xf4f2ec },
    ]),
    mat(0xffffff, 0.92, { vertexColors: true }),
  );
  group.add(makeLOD(zz.x, 0, zz.z + 2.4, [[zz0, 0], [zz2, 42]]));
  const zzl = makeLabel(tr('จุดน้ำซัมซัม'), { height: 0.5 });
  zzl.position.set(zz.x, 2.4, zz.z + 2.4);
  group.add(zzl);
}
