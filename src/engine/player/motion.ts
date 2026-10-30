import * as THREE from 'three';
import type { Input } from '../input';
import type { Collider, PlayerRig, Pose } from './types';

export function resolveColliders(p: THREE.Vector3, r: number, colliders: Collider[]) {
  for (const c of colliders) {
    switch (c.kind) {
      case 'box': {
        const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
        const dx = p.x - cx, dz = p.z - cz;
        const d = Math.hypot(dx, dz);
        if (d === 0) {
          const opts = [p.x - c.minX, c.maxX - p.x, p.z - c.minZ, c.maxZ - p.z];
          const i = opts.indexOf(Math.min(...opts));
          if (i === 0) p.x = c.minX - r; else if (i === 1) p.x = c.maxX + r;
          else if (i === 2) p.z = c.minZ - r; else p.z = c.maxZ + r;
        } else if (d < r) {
          p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r;
        }
        break;
      }
      case 'circle': {
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
        if (d < c.r + r && d > 0) { p.x = c.x + (dx / d) * (c.r + r); p.z = c.z + (dz / d) * (c.r + r); }
        break;
      }
      case 'halfdisc': {
        if (Math.sign(p.z - c.z) !== c.side) break;
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
        if (d < c.r + r && d > 0) { p.x = c.x + (dx / d) * (c.r + r); p.z = c.z + (dz / d) * (c.r + r); }
        break;
      }
      case 'rect-in':
        p.x = Math.max(c.minX + r, Math.min(p.x, c.maxX - r));
        p.z = Math.max(c.minZ + r, Math.min(p.z, c.maxZ - r));
        break;
      case 'disc-in': {
        const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
        if (d > c.r - r) { p.x = c.x + (dx / d) * (c.r - r); p.z = c.z + (dz / d) * (c.r - r); }
        break;
      }
    }
  }
}

export interface AnimState {
  phase: number;
  idleT: number;
  raiseT: number;
}

