import * as THREE from 'three';

export type Quality = 'low' | 'high';

/** Renderer, scene, camera, lights and the frame loop. */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly quality: Quality;
  readonly isTouch: boolean;
  private readonly tickers = new Set<(dt: number) => void>();
  private readonly clock = new THREE.Clock();
  /** Sun position relative to the player (changed by setTimeOfDay). */
  private readonly sunOffset = new THREE.Vector3(40, 90, 30);
  private readonly skyTex = skyTexture();

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

    this.scene.background = this.skyTex;
    this.scene.fog = new THREE.Fog(0xd8e2ec, 140, 700);

    this.hemi = new THREE.HemisphereLight(0xe4eeff, 0xb8a07c, 1.15);
    this.scene.add(this.hemi);
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
    this.sun.position.set(target.x + this.sunOffset.x, this.sunOffset.y, target.z + this.sunOffset.z);
    this.sun.target.position.copy(target);
  }

  /**
   * Lighting for a time of day: 0 = sunrise, 0.5 = noon, 1 = sunset, 1.25+ = night,
   * negative = before dawn (-0.25 or lower = night). null restores the default daylight.
   */
  setTimeOfDay(t: number | null) {
    const fog = this.scene.fog as THREE.Fog;
    if (t === null) {
      this.sunOffset.set(40, 90, 30);
      this.sun.color.setHex(0xfff0d8);
      this.sun.intensity = 2.3;
      this.hemi.color.setHex(0xe4eeff);
      this.hemi.groundColor.setHex(0xb8a07c);
      this.hemi.intensity = 1.15;
      fog.color.setHex(0xd8e2ec);
      fog.near = 140; fog.far = 700;
      paintSky(this.skyTex, SKY.day);
      return;
    }
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const smooth = (v: number) => v * v * (3 - 2 * v);
    const day = clamp(t);
    const elev = Math.sin(Math.PI * day);
    const night = t > 1 ? smooth(clamp((t - 1) / 0.25)) : t < 0 ? smooth(clamp(-t / 0.25)) : 0;
    const gold = (1 - smooth(clamp(elev / 0.45))) * (1 - night);
    const dayW = 1 - Math.max(gold, night);
    // Sun travels from east (+x) through the sky to west (-x); at night a dim moon stands high.
    const az = Math.PI * day;
    this.sunOffset.set(Math.cos(az) * 100, Math.max(8, elev * 100), 30)
      .lerp(new THREE.Vector3(-30, 90, 20), night);
    const mix3 = (out: THREE.Color, d: number, g: number, n: number) => {
      const c = new THREE.Color(d).multiplyScalar(dayW);
      c.add(new THREE.Color(g).multiplyScalar(gold));
      c.add(new THREE.Color(n).multiplyScalar(night));
      return out.copy(c);
    };
    mix3(this.sun.color, 0xfff0d8, 0xff9a55, 0x8fa6d8);
    this.sun.intensity = 2.3 * dayW + 1.1 * gold + 0.35 * night;
    mix3(this.hemi.color, 0xe4eeff, 0xffd2b0, 0x2a3a66);
    mix3(this.hemi.groundColor, 0xb8a07c, 0x8a6a50, 0x1a1a24);
    this.hemi.intensity = 1.15 * dayW + 0.85 * gold + 0.5 * night;
    mix3(fog.color, 0xd8e2ec, 0xe8b48c, 0x0b1020);
    fog.near = 140 - 60 * night; fog.far = 700 - 200 * night;
    const sky = [0, 1, 2].map((i) => '#' + mix3(new THREE.Color(), SKY.dayHex[i], SKY.goldHex[i], SKY.nightHex[i]).getHexString());
    paintSky(this.skyTex, sky);
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.tickers.forEach((fn) => fn(dt));
      this.renderer.render(this.scene, this.camera);
    });
  }
}

const SKY = {
  day: ['#6f9fd6', '#b9d2ea', '#efe6d6'],
  dayHex: [0x6f9fd6, 0xb9d2ea, 0xefe6d6],
  goldHex: [0x4b5f9a, 0xe0926a, 0xf7c27c],
  nightHex: [0x03060f, 0x0b1430, 0x1f2440],
};

function skyTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  paintSky(t, SKY.day);
  return t;
}

/** Redraw the vertical sky gradient (top, middle, horizon). */
function paintSky(t: THREE.CanvasTexture, [top, mid, bottom]: string[]) {
  const c = t.image as HTMLCanvasElement;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(0.55, mid);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  t.needsUpdate = true;
}
