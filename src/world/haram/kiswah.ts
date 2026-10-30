import * as THREE from 'three';

export function kiswaMaterial(): THREE.Material[] {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const g = c.getContext('2d')!;
  g.fillStyle = '#101012';
  g.fillRect(0, 0, 1024, 1024);

  // Silk-damask chevron & subtle woven calligraphy waves across the black cloth
  g.strokeStyle = 'rgba(255,255,255,0.042)';
  g.lineWidth = 2;
  for (let y = 16; y < 1024; y += 28) {
    g.beginPath();
    for (let x = 0; x <= 1024; x += 32) {
      g.lineTo(x, y + (x % 64 === 0 ? -7 : 7));
    }
    g.stroke();
  }

  // Embroidered Golden Hizam (Quranic calligraphy belt) with cartouches & silver-gold borders
  const y0 = 285, bh = 96;
  g.fillStyle = '#171614';
  g.fillRect(0, y0, 1024, bh);
  g.strokeStyle = '#d8b254';
  g.lineWidth = 6;
  g.strokeRect(-4, y0 + 5, 1032, bh - 10);
  g.strokeStyle = '#e8cf82';
  g.lineWidth = 2;
  g.strokeRect(-4, y0 + 13, 1032, bh - 26);

  // Ornamental cartouches & stylized Arabic thuluth calligraphy strokes inside Hizam
  for (let cx = 24; cx < 1024; cx += 256) {
    const cw = 208;
    g.strokeStyle = '#d8b254';
    g.lineWidth = 3;
    g.strokeRect(cx, y0 + 20, cw, bh - 40);
    g.strokeStyle = '#f2da8c';
    g.lineWidth = 3.5;
    for (let x = cx + 14; x < cx + cw - 16; x += 22) {
      g.beginPath();
      g.moveTo(x, y0 + bh * 0.62);
      g.quadraticCurveTo(x + 6, y0 + 26, x + 11, y0 + bh * 0.5);
      g.quadraticCurveTo(x + 16, y0 + bh - 26, x + 20, y0 + bh * 0.38);
      g.stroke();
    }
  }

  // Qandil (lantern medallions) below the Hizam
  for (const mx of [128, 384, 640, 896]) {
    const my = y0 + bh + 66;
    g.fillStyle = '#181612';
    g.beginPath(); g.arc(mx, my, 36, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#d8b254';
    g.lineWidth = 4;
    g.stroke();
    g.strokeStyle = '#f0d686';
    g.lineWidth = 2;
    g.beginPath(); g.arc(mx, my, 24, 0, Math.PI * 2); g.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const side = new THREE.MeshStandardMaterial({ map: t, roughness: 0.86 });
  const top = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.9 });
  return [side, side, top, top, side, side];
}
