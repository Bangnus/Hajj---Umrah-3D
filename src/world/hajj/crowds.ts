import * as THREE from 'three';
import { crowdMesh, placeCrowd } from '../common';
import { rng } from './terrain';
import type { TentSpot } from './tents';

export interface Lane {
  /** Walking axis. */
  axis: 'x' | 'z';
  /** Range along the axis. */
  from: number; to: number;
  /** Lateral range across the axis. */
  a: number; b: number;
  /** +1 / -1 one way, 0 = both ways. */
  dir: 1 | -1 | 0;
}

/** Pilgrims walking along lanes (frustum-culled + 3-tier LOD); returns the per-frame tick. */
export function walkers(parent: THREE.Object3D, n: number, lanes: Lane[], palette = [0xf4f2ec, 0xf4f2ec, 0xf4f2ec, 0x2b2b33, 0xf4f2ec, 0x6c7a8a], seed = 11) {
  const r = rng(seed);
  const crowd = crowdMesh(n, palette);
  parent.add(crowd.group);
  const people = Array.from({ length: n }, (_, i) => {
    const lane = lanes[i % lanes.length];
    const dir = lane.dir === 0 ? (r() < 0.5 ? 1 : -1) : lane.dir;
    return { lane, s: lane.from + r() * (lane.to - lane.from), l: lane.a + r() * (lane.b - lane.a), v: (0.9 + r() * 0.7) * dir };
  });
  const tick = (dt: number) => {
    people.forEach((p, i) => {
      const { from, to, axis } = p.lane;
      p.s += p.v * dt;
      const lo = Math.min(from, to), hi = Math.max(from, to);
      if (p.s > hi) p.s = lo; else if (p.s < lo) p.s = hi;
      if (axis === 'x') placeCrowd(crowd, i, p.s, p.l, p.v > 0 ? Math.PI / 2 : -Math.PI / 2, 0, true);
      else placeCrowd(crowd, i, p.l, p.s, p.v > 0 ? 0 : Math.PI, 0, true);
    });
  };
  tick(0);
  return tick;
}

/** Pilgrims standing still in an area (frustum-culled + 3-tier LOD, supports elevation y). */
export function standers(parent: THREE.Object3D, spots: { x: number; y?: number; z: number; yaw?: number }[], palette = [0xf4f2ec, 0xf4f2ec, 0x2b2b33, 0xf4f2ec]) {
  const crowd = crowdMesh(spots.length, palette);
  spots.forEach((s, i) => placeCrowd(crowd, i, s.x, s.z, s.yaw ?? 0, s.y ?? 0, false));
  parent.add(crowd.group);
  return crowd;
}

/** Scatter n points in a rectangle, skipping any inside the `avoid` boxes. */
export function scatter(n: number, minX: number, maxX: number, minZ: number, maxZ: number, seed: number, avoid: { minX: number; maxX: number; minZ: number; maxZ: number }[] = []) {
  const r = rng(seed);
  const out: TentSpot[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const x = minX + r() * (maxX - minX), z = minZ + r() * (maxZ - minZ);
    if (avoid.some((a) => x > a.minX && x < a.maxX && z > a.minZ && z < a.maxZ)) continue;
    out.push({ x, z });
  }
  return out;
}