export function animatePlayerRig(rig: PlayerRig, state: AnimState, pose: Pose, dt: number, speed: number) {
  state.idleT += dt;
  const k = Math.min(1, dt * 11);
  const breath = Math.sin(state.idleT * 2.1);

  let hipsY = 0.9;
  let upperX = 0, upperY = 0, headX = 0;
  let legLX = 0, legRX = 0, shinLX = 0, shinRX = 0;
  let armLX = -0.05, armRX = -0.05;
  let armLZ = -0.05, armRZ = 0.05;
  let foreLX = -0.18, foreRX = -0.18;

  if (pose === 'stand') {
    if (speed > 0.05) {
      const jogFactor = Math.min(1, Math.max(0, (speed - 3.4) / 2.4));
      state.phase += dt * speed * 3.05;
      const s = Math.sin(state.phase), c = Math.cos(state.phase);
      const stride = 0.48 + jogFactor * 0.24;

      legLX = s * stride; legRX = -s * stride;
      shinLX = Math.max(0, c) * (0.48 + jogFactor * 0.35);
      shinRX = Math.max(0, -c) * (0.48 + jogFactor * 0.35);

      armLX = -s * (0.38 + jogFactor * 0.25) - jogFactor * 0.18;
      armRX = s * (0.38 + jogFactor * 0.25) - jogFactor * 0.18;
      foreLX = -0.22 - Math.max(0, -s) * 0.32 - jogFactor * 0.45;
      foreRX = -0.22 - Math.max(0, s) * 0.32 - jogFactor * 0.45;

      hipsY = 0.9 + Math.abs(c) * (0.026 + jogFactor * 0.02);
      upperX = 0.03 + jogFactor * 0.08;
      upperY = s * 0.055;
    } else {
      upperX = breath * 0.012;
      armLZ = -0.055 - breath * 0.012;
      armRZ = 0.055 + breath * 0.012;
      foreLX = -0.16 - breath * 0.02;
      foreRX = -0.16 - breath * 0.02;
    }
    if (state.raiseT > 0) {
      state.raiseT -= dt;
      armRX = -2.05; armRZ = 0.16; foreRX = -0.55;
    }
  } else if (pose === 'raise') {
    armLX = -1.48; armRX = -1.48;
    armLZ = 0.14; armRZ = -0.14;
    foreLX = -1.12; foreRX = -1.12;
    headX = -0.08;
  } else if (pose === 'ruku') {
    hipsY = 0.87; upperX = 1.42; headX = -0.35;
    legLX = 0.04; legRX = 0.04;
    armLX = -0.82; armRX = -0.82;
    foreLX = -0.22; foreRX = -0.22;
  } else if (pose === 'sujud') {
    hipsY = 0.44;
    legLX = -0.52; legRX = -0.52;
    shinLX = 2.02; shinRX = 2.02;
    upperX = 1.92; headX = -0.35;
    armLX = -1.42; armRX = -1.42;
    armLZ = -0.22; armRZ = 0.22;
    foreLX = -0.88; foreRX = -0.88;
  } else if (pose === 'sit') {
    hipsY = 0.30;
    legLX = -1.16; legRX = -1.16;
    shinLX = 2.66; shinRX = 2.66;
    upperX = 0.05;
    armLX = -0.48; armRX = -0.48;
    armLZ = 0.08; armRZ = -0.08;
    foreLX = -0.68; foreRX = -0.68;
  } else if (pose === 'throw') {
    upperX = -0.06; upperY = 0.16;
    armRX = -2.05; armRZ = 0.12; foreRX = -0.45;
    armLX = 0.15; foreLX = -0.35;
  }

  rig.hips.position.y += (hipsY - rig.hips.position.y) * k;
  rig.skirtWrap.scale.y = Math.min(1, Math.max(0.32, (rig.hips.position.y - 0.04) / 0.86));

  rig.upper.rotation.x += (upperX - rig.upper.rotation.x) * k;
  rig.upper.rotation.y += (upperY - rig.upper.rotation.y) * k;
  rig.headGroup.rotation.x += (headX - rig.headGroup.rotation.x) * k;

  rig.legL.rotation.x += (legLX - rig.legL.rotation.x) * k;
  rig.legR.rotation.x += (legRX - rig.legR.rotation.x) * k;
  rig.shinL.rotation.x += (shinLX - rig.shinL.rotation.x) * k;
  rig.shinR.rotation.x += (shinRX - rig.shinR.rotation.x) * k;

  rig.armL.rotation.x += (armLX - rig.armL.rotation.x) * k;
  rig.armR.rotation.x += (armRX - rig.armR.rotation.x) * k;
  rig.armL.rotation.z += (armLZ - rig.armL.rotation.z) * k;
  rig.armR.rotation.z += (armRZ - rig.armR.rotation.z) * k;
  rig.forearmL.rotation.x += (foreLX - rig.forearmL.rotation.x) * k;
  rig.forearmR.rotation.x += (foreRX - rig.forearmR.rotation.x) * k;
}

const _camTarget = new THREE.Vector3();
const _camWant = new THREE.Vector3();

/** Third-person camera that orbits the player using the Input's yaw/pitch/dist. */
export function followCamera(cam: THREE.PerspectiveCamera, player: { pos: THREE.Vector3 }, input: Input, dt: number) {
  _camTarget.set(player.pos.x, player.pos.y + 1.45, player.pos.z);
  const cp = Math.cos(input.pitch);
  _camWant.set(
    _camTarget.x + Math.sin(input.yaw) * cp * input.dist,
    Math.max(0.4, _camTarget.y + Math.sin(input.pitch) * input.dist),
    _camTarget.z + Math.cos(input.yaw) * cp * input.dist,
  );
  cam.position.lerp(_camWant, Math.min(1, dt * 8));
  cam.lookAt(_camTarget);
}

