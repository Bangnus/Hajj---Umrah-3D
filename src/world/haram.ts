import * as THREE from 'three';
import type { Collider } from '../engine/player';
import { crowdMesh, mat, placeCrowd, tileTexture, type Scene3D } from './common';
import { HIJR, KAABA, MATAF_R, SPOTS, STONE_ANGLE, YAMANI_ANGLE, polar, type HaramOpts } from './haram/constants';
import { addKaabaAndHijr } from './haram/kaaba';
import { addMaqam, addZamzam } from './haram/maqam';
import { addArcadeAndMinarets } from './haram/arcade';
import { addClockTower } from './haram/skyline';

export { KAABA, HIJR, MATAF_R, STONE_ANGLE, YAMANI_ANGLE, SPOTS, polar, type HaramOpts };

export function buildHaram(o: HaramOpts): Scene3D {
  const group = new THREE.Group();
  const colliders: Collider[] = [];

  // Mataf: cool Thassos white marble disc with concentric tawaf rings, then covered arcade floor.
  const marble = tileTexture('#f6f4ef', 'rgba(182,178,168,0.34)', 10);
  marble.repeat.set(9, 9);
  const mataf = new THREE.Mesh(new THREE.CircleGeometry(MATAF_R, 96), mat(0xffffff, 0.30, { map: marble }));
  mataf.rotation.x = -Math.PI / 2;
  mataf.receiveShadow = true;
  group.add(mataf);
  const outerMarble = tileTexture('#e4ddd0', 'rgba(150,140,125,0.32)', 8);
  outerMarble.repeat.set(14, 14);
  const outer = new THREE.Mesh(new THREE.RingGeometry(MATAF_R, 70, 96), mat(0xffffff, 0.5, { map: outerMarble }));
  outer.rotation.x = -Math.PI / 2;
  outer.receiveShadow = true;
  group.add(outer);

  addKaabaAndHijr(group, colliders);
  addMaqam(group, colliders, o.floorLine);
  addArcadeAndMinarets(group);
  addClockTower(group);
  addZamzam(group);

  // Keep the player inside the mosque.
  colliders.push({ kind: 'disc-in', x: 0, z: 0, r: 66 });

  // Crowd doing tawaf (frustum-culled + 3-tier LOD).
  const n = o.crowd;
  const crowd = crowdMesh(n, [0xf4f2ec, 0xf4f2ec, 0xf4f2ec, 0x1f1f24, 0xf4f2ec, 0x2b2b33, 0xf4f2ec]);
  group.add(crowd.group);
  const people = Array.from({ length: n }, () => ({
    r: 9.5 + Math.pow(Math.random(), 1.6) * 24,
    a: Math.random() * Math.PI * 2,
    w: 0,
  }));
  for (const p of people) p.w = (1.0 + Math.random() * 0.8) / p.r;
  const tick = (dt: number) => {
    people.forEach((p, i) => {
      p.a += p.w * dt;
      // Keep the crowd out of Hijr Ismail.
      let r = p.r;
      const pt = polar(r, p.a);
      if (pt.z < HIJR.z && Math.hypot(pt.x, pt.z - HIJR.z) < HIJR.r + 0.8) r = Math.max(r, HIJR.r + 6.6);
      const q = polar(r, p.a);
      placeCrowd(crowd, i, q.x, q.z, -p.a + Math.PI, 0, true);
    });
  };
  tick(0);

  return { group, colliders, tick };
}
