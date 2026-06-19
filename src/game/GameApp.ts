import { Engine } from "@babylonjs/core/Engines/engine";
import "@babylonjs/loaders/glTF";
import { GameScene } from "./GameScene";

export class GameApp {
  private readonly engine: Engine;
  private gameScene?: GameScene;
  private readonly onResize = (): void => this.engine.resize();

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      antialias: true,
    });
  }

  async start(): Promise<void> {
    this.gameScene = new GameScene(this.engine, this.canvas);
    await this.gameScene.init();
    this.engine.runRenderLoop(() => {
      this.gameScene?.update(this.engine.getDeltaTime() / 1000);
      this.gameScene?.scene.render();
    });
    window.addEventListener("resize", this.onResize);
  }

  dispose(): void {
    window.removeEventListener("resize", this.onResize);
    this.gameScene?.dispose();
    this.engine.dispose();
  }
}
