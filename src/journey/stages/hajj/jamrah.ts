import * as THREE from 'three';
import { RING } from '../../../engine/rings';
import { JAMARAT, type Jamrah } from '../../../world/jamarat';
import type { StageCtx } from '../../types';
import { onFrame } from './common';
import { tr } from '../../../i18n';

interface Flight { mesh: THREE.Mesh; t: number; p0: THREE.Vector3; p1: THREE.Vector3; p2: THREE.Vector3 }

/** Pebble projectiles for a stage: fly in an arc to the wall, then drop into the basin. */
export function pebbleFx(ctx: StageCtx) {
  const geo = new THREE.SphereGeometry(0.06, 8, 6);
  const m = new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 0.9 });
  const flights: Flight[] = [];
  const resting: THREE.Mesh[] = [];
  onFrame(ctx, (dt) => {
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      f.t += dt;
      const fly = 0.5;
      if (f.t < fly) {
        const k = f.t / fly;
        f.mesh.position.lerpVectors(f.p0, f.p1, k);
        f.mesh.position.y += Math.sin(Math.PI * k) * 1.6;
      } else {
        const k = Math.min(1, (f.t - fly) / 0.35);
        f.mesh.position.lerpVectors(f.p1, f.p2, k * k);
        if (k >= 1) {
          flights.splice(i, 1);
          resting.push(f.mesh);
          if (resting.length > 90) { const old = resting.shift()!; old.removeFromParent(); }
        }
      }
    }
  });
  return {
    throwAt(from: THREE.Vector3, j: Jamrah) {
      const mesh = new THREE.Mesh(geo, m);
      ctx.root.add(mesh);
      const p0 = new THREE.Vector3(from.x + 0.25, 2.1, from.z - 0.2);
      const p1 = new THREE.Vector3(j.x + (Math.random() - 0.5) * 10, 1.6 + Math.random() * 2, 0.78);
      const p2 = new THREE.Vector3(p1.x + (Math.random() - 0.5), 0.1, 1 + Math.random() * (JAMARAT.basin.rz - 1.6));
      mesh.position.copy(p0);
      flights.push({ mesh, t: 0, p0, p1, p2 });
    },
  };
}

export interface ThrowOpts {
  /** Called after each pebble with its number (1..7). */
  onThrow?: (n: number) => void;
  onDone: () => void;
  /** Extra text after the takbir toast. */
  extra?: (n: number) => string;
}

/**
 * A throw station at one jamrah: a ring on the south side of the basin and an action button
 * that is enabled while the pilgrim stands in the ring. Seven pebbles, one at a time.
 */
export function throwStation(ctx: StageCtx, fx: ReturnType<typeof pebbleFx>, j: Jamrah, o: ThrowOpts) {
  const zone = { x: j.x, z: JAMARAT.zoneZ };
  const ring = ctx.rings.add(zone.x, zone.z, 2.2, () => {
    ctx.hint(tr('ยืนในวงแหวน หันหน้าเข้าหา{name} แล้วกดปุ่มขว้างทีละก้อน', { name: j.name }));
    return false;
  }, { label: tr('จุดขว้าง {name}', { name: j.name }), persistent: true, color: RING.secondary });
  ctx.guide(zone);
  let n = 0, cooling = false, inZone = false, finished = false;
  const label = () => tr('🪨 ขว้าง{name} ก้อนที่ {n} / 7', { name: j.name, n: n + 1 });
  const btn = ctx.action(label(), () => {
    if (finished || cooling) return;
    if (!inZone) { ctx.toast(tr('เข้าไปยืนในวงแหวนจุดขว้าง{name}ก่อน', { name: j.name }), 'warn'); return; }
    const pl = ctx.player;
    pl.yaw = Math.PI; // face the wall (north)
    pl.frozen = true;
    pl.setPose('throw');
    cooling = true;
    btn.setEnabled(false);
    ctx.after(0.3, () => fx.throwAt(pl.pos, j));
    ctx.after(0.45, () => { pl.setPose('stand'); pl.frozen = false; });
    n++;
    ctx.toast(tr('อัลลอฮุอักบัร — ก้อนที่ {n}/7{extra}', { n, extra: o.extra ? ' ' + o.extra(n) : '' }), 'ok');
    o.onThrow?.(n);
    if (n >= 7) {
      finished = true;
      btn.remove();
      ring.remove();
      ctx.after(0.6, () => o.onDone());
      return;
    }
    ctx.after(0.7, () => { cooling = false; btn.setLabel(label()); btn.setEnabled(inZone); });
  });
  btn.setEnabled(false);
  onFrame(ctx, () => {
    if (finished) return;
    const p = ctx.player.pos;
    const now = Math.hypot(p.x - zone.x, p.z - zone.z) < 2.6;
    if (now !== inZone) {
      inZone = now;
      if (!cooling) btn.setEnabled(now);
    }
  });
}
