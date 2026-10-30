import * as THREE from 'three';
import type { Input } from './input';

export type Collider =
  | { kind: 'box'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: 'circle'; x: number; z: number; r: number }
  /** Solid half-disc on the side of z where sign(z - cz) === side. */
  | { kind: 'halfdisc'; x: number; z: number; r: number; side: -1 | 1 }
  | { kind: 'rect-in'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: 'disc-in'; x: number; z: number; r: number };

export type Gender = 'male' | 'female';
export type Pose = 'stand' | 'raise' | 'ruku' | 'sujud' | 'sit' | 'throw';

export interface Look {
  gender: Gender;
  outfit: 'travel' | 'ihram';
  skin: number;
  cloth: number;
  hair: 'normal' | 'shaved' | 'trimmed';
  /** Men in ihram: right shoulder uncovered (during tawaf al-qudum / umrah tawaf). */
  idtiba?: boolean;
}

const WHITE = 0xf5f3ed;
const WHITE_SHADE = 0xe9e5dc;

/**
 * Articulated, anatomically proportioned 3D pilgrim with realistic garments
 * (ihram rida'/izar/hizam/idtiba, thobe + kufi, layered hijab + abaya),
 * facial features, elbow & knee joints, idle breathing, walk/jog stride, and prayer poses.
 *
 * Coordinate convention: +z = forward, +y = up, -x = anatomical right, +x = anatomical left.
 */
export class Player {
  readonly group = new THREE.Group();
  readonly pos = this.group.position;
  yaw = 0;
  speedMul = 1;
  colliders: Collider[] = [];
  frozen = false;
  moving = false;
  readonly radius = 0.35;
  private walk = 3.2;
  private jogSpeed = 5.8;
  private phase = 0;
  private idleT = 0;
  private pose: Pose = 'stand';
  private raiseT = 0;
  private look: Look;

  private body = new THREE.Group();
  private hips = new THREE.Group();
  private skirtWrap = new THREE.Group();
  private upper = new THREE.Group();
  private headGroup = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private shinL = new THREE.Group();
  private shinR = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private forearmL = new THREE.Group();
  private forearmR = new THREE.Group();
  private meshes: THREE.Mesh[] = [];
  private materials: THREE.Material[] = [];

  constructor(look: Look) {
    this.look = look;
    this.group.add(this.body);
    this.build();
  }

  getLook(): Look { return { ...this.look }; }

  setLook(patch: Partial<Look>) {
    this.look = { ...this.look, ...patch };
    this.build();
  }

  setPose(p: Pose) { this.pose = p; }

  /** Briefly raise the right hand (istilam gesture). */
  raiseHand() { this.raiseT = 1.25; }

