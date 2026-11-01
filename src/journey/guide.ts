import * as THREE from 'three';

export interface GuideTarget {
  x: number;
  z: number;
}

/**
 * 3D Objective Beacon and Ground Direction Arrow.
 * Renders a floating, bobbing waypoint marker above the target in the 3D scene,
 * plus a ground guide arrow near the player pointing directly to it.
 */
export class GuideSystem {
  private readonly group = new THREE.Group();
  private readonly arrow: THREE.Mesh;
  private readonly beacon: THREE.Group;
  private readonly beaconCone: THREE.Mesh;
  private t = 0;

  constructor(private readonly scene: THREE.Scene) {
    // Ground direction arrow
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.55);
    shape.lineTo(0.32, 0);
    shape.lineTo(0.12, 0);
    shape.lineTo(0.12, -0.4);
    shape.lineTo(-0.12, -0.4);
    shape.lineTo(-0.12, 0);
    shape.lineTo(-0.32, 0);
    shape.closePath();

    this.arrow = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.arrow.rotation.x = -Math.PI / 2;
    this.arrow.renderOrder = 6;
    this.arrow.visible = false;

    // Floating 3D waypoint beacon
    this.beacon = new THREE.Group();
    const coneGeom = new THREE.ConeGeometry(0.32, 0.65, 8);
    coneGeom.rotateX(Math.PI); // Point downwards
    this.beaconCone = new THREE.Mesh(
      coneGeom,
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide }),
    );
    this.beaconCone.position.y = 0.4;

    const ringGeom = new THREE.RingGeometry(0.35, 0.45, 24);
    ringGeom.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(
      ringGeom,
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.position.y = 0.72;

    this.beacon.add(this.beaconCone, ring);
    this.beacon.visible = false;

    this.group.add(this.arrow, this.beacon);
    scene.add(this.group);
  }

  update(dt: number, playerPos: THREE.Vector3, target: GuideTarget | null, active: boolean, frozen: boolean) {
    this.t += dt;
    if (!target || !active) {
      this.arrow.visible = false;
      this.beacon.visible = false;
      return;
    }

    const dx = target.x - playerPos.x;
    const dz = target.z - playerPos.z;
    const dist = Math.hypot(dx, dz);

    // Update floating beacon: bob and spin
    this.beacon.visible = true;
    const bob = Math.sin(this.t * 3.5) * 0.22;
    this.beacon.position.set(target.x, 2.5 + bob, target.z);
    this.beacon.rotation.y += dt * 2.5;

    // Update floor arrow
    const showArrow = dist > 0.6 && !frozen;
    this.arrow.visible = showArrow;
    if (showArrow) {
      const angle = Math.atan2(dx, dz);
      const leadDist = Math.min(1.2, Math.max(0.65, dist * 0.45));
      this.arrow.position.set(
        playerPos.x + Math.sin(angle) * leadDist,
        0.05,
        playerPos.z + Math.cos(angle) * leadDist,
      );
      this.arrow.rotation.z = angle + Math.PI;
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.arrow.geometry.dispose();
    (this.arrow.material as THREE.Material).dispose();
    this.beaconCone.geometry.dispose();
    (this.beaconCone.material as THREE.Material).dispose();
  }
}
