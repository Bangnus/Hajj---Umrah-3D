import * as THREE from 'three';
import { type AddPartFn, type Look, type PlayerRig, shadeHex, WHITE, WHITE_SHADE } from './types';

/** Builds sculpted head, facial features, kufi/hair/hijab states, and two-joint arms & hands. */
export function buildHeadAndArms(rig: PlayerRig, L: Look, add: AddPartFn) {
  const male = L.gender === 'male';
  const ihram = L.outfit === 'ihram';
  const idtiba = male && ihram && !!L.idtiba;
  const clothHex = ihram ? WHITE : L.cloth;
  const skin = L.skin;
  const skinDark = shadeHex(skin, 0.88);
  const clothLight = ihram ? 0xfaf9f5 : shadeHex(clothHex, 1.08);
  const hairHex = 0x221a15;

  // Neck + Sculpted Head Group (headGroup pivot at y = 0.72 on upper).
  add(rig.upper, new THREE.CylinderGeometry(0.056, 0.066, 0.13, 12), skin, 0, 0.65, 0, { rough: 0.72 });
  rig.headGroup.position.set(0, 0.72, 0);
  rig.upper.add(rig.headGroup);

  add(rig.headGroup, new THREE.SphereGeometry(0.138, 20, 16), skin, 0, 0.13, 0, { sx: 0.94, sy: 1.06, sz: 0.98, rough: 0.72 });
  add(rig.headGroup, new THREE.SphereGeometry(0.098, 14, 10), skin, 0, 0.065, 0.028, { sx: 0.92, sy: 0.88, sz: 0.95, rough: 0.72 });

  // Subtle nose, eyes, eyebrows & mouth (+z is forward)
  add(rig.headGroup, new THREE.ConeGeometry(0.021, 0.058, 8), skinDark, 0, 0.115, 0.138, { rx: Math.PI * 0.42, rough: 0.74 });
  for (const s of [-1, 1]) {
    add(rig.headGroup, new THREE.SphereGeometry(0.019, 8, 6), 0xfaf8f5, s * 0.046, 0.138, 0.122, { sx: 1.15, sy: 0.75, sz: 0.45, rough: 0.4 });
    add(rig.headGroup, new THREE.SphereGeometry(0.011, 8, 6), 0x1d1612, s * 0.046, 0.138, 0.130, { sx: 1.0, sy: 1.0, sz: 0.5, rough: 0.25 });
    add(rig.headGroup, new THREE.BoxGeometry(0.036, 0.008, 0.012), hairHex, s * 0.047, 0.162, 0.126, { rz: -s * 0.08, rough: 0.9 });
  }
  add(rig.headGroup, new THREE.BoxGeometry(0.042, 0.008, 0.012), shadeHex(skin, 0.72), 0, 0.068, 0.122, { rough: 0.75 });

  if (male) {
    for (const s of [-1, 1]) {
      add(rig.headGroup, new THREE.SphereGeometry(0.032, 8, 8), skinDark, s * 0.130, 0.122, -0.008, { sx: 0.42, sy: 1.08, sz: 0.72, rough: 0.75 });
    }
    add(rig.headGroup, new THREE.SphereGeometry(0.102, 14, 10, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.48), hairHex, 0, 0.082, 0.032, { sx: 0.94, sy: 0.92, sz: 1.02, rough: 0.92 });
    add(rig.headGroup, new THREE.BoxGeometry(0.052, 0.011, 0.016), hairHex, 0, 0.082, 0.126, { rough: 0.92 });

    if (!ihram) {
      add(rig.headGroup, new THREE.SphereGeometry(0.141, 18, 10, 0, Math.PI * 2, 0, 1.22), 0xf7f5ef, 0, 0.138, -0.004, { sx: 0.95, sy: 1.04, sz: 0.99, rough: 0.85 });
      add(rig.headGroup, new THREE.TorusGeometry(0.128, 0.012, 8, 22), 0xeae6dc, 0, 0.185, -0.004, { rx: Math.PI / 2 + 0.08, sx: 0.94, sy: 0.98, rough: 0.85 });
      if (L.hair === 'normal') {
        add(rig.headGroup, new THREE.SphereGeometry(0.139, 16, 10, Math.PI * 0.65, Math.PI * 1.7, 0.95, 0.95), hairHex, 0, 0.132, -0.006, { ry: Math.PI / 2, sx: 0.99, sy: 1.02, sz: 0.96, rough: 0.92 });
      } else if (L.hair === 'trimmed') {
        add(rig.headGroup, new THREE.SphereGeometry(0.136, 14, 8, Math.PI * 0.72, Math.PI * 1.56, 1.0, 0.75), 0x332820, 0, 0.132, -0.006, { ry: Math.PI / 2, sx: 0.99, sy: 1.02, sz: 0.95, rough: 0.92 });
      }
    } else if (L.hair === 'normal') {
      add(rig.headGroup, new THREE.SphereGeometry(0.143, 18, 12, 0, Math.PI * 2, 0, 1.58), hairHex, 0, 0.136, -0.012, { rx: -0.28, sx: 0.96, sy: 1.06, sz: 1.0, rough: 0.9 });
      for (const s of [-1, 1]) {
        add(rig.headGroup, new THREE.BoxGeometry(0.018, 0.055, 0.028), hairHex, s * 0.124, 0.125, 0.032, { rough: 0.9 });
      }
    } else if (L.hair === 'trimmed') {
      add(rig.headGroup, new THREE.SphereGeometry(0.1395, 18, 12, 0, Math.PI * 2, 0, 1.48), 0x322720, 0, 0.133, -0.010, { rx: -0.25, sx: 0.95, sy: 1.05, sz: 0.99, rough: 0.92 });
    } else {
      add(rig.headGroup, new THREE.SphereGeometry(0.1385, 18, 12, 0, Math.PI * 2, 0, 1.42), shadeHex(skin, 0.94), 0, 0.131, -0.008, { rx: -0.22, sx: 0.94, sy: 1.06, sz: 0.98, rough: 0.62 });
    }
  } else {
    // Open-front hijab hood + forehead underscarf framing the uncovered skin face (+z)
    const hijabHex = ihram ? WHITE : shadeHex(L.cloth, 0.65) || 0x2f3a44;
    const underHex = ihram ? WHITE_SHADE : 0xede8df;
    add(rig.headGroup, new THREE.SphereGeometry(0.141, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.61), underHex, 0, 0.136, 0.002, {
      rx: -Math.PI / 2 + 0.26, sx: 0.95, sy: 0.98, sz: 1.06, rough: 0.85, side: THREE.DoubleSide,
    });
    add(rig.headGroup, new THREE.SphereGeometry(0.149, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.63), hijabHex, 0, 0.132, -0.006, {
      rx: -Math.PI / 2 + 0.15, sx: 0.96, sy: 0.99, sz: 1.10, rough: 0.84, side: THREE.DoubleSide,
    });
    add(rig.headGroup, new THREE.CylinderGeometry(0.106, 0.138, 0.13, 18), hijabHex, 0, 0.002, -0.016, { sx: 0.96, sz: 0.94, rough: 0.84 });
  }

  // Articulated two-segment arms: armL (+0.214) & armR (-0.214) with deltoid caps & elbow joints.
  rig.armL.position.set(0.214, 0.515, 0);
  rig.armR.position.set(-0.214, 0.515, 0);
  rig.forearmL.position.set(0, -0.25, 0);
  rig.forearmR.position.set(0, -0.25, 0);
  rig.armL.add(rig.forearmL);
  rig.armR.add(rig.forearmR);
  rig.upper.add(rig.armL, rig.armR);

  const buildArm = (upperArm: THREE.Group, forearm: THREE.Group, isRight: boolean) => {
    const bareArm = idtiba && isRight;
    const bareForearm = male && ihram;
    const ihramSleeve = !bareArm && male && ihram;
    const upperCol = bareArm ? skin : (ihramSleeve ? WHITE : clothHex);
    const foreCol = bareForearm ? skin : clothHex;
    const topR = ihramSleeve ? 0.068 : 0.062;
    const midR = ihramSleeve ? 0.060 : 0.052;

    add(upperArm, new THREE.SphereGeometry(topR, 12, 10), upperCol, 0, 0, 0, { rough: bareArm ? 0.72 : 0.82 });
    add(upperArm, new THREE.CylinderGeometry(topR, midR, 0.25, 12), upperCol, 0, -0.125, 0, { rough: bareArm ? 0.72 : 0.82 });
    if (ihramSleeve) {
      add(upperArm, new THREE.TorusGeometry(0.058, 0.007, 6, 14), WHITE_SHADE, 0, -0.23, 0, { rx: Math.PI / 2, rough: 0.86 });
    }
    add(upperArm, new THREE.SphereGeometry(0.051, 10, 8), foreCol, 0, -0.25, 0, { rough: bareForearm ? 0.72 : 0.8 });

    add(forearm, new THREE.CylinderGeometry(0.051, 0.039, 0.235, 12), foreCol, 0, -0.118, 0, { rough: bareForearm ? 0.72 : 0.8 });
    if (!bareForearm) {
      add(forearm, new THREE.CylinderGeometry(0.045, 0.045, 0.032, 12), clothLight, 0, -0.225, 0);
    }
    const sgn = isRight ? -1 : 1;
    add(forearm, new THREE.SphereGeometry(0.043, 10, 8), skin, 0, -0.268, 0.008, { sx: 0.68, sy: 1.18, sz: 0.92, rough: 0.72 });
    add(forearm, new THREE.SphereGeometry(0.017, 6, 6), skinDark, -sgn * 0.022, -0.255, 0.038, { sx: 0.8, sy: 1.2, sz: 0.8, rough: 0.72 });
  };

  buildArm(rig.armL, rig.forearmL, false);
  buildArm(rig.armR, rig.forearmR, true);
}

