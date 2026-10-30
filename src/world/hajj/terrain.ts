import * as THREE from 'three';
import { createPropFieldLOD, keepAlive, type PropInstance } from '../../engine/lod';

/** Shared terrain, sky and RNG helpers for the Hajj sites (Mina, Arafah, Muzdalifah, Jamarat). */

/** Deterministic random numbers so each site looks the same every visit. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Speckled ground texture (sand, gravel, asphalt). */
export function speckTexture(base: string, specks: string[], n = 2200, size = 256, repeat = 40): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const r = rng(size + n);
  for (let i = 0; i < n; i++) {
    g.fillStyle = specks[i % specks.length];
    const s = 0.6 + r() * 1.8;
    g.fillRect(r() * size, r() * size, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

/** Flat ground plane centred at (x, z). */
export function ground(parent: THREE.Object3D, w: number, d: number, m: THREE.Material, x = 0, z = 0, y = 0) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

let _mtnGeo: THREE.BufferGeometry | null = null;
let _mtnMat: THREE.MeshStandardMaterial | null = null;
function getMountainAssets() {
  if (_mtnGeo && _mtnMat) return { geo: _mtnGeo, m: _mtnMat };
  const raw = new THREE.IcosahedronGeometry(1, 2);
  const pos = raw.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // Flatten below base and carve craggy desert granite ridges
    if (y < -0.15) y = -0.15 + (y + 0.15) * 0.2;
    const hNorm = Math.max(0, Math.min(1, (y + 0.18) / 1.18));
    const ridge = 1 - Math.abs(Math.sin(x * 3.8 + z * 2.7)) * 0.24 - Math.abs(Math.cos(z * 4.3 - x * 2.1)) * 0.16;
    const strata = 1 + Math.sin(y * 11.0) * 0.035;
    const radXZ = (1.18 - hNorm * 0.55) * ridge * strata;
    x *= radXZ;
    z *= radXZ;
    y = y * (0.85 + ridge * 0.28);
    pos.setXYZ(i, x, y, z);

    // Elevation shading: darker warm scree base -> sun-bleached rocky crest
    const shade = 0.72 + hNorm * 0.36;
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade * 0.98;
    colors[i * 3 + 2] = shade * 0.94;
  }
  raw.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  raw.computeVertexNormals();
  raw.computeBoundingSphere();
  _mtnGeo = keepAlive(raw);
  _mtnMat = keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, flatShading: true, vertexColors: true }));
  return { geo: _mtnGeo, m: _mtnMat };
}

/** Ring of craggy Hijaz granite mountains around the site (frustum-culled per mountain). */
export function mountainRing(parent: THREE.Object3D, o: { count: number; rMin: number; rMax: number; hMin: number; hMax: number; color?: number; seed?: number; cx?: number; cz?: number }) {
  const r = rng(o.seed ?? 7);
  const { geo, m } = getMountainAssets();
  const baseCol = new THREE.Color(o.color ?? 0x8c6f55);
  const cTmp = new THREE.Color();
  const instances: PropInstance[] = [];
  for (let i = 0; i < o.count; i++) {
    const a = (i / o.count) * Math.PI * 2 + r() * 0.2;
    const rad = o.rMin + r() * (o.rMax - o.rMin);
    const h = o.hMin + r() * (o.hMax - o.hMin);
    const w = h * (1.35 + r() * 1.15);
    const tint = 0.92 + r() * 0.16;
    cTmp.copy(baseCol).multiplyScalar(tint);
    instances.push({
      x: (o.cx ?? 0) + Math.cos(a) * rad,
      y: h * 0.08,
      z: (o.cz ?? 0) + Math.sin(a) * rad,
      yaw: r() * Math.PI * 2,
      sx: w,
      sy: h,
      sz: w * (0.72 + r() * 0.56),
      color: cTmp.getHex(),
    });
  }
  return createPropFieldLOD(parent, instances, [{ maxDist: 920, layers: [{ geo, mat: m, castShadow: false, receiveShadow: true, useColor: true }] }], 1.25, 0.35);
}

/** Night sky: a dome of stars whose opacity follows the time of day. */
export function starField(count = 900) {
  const r = rng(99);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const e = Math.asin(0.08 + r() * 0.92);
    const R = 900;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * R;
    pos[i * 3 + 1] = Math.sin(e) * R;
    pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * R;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const points = new THREE.Points(geo, m);
  points.frustumCulled = false;
  points.visible = false;
  return {
    points,
    setOpacity(v: number) { m.opacity = v; points.visible = v > 0.01; },
  };
}

/** Qibla from Mina, Arafah, Muzdalifah and the Jamarat: Makkah lies to the west (-x). */
export const QIBLA_WEST = -Math.PI / 2;
