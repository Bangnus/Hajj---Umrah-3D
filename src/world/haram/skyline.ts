import * as THREE from 'three';
import { mergeParts } from '../../engine/lod';
import { mat } from '../common';

export function addClockTower(group: THREE.Group) {
  // Makkah Royal Clock Tower (Abraj Al Bait) complex to the south (+z = 190).
  const clockTower = new THREE.Mesh(
    mergeParts([
      // Podium & flanking wing towers
      { geo: new THREE.BoxGeometry(74, 85, 32), x: 10, y: 42.5, z: 196, color: 0xc9beaa, aoBottom: 0.82 },
      { geo: new THREE.BoxGeometry(18, 145, 22), x: -20, y: 72.5, z: 194, color: 0xd1c7b4, aoBottom: 0.85 },
      { geo: new THREE.BoxGeometry(18, 145, 22), x: 40, y: 72.5, z: 194, color: 0xd1c7b4, aoBottom: 0.85 },
      // Central clock shaft + emerald clock bezel + corner golden domes
      { geo: new THREE.BoxGeometry(28, 224, 28), x: 10, y: 112, z: 190, color: 0xd8cfc0, aoBottom: 0.85 },
      { geo: new THREE.BoxGeometry(26, 28, 28.6), x: 10, y: 195, z: 190, color: 0x1c5942 },
      { geo: new THREE.BoxGeometry(30, 3.5, 30), x: 10, y: 212, z: 190, color: 0xcbbca2 },
      // Stepped spire + golden crescent (Hilal)
      { geo: new THREE.BoxGeometry(16, 24, 16), x: 10, y: 225, z: 190, color: 0xe2dacb },
      { geo: new THREE.ConeGeometry(5.5, 52, 12), x: 10, y: 263, z: 190, color: 0xd6b25a },
      { geo: new THREE.TorusGeometry(3.8, 0.55, 8, 20, Math.PI * 1.4), x: 10, y: 293, z: 190, rz: Math.PI * 0.8, color: 0xf0cf70 },
    ]),
    mat(0xffffff, 0.62, { vertexColors: true }),
  );
  group.add(clockTower);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(21, 21), new THREE.MeshBasicMaterial({ map: clockFaceTexture() }));
  face.position.set(10, 195, 175.6);
  face.rotation.y = Math.PI;
  group.add(face);
}

function clockFaceTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#194f3a';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#d6b25a';
  g.lineWidth = 8;
  g.strokeRect(8, 8, 240, 240);
  g.fillStyle = '#f7f4ea';
  g.beginPath(); g.arc(128, 128, 102, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#c9a24a';
  g.lineWidth = 5;
  g.stroke();
  // Hour ticks
  g.strokeStyle = '#174432';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.lineWidth = i % 3 === 0 ? 5 : 3;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * 80, 128 + Math.sin(a) * 80);
    g.lineTo(128 + Math.cos(a) * 95, 128 + Math.sin(a) * 95);
    g.stroke();
  }
  // Clock hands
  g.strokeStyle = '#122920';
  g.lineCap = 'round';
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 68); g.stroke();
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(128, 128); g.lineTo(172, 104); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
