import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { InputManager } from "./input/InputManager";
import { PlayerController } from "./player/PlayerController";
import { CameraRig } from "./camera/CameraRig";
import { createMaterials, type CartoonMaterials } from "./world/createMaterials";
import { createDioramaMap } from "./world/createDioramaMap";
import type { DioramaMap } from "./types";
import { NpcSystem } from "./npc/NpcSystem";
import { ProjectileSystem } from "./combat/ProjectileSystem";
import { CollisionSystem } from "./combat/CollisionSystem";

export class GameScene {
  readonly scene: Scene;
  private materials!: CartoonMaterials;
  private map!: DioramaMap;
  private cameraRig!: CameraRig;
  private input!: InputManager;
  private player!: PlayerController;
  private npcs!: NpcSystem;
  private projectiles!: ProjectileSystem;
  private collisions!: CollisionSystem;

  constructor(
    private readonly engine: Engine,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.58, 0.82, 0.92, 1);
  }

  async init(): Promise<void> {
    new HemisphericLight("sky-light", new Vector3(0.2, 1, 0.3), this.scene).intensity = 0.82;
    this.materials = createMaterials(this.scene);
    this.map = createDioramaMap(this.scene, this.materials);
    this.cameraRig = new CameraRig(this.scene);
    this.input = new InputManager(this.scene, this.canvas);
    this.player = new PlayerController(this.scene, this.materials, this.map);
    this.npcs = new NpcSystem(this.scene, this.materials);
    this.projectiles = new ProjectileSystem(this.scene, this.materials);
    this.collisions = new CollisionSystem();
    this.cameraRig.setTarget(this.player.position);
    this.canvas.focus();
  }

  update(deltaSeconds: number): void {
    const fireRequest = this.player.update(deltaSeconds, this.input);
    if (fireRequest) this.projectiles.spawn(fireRequest.origin, fireRequest.direction);
    this.collisions.resolvePlayerObstacles(this.player, this.map);
    this.player.clampToBounds();
    this.projectiles.update(deltaSeconds);
    this.npcs.update(deltaSeconds);
    this.collisions.resolveProjectileHits(this.projectiles, this.npcs);
    this.cameraRig.setTarget(this.player.position);
    this.cameraRig.update();
  }

  dispose(): void {
    this.input?.dispose();
    this.projectiles?.dispose();
    this.npcs?.dispose();
    this.scene.dispose();
    void this.engine;
  }
}
