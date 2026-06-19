import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class GameScene {
  readonly scene: Scene;

  constructor(
    private readonly engine: Engine,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.58, 0.82, 0.92, 1);
  }

  async init(): Promise<void> {
    new HemisphericLight("sky-light", new Vector3(0.2, 1, 0.3), this.scene).intensity = 0.82;
    this.canvas.focus();
  }

  update(_deltaSeconds: number): void {
    // Systems are wired in later tasks.
  }

  dispose(): void {
    this.scene.dispose();
    void this.engine;
  }
}
