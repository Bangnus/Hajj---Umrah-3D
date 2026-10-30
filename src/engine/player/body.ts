import * as THREE from 'three';
import { type AddPartFn, type Look, type PlayerRig, shadeHex, WHITE, WHITE_SHADE } from './types';

/** Builds articulated legs, footwear, lower draped garment, and torso/garment wraps. */
export function buildLowerAndTorso(rig: PlayerRig, L: Look, add: AddPartFn) {
  const male = L.gender === 'male';
  const ihram = L.outfit === 'ihram';
  const idtiba = male && ihram && !!L.idtiba;
  const clothHex = ihram ? WHITE : L.cloth;
  const skin = L.skin;
  const clothDark = shadeHex(clothHex, 0.90);
  const clothLight = ihram ? 0xfaf9f5 : shadeHex(clothHex, 1.08);

  // Hierarchy: body > hips(0.90) > skirtWrap, upper, legL(+0.105), legR(-0.105)
  rig.body.add(rig.hips);
  rig.hips.position.y = 0.9;
  rig.hips.add(rig.skirtWrap, rig.upper, rig.legL, rig.legR);
  rig.skirtWrap.position.y = 0;

  // Anatomical left (+x) and right (-x) legs with articulated knee joints (shin at y = -0.42).
  rig.legL.position.set(0.105, 0, 0);
  rig.legR.position.set(-0.105, 0, 0);
  rig.shinL.position.set(0, -0.42, 0);
  rig.shinR.position.set(0, -0.42, 0);
  rig.legL.add(rig.shinL);
  rig.legR.add(rig.shinR);

  const thighCol = male ? (ihram ? WHITE : 0xe6e0d2) : clothDark;
  const calfCol = male ? (ihram ? skin : 0xe6e0d2) : clothDark;
  for (const [leg, shin] of [[rig.legL, rig.shinL], [rig.legR, rig.shinR]] as const) {
    add(leg, new THREE.CylinderGeometry(0.082, 0.068, 0.42, 12), thighCol, 0, -0.21, 0);
    add(leg, new THREE.SphereGeometry(0.066, 10, 8), calfCol, 0, -0.42, 0);
    add(shin, new THREE.CylinderGeometry(0.065, 0.048, 0.40, 12), calfCol, 0, -0.20, 0, { rough: 0.72 });

    if (male && ihram) {
      // Bare skin foot + authentic two-strap leather sandal (ankles & heel uncovered)
      add(shin, new THREE.BoxGeometry(0.095, 0.042, 0.21), skin, 0, -0.42, 0.04, { rough: 0.72 });
      add(shin, new THREE.SphereGeometry(0.046, 8, 6), skin, 0, -0.42, 0.13, { sx: 1.0, sy: 0.55, sz: 0.85, rough: 0.72 });
      add(shin, new THREE.BoxGeometry(0.112, 0.022, 0.245), 0x5c4028, 0, -0.455, 0.042, { rough: 0.85 });
      add(shin, new THREE.TorusGeometry(0.052, 0.011, 6, 12, Math.PI), 0x6e4e32, 0, -0.435, 0.085, { rx: -0.25, rough: 0.75 });
      add(shin, new THREE.TorusGeometry(0.054, 0.011, 6, 12, Math.PI), 0x6e4e32, 0, -0.425, 0.02, { rx: -0.35, rough: 0.75 });
    } else {
      const shoeCol = male ? 0x4b3624 : 0x28282e;
      add(shin, new THREE.BoxGeometry(0.112, 0.052, 0.23), shoeCol, 0, -0.425, 0.04, { rough: 0.55 });
      add(shin, new THREE.SphereGeometry(0.055, 10, 8), shoeCol, 0, -0.425, 0.14, { sx: 1.0, sy: 0.52, sz: 0.9, rough: 0.55 });
      add(shin, new THREE.BoxGeometry(0.118, 0.02, 0.25), 0x1b1918, 0, -0.458, 0.042, { rough: 0.9 });
    }
  }

  // Lower draped garment (attached to skirtWrap so it compresses cleanly during kneeling/sujud).
  if (male && ihram) {
    add(rig.skirtWrap, new THREE.CylinderGeometry(0.205, 0.245, 0.62, 18), WHITE, 0, -0.28, 0, { sx: 1.06, sz: 0.92, rough: 0.85 });
    add(rig.skirtWrap, new THREE.BoxGeometry(0.04, 0.61, 0.16), WHITE_SHADE, -0.06, -0.28, 0.16, { ry: 0.18, rough: 0.88 });
    add(rig.skirtWrap, new THREE.CylinderGeometry(0.025, 0.035, 0.58, 8), clothLight, 0.05, -0.29, 0.20, { rough: 0.85 });
    add(rig.skirtWrap, new THREE.CylinderGeometry(0.028, 0.038, 0.58, 8), WHITE_SHADE, 0.02, -0.29, -0.20, { rough: 0.85 });
    add(rig.hips, new THREE.CylinderGeometry(0.214, 0.216, 0.075, 16), 0xc7bea6, 0, 0.035, 0, { sx: 1.07, sz: 0.92, rough: 0.7 });
    add(rig.hips, new THREE.BoxGeometry(0.15, 0.085, 0.045), 0xb5ab92, 0, 0.035, 0.20, { rough: 0.65 });
    add(rig.hips, new THREE.BoxGeometry(0.045, 0.055, 0.052), 0x8f969c, 0, 0.035, 0.205, { rough: 0.35, metal: 0.6 });
  } else if (male) {
    add(rig.skirtWrap, new THREE.CylinderGeometry(0.205, 0.265, 0.78, 18), clothHex, 0, -0.36, 0, { sx: 1.06, sz: 0.92, rough: 0.78 });
    add(rig.skirtWrap, new THREE.CylinderGeometry(0.026, 0.04, 0.74, 8), clothDark, -0.07, -0.37, 0.20, { rough: 0.82 });
    add(rig.skirtWrap, new THREE.CylinderGeometry(0.026, 0.04, 0.74, 8), clothDark, 0.07, -0.37, -0.20, { rough: 0.82 });
  } else {
    add(rig.skirtWrap, new THREE.CylinderGeometry(0.21, 0.34, 0.84, 20), clothHex, 0, -0.39, 0, { sx: 1.05, sz: 0.96, rough: 0.82 });
    for (const [fx, fz] of [[-0.10, 0.24], [0.10, 0.24], [-0.11, -0.24], [0.11, -0.24], [0, 0.26]] as const) {
      add(rig.skirtWrap, new THREE.CylinderGeometry(0.024, 0.045, 0.80, 8), clothDark, fx, -0.40, fz, { rough: 0.85 });
    }
  }

  // Upper torso + tangent-continuous sloped trapezius dome.
  const baseTorsoCol = idtiba ? skin : clothHex;
  const baseRough = idtiba ? 0.72 : 0.8;
  add(rig.upper, new THREE.CylinderGeometry(0.20, 0.188, 0.52, 20), baseTorsoCol, 0, 0.28, 0, { sx: 1.12, sz: 0.84, rough: baseRough });
  add(rig.upper, new THREE.SphereGeometry(0.20, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), baseTorsoCol, 0, 0.538, 0, { sx: 1.12, sy: 0.42, sz: 0.84, rough: baseRough });

  if (idtiba) {
    add(rig.upper, new THREE.CylinderGeometry(0.206, 0.194, 0.30, 20), WHITE, 0.01, 0.17, 0, { sx: 1.13, sz: 0.86, rough: 0.85 });
    add(rig.upper, new THREE.CylinderGeometry(0.208, 0.204, 0.27, 20), WHITE, 0.052, 0.38, 0, { rz: 0.42, sx: 1.06, sz: 0.87, rough: 0.85 });
    add(rig.upper, new THREE.TorusGeometry(0.206, 0.018, 8, 24), WHITE_SHADE, 0.032, 0.39, 0, { sx: 1.12, sy: 0.86, rx: Math.PI / 2, rz: 0.42, rough: 0.86 });
    add(rig.upper, new THREE.SphereGeometry(0.112, 14, 10), WHITE, 0.135, 0.535, 0, { sx: 1.15, sy: 0.58, sz: 1.28, rough: 0.85 });
  } else if (male && ihram) {
    add(rig.upper, new THREE.CylinderGeometry(0.206, 0.202, 0.34, 20), WHITE, 0, 0.36, 0, { sx: 1.14, sz: 0.86, rough: 0.85 });
    add(rig.upper, new THREE.SphereGeometry(0.206, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), WHITE, 0, 0.532, 0, { sx: 1.14, sy: 0.44, sz: 0.86, rough: 0.85 });
    add(rig.upper, new THREE.TorusGeometry(0.207, 0.016, 8, 24), WHITE_SHADE, 0, 0.37, 0, { sx: 1.14, sy: 0.86, rx: Math.PI / 2, rz: 0.32, rough: 0.87 });
    add(rig.upper, new THREE.TorusGeometry(0.086, 0.015, 8, 18), WHITE_SHADE, 0, 0.595, 0.004, { sx: 1.08, sy: 0.92, rx: Math.PI / 2 + 0.08, rough: 0.86 });
  } else if (male) {
    add(rig.upper, new THREE.CylinderGeometry(0.076, 0.086, 0.058, 16), clothLight, 0, 0.605, 0);
    add(rig.upper, new THREE.BoxGeometry(0.032, 0.24, 0.014), clothLight, 0, 0.44, 0.168, { rx: -0.03 });
    for (const by of [0.52, 0.46, 0.40]) {
      add(rig.upper, new THREE.SphereGeometry(0.007, 6, 6), 0xf2efe6, 0, by, 0.176, { rough: 0.4 });
    }
  } else {
    const hijabHex = ihram ? WHITE : shadeHex(L.cloth, 0.65) || 0x2f3a44;
    const hijabShade = ihram ? WHITE_SHADE : shadeHex(hijabHex, 0.88);
    add(rig.upper, new THREE.SphereGeometry(0.155, 18, 10), hijabHex, 0, 0.555, -0.006, { sx: 1.16, sy: 0.54, sz: 0.92, rough: 0.84 });
    add(rig.upper, new THREE.CylinderGeometry(0.13, 0.265, 0.34, 20), hijabHex, 0, 0.43, -0.004, { sx: 1.08, sz: 0.88, rough: 0.84 });
    add(rig.upper, new THREE.TorusGeometry(0.245, 0.014, 8, 22), hijabShade, 0, 0.27, -0.004, { sx: 1.08, sy: 0.88, rx: Math.PI / 2 + 0.04, rough: 0.86 });
  }
}

