import "@babylonjs/inspector";
import type { Scene } from "@babylonjs/core/scene";

export class DebugTools {
  private visible = false;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== "KeyI") return;
    this.visible = !this.visible;
    if (this.visible) {
      void this.scene.debugLayer.show({ embedMode: true, overlay: true });
    } else {
      void this.scene.debugLayer.hide();
    }
  };

  constructor(private readonly scene: Scene) {
    window.addEventListener("keydown", this.onKeyDown);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    void this.scene.debugLayer.hide();
  }
}
