import type { Scene } from "@babylonjs/core/scene";
import { Vector2 } from "@babylonjs/core/Maths/math.vector";

export class InputManager {
  readonly pointer = new Vector2(0, 0);
  private readonly keys = new Set<string>();
  private firePressed = false;

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
  };

  private readonly onPointerDown = (): void => {
    this.firePressed = true;
    this.canvas.focus();
  };
}
