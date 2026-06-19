import { Vector2, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Plane } from "@babylonjs/core/Maths/math.plane";
import type { Scene } from "@babylonjs/core/scene";
import { normalizeHorizontal } from "../utils/math";

export class InputManager {
  readonly pointer = new Vector2(0, 0);
  private readonly keys = new Set<string>();
  private firePressed = false;
  private pointerKnown = false;
  private readonly groundPlane = Plane.FromPositionAndNormal(Vector3.Zero(), Vector3.Up());

  constructor(private readonly scene: Scene, private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerdown", this.onPointerDown);
  }

  get moveX(): number {
    return (this.isDown("KeyD") || this.isDown("ArrowRight") ? 1 : 0) - (this.isDown("KeyA") || this.isDown("ArrowLeft") ? 1 : 0);
  }

  get moveZ(): number {
    return (this.isDown("KeyW") || this.isDown("ArrowUp") ? 1 : 0) - (this.isDown("KeyS") || this.isDown("ArrowDown") ? 1 : 0);
  }

  consumeFire(): boolean {
    const shouldFire = this.firePressed || this.isDown("Space");
    this.firePressed = false;
    return shouldFire;
  }

  getPointerAimDirection(origin: Vector3): Vector3 | undefined {
    if (!this.pointerKnown) return undefined;

    const camera = this.scene.activeCamera;
    if (!camera) return undefined;

    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return undefined;

    const engine = this.scene.getEngine();
    const x = (this.pointer.x / rect.width) * engine.getRenderWidth();
    const y = (this.pointer.y / rect.height) * engine.getRenderHeight();
    const ray = this.scene.createPickingRay(x, y, null, camera);
    const hitDistance = ray.intersectsPlane(this.groundPlane);
    if (hitDistance === null || hitDistance <= 0) return undefined;

    const hitPoint = ray.origin.add(ray.direction.scale(hitDistance));
    return normalizeHorizontal(new Vector3(hitPoint.x - origin.x, 0, hitPoint.z - origin.z));
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    void this.scene;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(event.clientX - rect.left, event.clientY - rect.top);
    this.pointerKnown = true;
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.onPointerMove(event);
    this.firePressed = true;
    this.canvas.focus();
  };
}
