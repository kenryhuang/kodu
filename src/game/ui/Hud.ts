import type { DebugStats } from "../types";

export class Hud {
  private readonly root: HTMLDivElement;

  constructor(root: HTMLDivElement) {
    this.root = root;
    this.root.innerHTML = `
      <section class="hud-panel">
        <h1 class="hud-title">Kodu</h1>
        <div class="hud-row"><span>Health</span><strong data-hud="health">5</strong></div>
        <div class="hud-row"><span>State</span><strong data-hud="state">Ready</strong></div>
        <div class="hud-row"><span>NPCs</span><strong data-hud="npcs">0</strong></div>
        <div class="hud-row"><span>Projectiles</span><strong data-hud="projectiles">0</strong></div>
      </section>
      <section class="hud-help">Move WASD / Arrows · Fire Click / Space · Inspector I</section>
    `;
  }

  update(stats: DebugStats): void {
    this.set("health", String(stats.playerHealth));
    this.set("state", stats.playerState);
    this.set("npcs", String(stats.npcCount));
    this.set("projectiles", String(stats.projectileCount));
  }

  dispose(): void {
    this.root.innerHTML = "";
  }

  private set(key: string, value: string): void {
    const node = this.root.querySelector<HTMLElement>(`[data-hud="${key}"]`);
    if (node) node.textContent = value;
  }
}