  private build() {
    for (const m of this.meshes) { m.geometry.dispose(); m.removeFromParent(); }
    for (const mt of this.materials) mt.dispose();
    this.meshes = [];
    this.materials = [];
    for (const g of [
      this.hips, this.skirtWrap, this.upper, this.headGroup,
      this.legL, this.legR, this.shinL, this.shinR,
      this.armL, this.armR, this.forearmL, this.forearmR,
    ]) {
      g.clear();
      g.rotation.set(0, 0, 0);
    }
    this.body.clear();

    const L = this.look;
    const male = L.gender === 'male';
    const ihram = L.outfit === 'ihram';
    const idtiba = male && ihram && !!L.idtiba;
    const clothHex = ihram ? WHITE : L.cloth;

    const matCache = new Map<string, THREE.MeshStandardMaterial>();
    const getMat = (color: number, rough = 0.78, metal = 0, side: THREE.Side = THREE.FrontSide) => {
      const key = `${color}_${rough}_${metal}_${side}`;
      let mt = matCache.get(key);
      if (!mt) {
        mt = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, side });
        matCache.set(key, mt);
        this.materials.push(mt);
      }
      return mt;
    };

    const shadeHex = (hex: number, mul: number) => {
      const c = new THREE.Color(hex);
      c.multiplyScalar(mul);
      return c.getHex();
    };

    const add = (
      parent: THREE.Object3D,
      geo: THREE.BufferGeometry,
      color: number,
      x = 0, y = 0, z = 0,
      o: { rough?: number; metal?: number; sx?: number; sy?: number; sz?: number; rx?: number; ry?: number; rz?: number; side?: THREE.Side } = {},
    ) => {
      const m = new THREE.Mesh(geo, getMat(color, o.rough ?? 0.78, o.metal ?? 0, o.side ?? THREE.FrontSide));
      m.position.set(x, y, z);
      if (o.sx !== undefined || o.sy !== undefined || o.sz !== undefined) m.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
      if (o.rx || o.ry || o.rz) m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      this.meshes.push(m);
      return m;
    };

    const skin = L.skin;
    const skinDark = shadeHex(skin, 0.88);
    const clothDark = shadeHex(clothHex, 0.90);
    const clothLight = ihram ? 0xfaf9f5 : shadeHex(clothHex, 1.08);
    const hairHex = 0x221a15;

    // Hierarchy: body > hips(0.90) > skirtWrap, upper, legL(+0.105), legR(-0.105)
    this.body.add(this.hips);
    this.hips.position.y = 0.9;
    this.hips.add(this.skirtWrap, this.upper, this.legL, this.legR);
    this.skirtWrap.position.y = 0;

    // Anatomical left (+x) and right (-x) legs with articulated knee joints (shin at y = -0.42).
    this.legL.position.set(0.105, 0, 0);
    this.legR.position.set(-0.105, 0, 0);
    this.shinL.position.set(0, -0.42, 0);
    this.shinR.position.set(0, -0.42, 0);
    this.legL.add(this.shinL);
    this.legR.add(this.shinR);

    const thighCol = male ? (ihram ? WHITE : 0xe6e0d2) : clothDark;
    const calfCol = male ? (ihram ? skin : 0xe6e0d2) : clothDark;
    for (const [leg, shin] of [[this.legL, this.shinL], [this.legR, this.shinR]] as const) {
      // Thigh + knee cap
      add(leg, new THREE.CylinderGeometry(0.082, 0.068, 0.42, 12), thighCol, 0, -0.21, 0);
      add(leg, new THREE.SphereGeometry(0.066, 10, 8), calfCol, 0, -0.42, 0);
      // Calf + ankle
      add(shin, new THREE.CylinderGeometry(0.065, 0.048, 0.40, 12), calfCol, 0, -0.20, 0, { rough: 0.72 });

      if (male && ihram) {
        // Bare skin foot + authentic two-strap leather sandal (ankles & heel uncovered)
        add(shin, new THREE.BoxGeometry(0.095, 0.042, 0.21), skin, 0, -0.42, 0.04, { rough: 0.72 });
        add(shin, new THREE.SphereGeometry(0.046, 8, 6), skin, 0, -0.42, 0.13, { sx: 1.0, sy: 0.55, sz: 0.85, rough: 0.72 });
        // Sandal sole + 2 thin straps
        add(shin, new THREE.BoxGeometry(0.112, 0.022, 0.245), 0x5c4028, 0, -0.455, 0.042, { rough: 0.85 });
        add(shin, new THREE.TorusGeometry(0.052, 0.011, 6, 12, Math.PI), 0x6e4e32, 0, -0.435, 0.085, { rx: -0.25, rough: 0.75 });
        add(shin, new THREE.TorusGeometry(0.054, 0.011, 6, 12, Math.PI), 0x6e4e32, 0, -0.425, 0.02, { rx: -0.35, rough: 0.75 });
      } else {
        // Neat shoe / loafer with distinct dark rubber sole
        const shoeCol = male ? 0x4b3624 : 0x28282e;
        add(shin, new THREE.BoxGeometry(0.112, 0.052, 0.23), shoeCol, 0, -0.425, 0.04, { rough: 0.55 });
        add(shin, new THREE.SphereGeometry(0.055, 10, 8), shoeCol, 0, -0.425, 0.14, { sx: 1.0, sy: 0.52, sz: 0.9, rough: 0.55 });
        add(shin, new THREE.BoxGeometry(0.118, 0.02, 0.25), 0x1b1918, 0, -0.458, 0.042, { rough: 0.9 });
      }
    }

    // Lower draped garment (attached to skirtWrap so it compresses cleanly during kneeling/sujud).
    if (male && ihram) {
      // Izar wrap ending above the bare ankles, with vertical overlap flap & pleat ridges
      add(this.skirtWrap, new THREE.CylinderGeometry(0.205, 0.245, 0.62, 18), WHITE, 0, -0.28, 0, { sx: 1.06, sz: 0.92, rough: 0.85 });
      add(this.skirtWrap, new THREE.BoxGeometry(0.04, 0.61, 0.16), WHITE_SHADE, -0.06, -0.28, 0.16, { ry: 0.18, rough: 0.88 });
      add(this.skirtWrap, new THREE.CylinderGeometry(0.025, 0.035, 0.58, 8), clothLight, 0.05, -0.29, 0.20, { rough: 0.85 });
      add(this.skirtWrap, new THREE.CylinderGeometry(0.028, 0.038, 0.58, 8), WHITE_SHADE, 0.02, -0.29, -0.20, { rough: 0.85 });
      // Hizam (ihram money belt + front pouch clasp)
      add(this.hips, new THREE.CylinderGeometry(0.214, 0.216, 0.075, 16), 0xc7bea6, 0, 0.035, 0, { sx: 1.07, sz: 0.92, rough: 0.7 });
      add(this.hips, new THREE.BoxGeometry(0.15, 0.085, 0.045), 0xb5ab92, 0, 0.035, 0.20, { rough: 0.65 });
      add(this.hips, new THREE.BoxGeometry(0.045, 0.055, 0.052), 0x8f969c, 0, 0.035, 0.205, { rough: 0.35, metal: 0.6 });
    } else if (male) {
      // Full-length tailored thobe skirt with vertical pleat shading
      add(this.skirtWrap, new THREE.CylinderGeometry(0.205, 0.265, 0.78, 18), clothHex, 0, -0.36, 0, { sx: 1.06, sz: 0.92, rough: 0.78 });
      add(this.skirtWrap, new THREE.CylinderGeometry(0.026, 0.04, 0.74, 8), clothDark, -0.07, -0.37, 0.20, { rough: 0.82 });
      add(this.skirtWrap, new THREE.CylinderGeometry(0.026, 0.04, 0.74, 8), clothDark, 0.07, -0.37, -0.20, { rough: 0.82 });
    } else {
      // Flowing A-line modest abaya / ihram gown with soft vertical pleats
      add(this.skirtWrap, new THREE.CylinderGeometry(0.21, 0.34, 0.84, 20), clothHex, 0, -0.39, 0, { sx: 1.05, sz: 0.96, rough: 0.82 });
      for (const [fx, fz] of [[-0.10, 0.24], [0.10, 0.24], [-0.11, -0.24], [0.11, -0.24], [0, 0.26]] as const) {
        add(this.skirtWrap, new THREE.CylinderGeometry(0.024, 0.045, 0.80, 8), clothDark, fx, -0.40, fz, { rough: 0.85 });
      }
    }

    // Upper torso (anatomically elliptical: broader shoulders across X, slimmer front-to-back Z)
    // + tangent-continuous sloped trapezius dome (no protruding shoulder balls or boxy sash corners).
    const baseTorsoCol = idtiba ? skin : clothHex;
    const baseRough = idtiba ? 0.72 : 0.8;
    add(this.upper, new THREE.CylinderGeometry(0.20, 0.188, 0.52, 20), baseTorsoCol, 0, 0.28, 0, { sx: 1.12, sz: 0.84, rough: baseRough });
    add(this.upper, new THREE.SphereGeometry(0.20, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), baseTorsoCol, 0, 0.538, 0, { sx: 1.12, sy: 0.42, sz: 0.84, rough: baseRough });

    if (idtiba) {
      // Idtiba: right shoulder (-x) and upper right chest bare skin; curved white rida' wrapped under right armpit & over left shoulder (+x)
      add(this.upper, new THREE.CylinderGeometry(0.206, 0.194, 0.30, 20), WHITE, 0.01, 0.17, 0, { sx: 1.13, sz: 0.86, rough: 0.85 });
      add(this.upper, new THREE.CylinderGeometry(0.208, 0.204, 0.27, 20), WHITE, 0.052, 0.38, 0, { rz: 0.42, sx: 1.06, sz: 0.87, rough: 0.85 });
      // Diagonal towel edge fold hugging elliptical chest & back + soft left-shoulder (+x) shawl cap
      add(this.upper, new THREE.TorusGeometry(0.206, 0.018, 8, 24), WHITE_SHADE, 0.032, 0.39, 0, { sx: 1.12, sy: 0.86, rx: Math.PI / 2, rz: 0.42, rough: 0.86 });
      add(this.upper, new THREE.SphereGeometry(0.112, 14, 10), WHITE, 0.135, 0.535, 0, { sx: 1.15, sy: 0.58, sz: 1.28, rough: 0.85 });
    } else if (male && ihram) {
      // Full Rida' shawl draped smoothly over both shoulders with curved diagonal towel fold
      add(this.upper, new THREE.CylinderGeometry(0.206, 0.202, 0.34, 20), WHITE, 0, 0.36, 0, { sx: 1.14, sz: 0.86, rough: 0.85 });
      add(this.upper, new THREE.SphereGeometry(0.206, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), WHITE, 0, 0.532, 0, { sx: 1.14, sy: 0.44, sz: 0.86, rough: 0.85 });
      add(this.upper, new THREE.TorusGeometry(0.207, 0.016, 8, 24), WHITE_SHADE, 0, 0.37, 0, { sx: 1.14, sy: 0.86, rx: Math.PI / 2, rz: 0.32, rough: 0.87 });
      add(this.upper, new THREE.TorusGeometry(0.086, 0.015, 8, 18), WHITE_SHADE, 0, 0.595, 0.004, { sx: 1.08, sy: 0.92, rx: Math.PI / 2 + 0.08, rough: 0.86 });
    } else if (male) {
      // Tailored thobe Mandarin collar, chest placket strip & subtle buttons
      add(this.upper, new THREE.CylinderGeometry(0.076, 0.086, 0.058, 16), clothLight, 0, 0.605, 0);
      add(this.upper, new THREE.BoxGeometry(0.032, 0.24, 0.014), clothLight, 0, 0.44, 0.168, { rx: -0.03 });
      for (const by of [0.52, 0.46, 0.40]) {
        add(this.upper, new THREE.SphereGeometry(0.007, 6, 6), 0xf2efe6, 0, by, 0.176, { rough: 0.4 });
      }
    } else {
      // Flowing modest Khimar cape draping smoothly from neck cowl over shoulders, chest & back
      const hijabHex = ihram ? WHITE : shadeHex(L.cloth, 0.65) || 0x2f3a44;
      const hijabShade = ihram ? WHITE_SHADE : shadeHex(hijabHex, 0.88);
      add(this.upper, new THREE.SphereGeometry(0.155, 18, 10), hijabHex, 0, 0.555, -0.006, { sx: 1.16, sy: 0.54, sz: 0.92, rough: 0.84 });
      add(this.upper, new THREE.CylinderGeometry(0.13, 0.265, 0.34, 20), hijabHex, 0, 0.43, -0.004, { sx: 1.08, sz: 0.88, rough: 0.84 });
      add(this.upper, new THREE.TorusGeometry(0.245, 0.014, 8, 22), hijabShade, 0, 0.27, -0.004, { sx: 1.08, sy: 0.88, rx: Math.PI / 2 + 0.04, rough: 0.86 });
    }

    // Neck + Sculpted Head Group (headGroup pivot at y = 0.72 on upper).
    add(this.upper, new THREE.CylinderGeometry(0.056, 0.066, 0.13, 12), skin, 0, 0.65, 0, { rough: 0.72 });
    this.headGroup.position.set(0, 0.72, 0);
    this.upper.add(this.headGroup);

    // Cranium + tapered jaw/chin for realistic human head silhouette
    add(this.headGroup, new THREE.SphereGeometry(0.138, 20, 16), skin, 0, 0.13, 0, { sx: 0.94, sy: 1.06, sz: 0.98, rough: 0.72 });
    add(this.headGroup, new THREE.SphereGeometry(0.098, 14, 10), skin, 0, 0.065, 0.028, { sx: 0.92, sy: 0.88, sz: 0.95, rough: 0.72 });

    // Subtle nose, eyes, eyebrows & mouth (+z is forward)
    add(this.headGroup, new THREE.ConeGeometry(0.021, 0.058, 8), skinDark, 0, 0.115, 0.138, { rx: Math.PI * 0.42, rough: 0.74 });
    for (const s of [-1, 1]) {
      // Sclera + dark iris
      add(this.headGroup, new THREE.SphereGeometry(0.019, 8, 6), 0xfaf8f5, s * 0.046, 0.138, 0.122, { sx: 1.15, sy: 0.75, sz: 0.45, rough: 0.4 });
      add(this.headGroup, new THREE.SphereGeometry(0.011, 8, 6), 0x1d1612, s * 0.046, 0.138, 0.130, { sx: 1.0, sy: 1.0, sz: 0.5, rough: 0.25 });
      // Eyebrow arch
      add(this.headGroup, new THREE.BoxGeometry(0.036, 0.008, 0.012), hairHex, s * 0.047, 0.162, 0.126, { rz: -s * 0.08, rough: 0.9 });
    }
    // Warm subtle mouth line
    add(this.headGroup, new THREE.BoxGeometry(0.042, 0.008, 0.012), shadeHex(skin, 0.72), 0, 0.068, 0.122, { rough: 0.75 });

    if (male) {
      // Sculpted ears
      for (const s of [-1, 1]) {
        add(this.headGroup, new THREE.SphereGeometry(0.032, 8, 8), skinDark, s * 0.130, 0.122, -0.008, { sx: 0.42, sy: 1.08, sz: 0.72, rough: 0.75 });
      }
      // Neat trimmed beard & mustache along jawline
      add(this.headGroup, new THREE.SphereGeometry(0.102, 14, 10, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.48), hairHex, 0, 0.082, 0.032, { sx: 0.94, sy: 0.92, sz: 1.02, rough: 0.92 });
      add(this.headGroup, new THREE.BoxGeometry(0.052, 0.011, 0.016), hairHex, 0, 0.082, 0.126, { rough: 0.92 });

      // Hair & Kufi prayer cap states ('normal' | 'trimmed' | 'shaved')
      if (!ihram) {
        // Knitted white Taqiyah / Kufi cap + ribbed band
        add(this.headGroup, new THREE.SphereGeometry(0.141, 18, 10, 0, Math.PI * 2, 0, 1.22), 0xf7f5ef, 0, 0.138, -0.004, { sx: 0.95, sy: 1.04, sz: 0.99, rough: 0.85 });
        add(this.headGroup, new THREE.TorusGeometry(0.128, 0.012, 8, 22), 0xeae6dc, 0, 0.185, -0.004, { rx: Math.PI / 2 + 0.08, sx: 0.94, sy: 0.98, rough: 0.85 });
        if (L.hair === 'normal') {
          // Hair nape & sideburns peeking neatly below kufi
          add(this.headGroup, new THREE.SphereGeometry(0.139, 16, 10, Math.PI * 0.65, Math.PI * 1.7, 0.95, 0.95), hairHex, 0, 0.132, -0.006, { ry: Math.PI / 2, sx: 0.99, sy: 1.02, sz: 0.96, rough: 0.92 });
        } else if (L.hair === 'trimmed') {
          add(this.headGroup, new THREE.SphereGeometry(0.136, 14, 8, Math.PI * 0.72, Math.PI * 1.56, 1.0, 0.75), 0x332820, 0, 0.132, -0.006, { ry: Math.PI / 2, sx: 0.99, sy: 1.02, sz: 0.95, rough: 0.92 });
        }
      } else {
        // Ihram: head uncovered!
        if (L.hair === 'normal') {
          add(this.headGroup, new THREE.SphereGeometry(0.143, 18, 12, 0, Math.PI * 2, 0, 1.58), hairHex, 0, 0.136, -0.012, { rx: -0.28, sx: 0.96, sy: 1.06, sz: 1.0, rough: 0.9 });
          for (const s of [-1, 1]) {
            add(this.headGroup, new THREE.BoxGeometry(0.018, 0.055, 0.028), hairHex, s * 0.124, 0.125, 0.032, { rough: 0.9 });
          }
        } else if (L.hair === 'trimmed') {
          // Visibly shorter cropped hair after taqsir
          add(this.headGroup, new THREE.SphereGeometry(0.1395, 18, 12, 0, Math.PI * 2, 0, 1.48), 0x322720, 0, 0.133, -0.010, { rx: -0.25, sx: 0.95, sy: 1.05, sz: 0.99, rough: 0.92 });
        } else {
          // Clean-shaven scalp after halq (subtle warm scalp tone)
          add(this.headGroup, new THREE.SphereGeometry(0.1385, 18, 12, 0, Math.PI * 2, 0, 1.42), shadeHex(skin, 0.94), 0, 0.131, -0.008, { rx: -0.22, sx: 0.94, sy: 1.06, sz: 0.98, rough: 0.62 });
        }
      }
    } else {
      // Female head: open-front hijab hood + neat forehead underscarf framing the uncovered skin face (+z)
      const hijabHex = ihram ? WHITE : shadeHex(L.cloth, 0.65) || 0x2f3a44;
      const underHex = ihram ? WHITE_SHADE : 0xede8df;
      // Inner forehead underscarf cap (pole rotated to -z so front rim sits neatly above eyebrows)
      add(this.headGroup, new THREE.SphereGeometry(0.141, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.61), underHex, 0, 0.136, 0.002, {
        rx: -Math.PI / 2 + 0.26, sx: 0.95, sy: 0.98, sz: 1.06, rough: 0.85, side: THREE.DoubleSide,
      });
      // Outer hijab hood (pole at -z back of head; open oval front rim frames cheeks, forehead & chin cleanly)
      add(this.headGroup, new THREE.SphereGeometry(0.149, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.63), hijabHex, 0, 0.132, -0.006, {
        rx: -Math.PI / 2 + 0.15, sx: 0.96, sy: 0.99, sz: 1.10, rough: 0.84, side: THREE.DoubleSide,
      });
      // Soft chin & neck wrap connecting smoothly into the chest khimar without covering the chin front
      add(this.headGroup, new THREE.CylinderGeometry(0.106, 0.138, 0.13, 18), hijabHex, 0, 0.002, -0.016, { sx: 0.96, sz: 0.94, rough: 0.84 });
    }

    // Articulated two-segment arms: armL (+0.214) & armR (-0.214) with smooth deltoid caps & elbow joints (forearm at y = -0.25).
    this.armL.position.set(0.214, 0.515, 0);
    this.armR.position.set(-0.214, 0.515, 0);
    this.forearmL.position.set(0, -0.25, 0);
    this.forearmR.position.set(0, -0.25, 0);
    this.armL.add(this.forearmL);
    this.armR.add(this.forearmR);
    this.upper.add(this.armL, this.armR);

    const buildArm = (upperArm: THREE.Group, forearm: THREE.Group, isRight: boolean) => {
      const bareArm = idtiba && isRight;
      const bareForearm = male && ihram;
      const ihramSleeve = !bareArm && male && ihram;
      const upperCol = bareArm ? skin : (ihramSleeve ? WHITE : clothHex);
      const foreCol = bareForearm ? skin : clothHex;
      const topR = ihramSleeve ? 0.068 : 0.062;
      const midR = ihramSleeve ? 0.060 : 0.052;

      // Tangent-continuous deltoid cap at pivot (0, 0, 0) + upper arm + elbow sphere
      add(upperArm, new THREE.SphereGeometry(topR, 12, 10), upperCol, 0, 0, 0, { rough: bareArm ? 0.72 : 0.82 });
      add(upperArm, new THREE.CylinderGeometry(topR, midR, 0.25, 12), upperCol, 0, -0.125, 0, { rough: bareArm ? 0.72 : 0.82 });
      if (ihramSleeve) {
        add(upperArm, new THREE.TorusGeometry(0.058, 0.007, 6, 14), WHITE_SHADE, 0, -0.23, 0, { rx: Math.PI / 2, rough: 0.86 });
      }
      add(upperArm, new THREE.SphereGeometry(0.051, 10, 8), foreCol, 0, -0.25, 0, { rough: bareForearm ? 0.72 : 0.8 });

      // Forearm + cuff + sculpted palm & thumb
      add(forearm, new THREE.CylinderGeometry(0.051, 0.039, 0.235, 12), foreCol, 0, -0.118, 0, { rough: bareForearm ? 0.72 : 0.8 });
      if (!bareForearm) {
        add(forearm, new THREE.CylinderGeometry(0.045, 0.045, 0.032, 12), clothLight, 0, -0.225, 0);
      }
      const sgn = isRight ? -1 : 1;
      add(forearm, new THREE.SphereGeometry(0.043, 10, 8), skin, 0, -0.268, 0.008, { sx: 0.68, sy: 1.18, sz: 0.92, rough: 0.72 });
      add(forearm, new THREE.SphereGeometry(0.017, 6, 6), skinDark, -sgn * 0.022, -0.255, 0.038, { sx: 0.8, sy: 1.2, sz: 0.8, rough: 0.72 });
    };

    buildArm(this.armL, this.forearmL, false);
    buildArm(this.armR, this.forearmR, true);
  }

  update(dt: number, input: Input) {
    const a = input.axis();
    const len = Math.hypot(a.x, a.y);
    this.moving = !this.frozen && this.pose === 'stand' && len > 0.05;
    let speed = 0;
    if (this.moving) {
      const fx = -Math.sin(input.yaw), fz = -Math.cos(input.yaw);
      const rx = Math.cos(input.yaw), rz = -Math.sin(input.yaw);
      let dx = fx * a.y + rx * a.x, dz = fz * a.y + rz * a.x;
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl; dz /= dl;
      speed = (input.jog ? this.jogSpeed : this.walk) * this.speedMul * Math.min(len, 1);
      this.pos.x += dx * speed * dt;
      this.pos.z += dz * speed * dt;
      const target = Math.atan2(dx, dz);
      let d = target - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, dt * 12);
    }
    this.resolve();
    this.group.rotation.y = this.yaw;
    this.animate(dt, speed);
  }

  private resolve() {
    const r = this.radius;
    const p = this.pos;
    for (const c of this.colliders) {
      switch (c.kind) {
        case 'box': {
          const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
          const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
          const dx = p.x - cx, dz = p.z - cz;
          const d = Math.hypot(dx, dz);
          if (d === 0) {
            // Centre inside: push out through the nearest edge.
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

  private animate(dt: number, speed: number) {
    this.idleT += dt;
    const k = Math.min(1, dt * 11);
    const breath = Math.sin(this.idleT * 2.1);

    let hipsY = 0.9;
    let upperX = 0, upperY = 0;
    let headX = 0;
    let legLX = 0, legRX = 0, shinLX = 0, shinRX = 0;
    let armLX = -0.05, armRX = -0.05;
    let armLZ = -0.05, armRZ = 0.05;
    let foreLX = -0.18, foreRX = -0.18;

    if (this.pose === 'stand') {
      if (speed > 0.05) {
        const jogFactor = Math.min(1, Math.max(0, (speed - 3.4) / 2.4));
        this.phase += dt * speed * 3.05;
        const s = Math.sin(this.phase);
        const c = Math.cos(this.phase);
        const stride = 0.48 + jogFactor * 0.24;

        // Opposite arm/leg swing + natural knee lift during forward leg swing
        legLX = s * stride;
        legRX = -s * stride;
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
        // Subtle alive idle breathing
        upperX = breath * 0.012;
        armLZ = -0.055 - breath * 0.012;
        armRZ = 0.055 + breath * 0.012;
        foreLX = -0.16 - breath * 0.02;
        foreRX = -0.16 - breath * 0.02;
      }
      if (this.raiseT > 0) {
        this.raiseT -= dt;
        // Right hand (-x) raised gracefully in Istilam gesture
        armRX = -2.05;
        armRZ = 0.16;
        foreRX = -0.55;
      }
    } else if (this.pose === 'raise') {
      // Hands raised with bent elbows in Du'a / Takbir posture
      armLX = -1.48; armRX = -1.48;
      armLZ = 0.14; armRZ = -0.14;
      foreLX = -1.12; foreRX = -1.12;
      headX = -0.08;
    } else if (this.pose === 'ruku') {
      // Bowing with back level and hands reaching knees
      hipsY = 0.87;
      upperX = 1.42;
      headX = -0.35;
      legLX = 0.04; legRX = 0.04;
      armLX = -0.82; armRX = -0.82;
      foreLX = -0.22; foreRX = -0.22;
    } else if (this.pose === 'sujud') {
      // Authentic prostration: knees & shins folded on mat, forehead & palms touching floor
      hipsY = 0.44;
      legLX = -0.52; legRX = -0.52;
      shinLX = 2.02; shinRX = 2.02;
      upperX = 1.92;
      headX = -0.35;
      armLX = -1.42; armRX = -1.42;
      armLZ = -0.22; armRZ = 0.22;
      foreLX = -0.88; foreRX = -0.88;
    } else if (this.pose === 'sit') {
      // Authentic kneeling (jalsah / tashahhud): shins folded backward under thighs, hands on knees
      hipsY = 0.30;
      legLX = -1.16; legRX = -1.16;
      shinLX = 2.66; shinRX = 2.66;
      upperX = 0.05;
      armLX = -0.48; armRX = -0.48;
      armLZ = 0.08; armRZ = -0.08;
      foreLX = -0.68; foreRX = -0.68;
    } else if (this.pose === 'throw') {
      // Right hand throwing pebble forward
      upperX = -0.06;
      upperY = 0.16;
      armRX = -2.05;
      armRZ = 0.12;
      foreRX = -0.45;
      armLX = 0.15;
      foreLX = -0.35;
    }

    this.hips.position.y += (hipsY - this.hips.position.y) * k;
    // Compress lower skirt smoothly when kneeling so cloth never clips beneath floor y = 0
    const skirtScale = Math.min(1, Math.max(0.32, (this.hips.position.y - 0.04) / 0.86));
    this.skirtWrap.scale.y = skirtScale;

    this.upper.rotation.x += (upperX - this.upper.rotation.x) * k;
    this.upper.rotation.y += (upperY - this.upper.rotation.y) * k;
    this.headGroup.rotation.x += (headX - this.headGroup.rotation.x) * k;

    this.legL.rotation.x += (legLX - this.legL.rotation.x) * k;
    this.legR.rotation.x += (legRX - this.legR.rotation.x) * k;
    this.shinL.rotation.x += (shinLX - this.shinL.rotation.x) * k;
    this.shinR.rotation.x += (shinRX - this.shinR.rotation.x) * k;

    this.armL.rotation.x += (armLX - this.armL.rotation.x) * k;
    this.armR.rotation.x += (armRX - this.armR.rotation.x) * k;
    this.armL.rotation.z += (armLZ - this.armL.rotation.z) * k;
    this.armR.rotation.z += (armRZ - this.armR.rotation.z) * k;
    this.forearmL.rotation.x += (foreLX - this.forearmL.rotation.x) * k;
    this.forearmR.rotation.x += (foreRX - this.forearmR.rotation.x) * k;
  }
}

const _camTarget = new THREE.Vector3();
const _camWant = new THREE.Vector3();

/** Third-person camera that orbits the player using the Input's yaw/pitch/dist. */
export function followCamera(cam: THREE.PerspectiveCamera, player: Player, input: Input, dt: number) {
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
