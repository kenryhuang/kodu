import "@babylonjs/inspector";
import type { Scene } from "@babylonjs/core/scene";

export class DebugTools {
  private visible = false;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== "KeyI" || event.repeat || this.shouldIgnoreToggle(event)) return;
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

  private shouldIgnoreToggle(event: KeyboardEvent): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    if (
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement instanceof HTMLSelectElement
    ) {
      return true;
    }
    if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
      return true;
    }

    const target = event.target;
    if (!(target instanceof Node)) return false;
    const targetElement = target instanceof Element ? target : target.parentElement;
    return Boolean(targetElement?.closest('[contenteditable="true"]'));
  }
}
