import * as THREE from 'three';
import { makeLabel } from './label';

export const RING = {
  main: 0x34d39b,
  secondary: 0xf2c94c,
  water: 0x4aa8ff,
  white: 0xe8e8e8,
} as const;

export interface RingOpts {
  color?: number;
  label?: string;
  /** Stay active after entering (re-triggers on every new entry). */
  persistent?: boolean;
  visible?: boolean;
}

export interface Ring {
  x: number; z: number; r: number;
  active: boolean;
  inside: boolean;
  persistent: boolean;
  group: THREE.Group;
  onEnter: () => boolean | void;
  show(v: boolean): void;
  remove(): void;
}

/**
 * Glowing ground rings that fire a callback when the player steps in.
 * If onEnter returns false the ring stays armed (e.g. "not yet" checks).
 */
export class Rings {
  readonly list: Ring[] = [];
  private t = 0;

  constructor(private readonly parent: THREE.Object3D) {}

  add(x: number, z: number, r: number, onEnter: () => boolean | void, o: RingOpts = {}): Ring {
    const color = o.color ?? RING.main;
    const group = new THREE.Group();
    group.position.set(x, 0.03, z);

    const disc = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.18, r, 56),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(r, 56),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, depthWrite: false }),
    );
    fill.rotation.x = -Math.PI / 2;
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 1.6, 56, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, alphaMap: fadeTexture() }),
    );
    wall.position.y = 0.8;
    group.add(fill, disc, wall);
    if (o.label) {
      const lb = makeLabel(o.label, { height: 0.42 });
      lb.position.y = 2.1;
      group.add(lb);
    }
    this.parent.add(group);

    const ring: Ring = {
      x, z, r, active: true, inside: false, persistent: !!o.persistent, group, onEnter,
      show: (v) => { group.visible = v; ring.active = v; },
      remove: () => { ring.active = false; group.removeFromParent(); disposeTree(group); },
    };
    if (o.visible === false) ring.show(false);
    this.list.push(ring);
    return ring;
  }

  update(dt: number, p: THREE.Vector3) {
    this.t += dt;
    const pulse = 1 + Math.sin(this.t * 4) * 0.04;
    for (const ring of this.list) {
      if (!ring.active) continue;
      ring.group.scale.set(pulse, 1, pulse);
      const inside = Math.hypot(p.x - ring.x, p.z - ring.z) < ring.r;
      if (inside && !ring.inside) {
        const res = ring.onEnter();
        if (res !== false && !ring.persistent) ring.remove();
      }
      ring.inside = inside;
    }
  }

  /** Closest active, visible ring to p (for the guide arrow). */
  nearest(p: THREE.Vector3): Ring | null {
    let best: Ring | null = null, bd = Infinity;
    for (const r of this.list) {
      if (!r.active || r.persistent) continue;
      const d = Math.hypot(p.x - r.x, p.z - r.z);
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }
}

let fade: THREE.Texture | null = null;
function fadeTexture() {
  if (fade) return fade;
  const c = document.createElement('canvas');
  c.width = 2; c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, '#000');
  grad.addColorStop(1, '#fff');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 64);
  fade = new THREE.CanvasTexture(c);
  return fade;
}

/** Dispose all geometries, materials and textures under an object. */
export function disposeTree(o: THREE.Object3D) {
  o.traverse((n) => {
    if ((n as THREE.InstancedMesh).isInstancedMesh) (n as THREE.InstancedMesh).dispose();
    const m = n as THREE.Mesh;
    if (m.geometry && !m.geometry.userData?.keep) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    const mats = Array.isArray(mat) ? mat : mat ? [mat] : [];
    for (const x of mats) {
      if (x.userData?.keep) continue;
      for (const v of Object.values(x)) if (v instanceof THREE.Texture && v !== fade && !v.userData?.keep) v.dispose();
      x.dispose();
    }
  });
}
