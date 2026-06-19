import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";

export class CameraRig {
  readonly camera: FreeCamera;
  private target = Vector3.Zero();
  private readonly offset = new Vector3(6.8, 8.4, -7.2);

  constructor(scene: Scene) {
    this.camera = new FreeCamera("camera-2-5d", this.offset.clone(), scene);
    this.camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 100;
    this.camera.rotation = new Vector3(Math.PI / 4.2, -Math.PI / 4, 0);
    this.resize(scene.getEngine().getRenderWidth(), scene.getEngine().getRenderHeight());
    scene.activeCamera = this.camera;
  }

  setTarget(target: Vector3): void {
    this.target.copyFrom(target);
  }

  resize(width: number, height: number): void {
    const aspect = width / Math.max(height, 1);
    const halfHeight = 5.2;
    this.camera.orthoTop = halfHeight;
    this.camera.orthoBottom = -halfHeight;
    this.camera.orthoLeft = -halfHeight * aspect;
    this.camera.orthoRight = halfHeight * aspect;
  }

  update(): void {
    const desired = this.target.add(this.offset);
    this.camera.position = Vector3.Lerp(this.camera.position, desired, 0.12);
    this.camera.setTarget(this.target);
  }
}
