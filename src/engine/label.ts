import * as THREE from 'three';

export interface LabelOpts {
  color?: string;
  bg?: string;
  /** World height of the label in metres. */
  height?: number;
  font?: string;
}

/** Text sprite drawn on a canvas (Thai-capable font). Always faces the camera. */
export function makeLabel(text: string, o: LabelOpts = {}): THREE.Sprite {
  const font = o.font ?? '600 44px "Noto Sans Thai", sans-serif';
  const pad = 22;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  const h = 74;
  c.width = w; c.height = h;
  g.font = font;
  if (o.bg !== 'none') {
    g.fillStyle = o.bg ?? 'rgba(15, 42, 35, 0.9)';
    roundRect(g, 2, 2, w - 4, h - 4, 18);
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    g.stroke();
  }
  g.fillStyle = o.color ?? '#ffffff';
  g.textBaseline = 'middle';
  g.fillText(text, pad, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true });
  const s = new THREE.Sprite(mat);
  const H = o.height ?? 0.6;
  s.scale.set((H * w) / h, H, 1);
  s.renderOrder = 10;
  return s;
}

/** Flat canvas texture for signs / panels. */
export function textTexture(lines: string[], w = 512, h = 256, bg = '#0d2622', color = '#ffffff', size = 64): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${size}px "Noto Sans Thai", sans-serif`;
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.2));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
