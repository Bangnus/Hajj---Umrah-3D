import * as THREE from 'three';
import type { Collider } from '../../engine/player';
import { mergeParts } from '../../engine/lod';
import { cyl, mat } from '../common';
import { HIJR, KAABA } from './constants';
import { kiswaMaterial } from './kiswah';

export function addKaabaAndHijr(group: THREE.Group, colliders: Collider[]) {
  const { hx, hz, h } = KAABA;

  // Ka'bah with silk-damask Kiswah, gold Hizam, sloped Shadharwan marble base, 3D Golden Door, Mizab & Black Stone.
  const kiswa = kiswaMaterial();
  const kaaba = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, h, hz * 2), kiswa);
  kaaba.position.y = h / 2;
  kaaba.castShadow = kaaba.receiveShadow = true;
  group.add(kaaba);

  // Roof parapet trim + Golden Mizab ar-Rahmah (rain spout over Hijr Ismail on north side -z)
  const goldMat = mat(0xd8b356, 0.25, { metalness: 0.85 });
  const kaabaDetails = new THREE.Mesh(
    mergeParts([
      // Sloped white marble Shadharwan base around east, north & west/south walls
      { geo: new THREE.BoxGeometry(hx * 2 + 0.72, 0.26, hz * 2 + 0.72), y: 0.13, color: 0xefece4 },
      { geo: new THREE.BoxGeometry(hx * 2 + 0.42, 0.24, hz * 2 + 0.42), y: 0.34, color: 0xe5e0d5 },
      // Brass tie-rings along Shadharwan
      ...Array.from({ length: 7 }, (_, i) => ({
        geo: new THREE.TorusGeometry(0.045, 0.015, 5, 10),
        x: -hx + 1.5 + i * 1.5, y: 0.44, z: hz + 0.23, rx: Math.PI / 2, color: 0xc9a24a,
      })),
      // 3D Sculpted Golden Door (Bab al-Ka'bah) on East Wall (+x)
      { geo: new THREE.BoxGeometry(0.14, 3.35, 2.24), x: hx + 0.04, y: 3.75, z: 2.35, color: 0xb88f38 },
      { geo: new THREE.BoxGeometry(0.18, 0.32, 2.42), x: hx + 0.06, y: 5.48, z: 2.35, color: 0xdcb85c },
      { geo: new THREE.BoxGeometry(0.16, 2.95, 0.96), x: hx + 0.07, y: 3.68, z: 1.82, color: 0xd6b052 },
      { geo: new THREE.BoxGeometry(0.16, 2.95, 0.96), x: hx + 0.07, y: 3.68, z: 2.88, color: 0xd6b052 },
      // Door decorative medallions & lock bar
      { geo: new THREE.CylinderGeometry(0.24, 0.24, 0.06, 14), x: hx + 0.15, y: 4.35, z: 1.82, rz: Math.PI / 2, color: 0xf0d27a },
      { geo: new THREE.CylinderGeometry(0.24, 0.24, 0.06, 14), x: hx + 0.15, y: 4.35, z: 2.88, rz: Math.PI / 2, color: 0xf0d27a },
      { geo: new THREE.BoxGeometry(0.08, 0.14, 0.55), x: hx + 0.16, y: 3.45, z: 2.35, color: 0xe8c668 },
      // Golden Mizab (rain spout) projecting north (-z) over Hijr Ismail
      { geo: new THREE.BoxGeometry(0.42, 0.28, 1.35), x: 0, y: h - 0.35, z: -hz - 0.58, rx: 0.06, color: 0xe0bc5e },
      { geo: new THREE.BoxGeometry(0.48, 0.34, 0.18), x: 0, y: h - 0.34, z: -hz - 0.05, color: 0xc9a24a },
      // Rukn al-Yamani subtle stone corner trim (SW: -hx, +hz)
      { geo: new THREE.BoxGeometry(0.18, 1.5, 0.18), x: -hx - 0.01, y: 1.25, z: hz + 0.01, color: 0x8d7b68 },
    ]),
    mat(0xffffff, 0.34, { metalness: 0.55, vertexColors: true }),
  );
  kaabaDetails.castShadow = kaabaDetails.receiveShadow = true;
  group.add(kaabaDetails);

  // Black Stone (Al-Hajar al-Aswad) at SE corner (+hx, +hz) in sculpted silver hood frame
  const stonePos = new THREE.Vector3(hx + 0.06, 1.5, hz + 0.06);
  const silverMat = mat(0xe2e4e8, 0.16, { metalness: 0.92 });
  const stoneFrame = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.075, 12, 28), silverMat);
  stoneFrame.position.copy(stonePos);
  stoneFrame.rotation.y = Math.PI / 4;
  const stoneHood = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI, 0, Math.PI), silverMat);
  stoneHood.position.copy(stonePos);
  stoneHood.rotation.y = -Math.PI * 0.75;
  stoneHood.scale.set(1, 1.15, 0.65);
  const stone = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), mat(0x1c1210, 0.35, { metalness: 0.15 }));
  stone.position.copy(stonePos);
  stone.scale.set(0.95, 1.15, 0.48);
  stone.rotation.y = Math.PI / 4;
  group.add(stoneFrame, stoneHood, stone);
  colliders.push({ kind: 'box', minX: -hx - 0.35, maxX: hx + 0.35, minZ: -hz - 0.35, maxZ: hz + 0.35 });

  // Hijr Ismail (Al-Hatim): semicircular white marble wall with marble coping & ornate brass lanterns.
  const wallMat = mat(0xf2efe7, 0.36, { side: THREE.DoubleSide });
  const arc = new THREE.Mesh(new THREE.CylinderGeometry(HIJR.r, HIJR.r, 1.32, 64, 1, true, Math.PI / 2, Math.PI), wallMat);
  arc.position.set(0, 0.66, HIJR.z);
  arc.castShadow = arc.receiveShadow = true;
  group.add(arc);
  const innerArc = new THREE.Mesh(new THREE.CylinderGeometry(HIJR.r - 0.42, HIJR.r - 0.42, 1.32, 64, 1, true, Math.PI / 2, Math.PI), wallMat);
  innerArc.position.set(0, 0.66, HIJR.z);
  group.add(innerArc);
  const cap = new THREE.Mesh(new THREE.RingGeometry(HIJR.r - 0.46, HIJR.r + 0.06, 64, 1, 0, Math.PI), mat(0xd8d1c2, 0.35, { side: THREE.DoubleSide }));
  cap.rotation.x = -Math.PI / 2;
  cap.position.set(0, 1.33, HIJR.z);
  group.add(cap);
  for (const ang of [0.22, 0.5, 0.78]) {
    const a = ang * Math.PI;
    const lx = Math.cos(a) * (HIJR.r - 0.2), lz = HIJR.z - Math.sin(a) * (HIJR.r - 0.2);
    cyl(group, 0.06, 0.08, 0.45, goldMat, lx, 1.33, lz, 8);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0xaef7c8 }));
    bulb.position.set(lx, 1.85, lz);
    group.add(bulb);
  }
  colliders.push({ kind: 'halfdisc', x: 0, z: HIJR.z, r: HIJR.r + 0.35, side: -1 });
}
