import * as THREE from 'three';

export type Quality = 'low' | 'high';

/** Renderer, scene, camera, lights and the frame loop. */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  readonly quality: Quality;
  readonly isTouch: boolean;
  private readonly tickers = new Set<(dt: number) => void>();
  private readonly clock = new THREE.Clock();

  constructor(canvas: HTMLCanvasElement) {
    this.isTouch = matchMedia('(pointer: coarse)').matches;
    this.quality = this.isTouch || innerWidth < 768 ? 'low' : 'high';
    const high = this.quality === 'high';

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: high, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 2 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = high;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1500);

    this.scene.background = skyTexture();
    this.scene.fog = new THREE.Fog(0xd8e2ec, 140, 700);

    this.scene.add(new THREE.HemisphereLight(0xe4eeff, 0xb8a07c, 1.15));
    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
    this.sun.position.set(40, 90, 30);
    if (high) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const s = this.sun.shadow.camera;
      s.left = -45; s.right = 45; s.top = 45; s.bottom = -45; s.near = 10; s.far = 220;
      this.sun.shadow.bias = -0.0004;
    }
    this.scene.add(this.sun, this.sun.target);

    const resize = () => {
      this.renderer.setSize(innerWidth, innerHeight, false);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
    };
    addEventListener('resize', resize);
    resize();
  }

  onTick(fn: (dt: number) => void): () => void {
    this.tickers.add(fn);
    return () => this.tickers.delete(fn);
  }

  /** Keep the shadow camera centred on the player. */
  followSun(target: THREE.Vector3) {
    this.sun.position.set(target.x + 40, 90, target.z + 30);
    this.sun.target.position.copy(target);
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.tickers.forEach((fn) => fn(dt));
      this.renderer.render(this.scene, this.camera);
    });
  }
}

function skyTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#6f9fd6');
  grad.addColorStop(0.55, '#b9d2ea');
  grad.addColorStop(1, '#efe6d6');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
