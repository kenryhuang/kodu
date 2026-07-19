import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
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
import { Hud } from "./ui/Hud";
import { DebugTools } from "./debug/DebugTools";

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
  private hud!: Hud;
  private debugTools!: DebugTools;

  constructor(
    private readonly engine: Engine,
    private readonly canvas: HTMLCanvasElement,
  ) {
    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.53, 0.68, 0.72, 1);
  }

  async init(): Promise<void> {
    const skyLight = new HemisphericLight("sky-light", new Vector3(0.2, 1, 0.3), this.scene);
    skyLight.intensity = 0.9;
    skyLight.groundColor = new Color3(0.44, 0.46, 0.38);
    const sunLight = new DirectionalLight("sun-light", new Vector3(-0.55, -1, 0.45), this.scene);
    sunLight.position = new Vector3(7, 12, -8);
    sunLight.intensity = 1.08;
    this.materials = createMaterials(this.scene);
    this.map = createDioramaMap(this.scene, this.materials);
    this.cameraRig = new CameraRig(this.scene);
    this.input = new InputManager(this.scene, this.canvas);
    this.player = new PlayerController(this.scene, this.materials, this.map);
    this.npcs = new NpcSystem(this.scene, this.materials);
    this.projectiles = new ProjectileSystem(this.scene, this.materials);
    this.collisions = new CollisionSystem();
    this.configureShadows(sunLight);
    const hudRoot = document.querySelector<HTMLDivElement>("#hud-root");
    if (!hudRoot) throw new Error("Missing #hud-root element.");
    this.hud = new Hud(hudRoot);
    this.debugTools = new DebugTools(this.scene);
    this.cameraRig.setTarget(this.player.position);
    this.canvas.focus();
  }

  private configureShadows(sunLight: DirectionalLight): void {
    const shadowGenerator = new ShadowGenerator(1024, sunLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 18;
    shadowGenerator.setDarkness(0.2);

    const configureMesh = (mesh: AbstractMesh): void => {
      if (this.receivesSceneShadows(mesh.name)) {
        mesh.receiveShadows = true;
      }
      if (this.castsSceneShadows(mesh.name)) {
        shadowGenerator.addShadowCaster(mesh, true);
      }
    };

    for (const mesh of this.scene.meshes) configureMesh(mesh);
    this.scene.onNewMeshAddedObservable.add(configureMesh);
  }

  private receivesSceneShadows(meshName: string): boolean {
    return (
      meshName.startsWith("terrain-")
      || meshName.startsWith("house-")
      || meshName.startsWith("rock-")
      || meshName.startsWith("pebble-detail-")
      || meshName.startsWith("road-relief-")
    );
  }

  private castsSceneShadows(meshName: string): boolean {
    if (meshName === "map-dark-edge") return false;
    if (meshName.endsWith("-shadow")) return false;
    if (meshName.startsWith("terrain-")) return false;
    if (meshName.startsWith("grass-card-")) return false;
    if (meshName.startsWith("ground-detail-clump-")) return false;
    if (meshName.startsWith("wildflower-card-")) return false;
    if (meshName.startsWith("bush-card-")) return false;
    return (
      meshName === "player"
      || meshName.startsWith("npc-")
      || meshName.startsWith("house-")
      || meshName.startsWith("tree-")
      || meshName.startsWith("rock-")
      || meshName.startsWith("fence-")
      || meshName.startsWith("pebble-detail-")
      || meshName.startsWith("road-relief-")
    );
  }

  update(deltaSeconds: number): void {
    const fireRequest = this.player.update(deltaSeconds, this.input);
    if (fireRequest) this.projectiles.spawn(fireRequest.origin, fireRequest.direction);
    this.collisions.resolvePlayerVerticalSupport(this.player, this.map);
    this.collisions.resolvePlayerObstacles(this.player, this.map);
    this.player.clampToBounds();
    this.projectiles.update(deltaSeconds);
    this.npcs.update(deltaSeconds);
    this.collisions.resolveProjectileHits(this.projectiles, this.npcs);
    this.hud.update({
      playerHealth: this.player.health,
      playerState: "Ready",
      npcCount: this.npcs.npcs.length,
      projectileCount: this.projectiles.projectiles.length,
    });
    this.cameraRig.setTarget(this.player.position);
    this.cameraRig.update();
  }

  resize(width: number, height: number): void {
    this.cameraRig?.resize(width, height);
  }

  dispose(): void {
    this.debugTools?.dispose();
    this.hud?.dispose();
    this.input?.dispose();
    this.projectiles?.dispose();
    this.npcs?.dispose();
    this.scene.dispose();
    void this.engine;
  }
}
