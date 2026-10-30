import * as THREE from 'three';

/** Wall texture with blind arches and arched windows (one tile ≈ 8 m wide). */
export function archTexture(base = '#e9dfcc', frame = '#b99a68', glass = '#3e4a3f'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 512);
  // Subtle ashlar stone course lines
  g.strokeStyle = 'rgba(110,92,66,0.09)';
  g.lineWidth = 1;
  for (let y = 24; y < 512; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }

  const arch = (x: number, y: number, w: number, h: number) => {
    g.beginPath();
    g.moveTo(x, y + h);
    g.lineTo(x, y + w / 2);
    g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    g.lineTo(x + w, y + h);
    g.closePath();
    g.fillStyle = glass;
    g.fill();
    g.lineWidth = 9;
    g.strokeStyle = frame;
    g.stroke();
    // Subtle inner mashrabiya / mullion grid inside window
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(220,195,145,0.22)';
    g.lineWidth = 2;
    for (let gx = x + 24; gx < x + w; gx += 24) { g.beginPath(); g.moveTo(gx, y); g.lineTo(gx, y + h); g.stroke(); }
    for (let gy = y + 28; gy < y + h; gy += 28) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x + w, gy); g.stroke(); }
    g.restore();
  };
  arch(56, 70, 144, 170);
  arch(40, 300, 176, 212);
  g.fillStyle = frame;
  g.fillRect(0, 0, 256, 16);
  g.fillRect(0, 268, 256, 8);
  // Vertical pilasters at the tile edges.
  g.fillStyle = 'rgba(120,100,70,0.18)';
  g.fillRect(0, 0, 10, 512);
  g.fillRect(246, 0, 10, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Carpet with prayer-row bands and ornamental mihrab border (one tile ≈ 1.25 m). */
export function carpetTexture(base: string, band: string, motif: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = band;
  g.fillRect(0, 0, 128, 12);
  g.strokeStyle = motif;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(20, 22); g.lineTo(20, 96); g.arc(64, 96, 44, Math.PI, 0, true); g.lineTo(108, 22);
  g.stroke();
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(64, 62, 12, 0, Math.PI * 2);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Diamond lattice (brass grille) texture; transparent background when bg is null. */
export function latticeTexture(bg: string | null, line: string, cell = 32): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, 256, 256); }
  g.strokeStyle = line;
  g.lineWidth = 4;
  for (let i = -256; i <= 512; i += cell) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke();
    g.beginPath(); g.moveTo(i, 256); g.lineTo(i + 256, 0); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
