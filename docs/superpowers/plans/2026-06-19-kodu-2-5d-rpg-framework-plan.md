# Kodu 2.5D RPG Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable Babylon.js + TypeScript + Vite 2.5D toy-diorama RPG framework in `~/workspace/kodu`.

**Architecture:** Use a lightweight system architecture, not a full ECS. `GameApp` owns engine lifecycle, `GameScene` wires gameplay systems, and focused modules manage input, player movement, camera, NPCs, projectiles, collision, HUD, and debug tools.

**Tech Stack:** Babylon.js, TypeScript, Vite, Babylon Inspector, HTML/CSS HUD, Playwright smoke test.

---

## File Structure

- `package.json`: npm scripts and dependencies.
- `index.html`: full-screen canvas and HUD roots.
- `vite.config.ts`: Vite config with stable dev server defaults.
- `tsconfig.json`: strict TypeScript config.
- `src/main.ts`: app entry point and fatal error overlay.
- `src/styles.css`: canvas, HUD, and debug overlay styling.
- `src/game/GameApp.ts`: Babylon engine lifecycle.
- `src/game/GameScene.ts`: scene creation, system wiring, update loop.
- `src/game/types.ts`: shared gameplay types.
- `src/game/utils/math.ts`: small vector helpers.
- `src/game/world/createMaterials.ts`: cartoon material factory.
- `src/game/world/createDioramaMap.ts`: toy map, boundaries, obstacles.
- `src/game/input/InputManager.ts`: keyboard and pointer state.
- `src/game/player/PlayerController.ts`: player mesh, movement, aim, fire requests.
- `src/game/camera/CameraRig.ts`: orthographic 2.5D follow camera.
- `src/game/npc/NpcSystem.ts`: NPC spawn, health, hit reactions, knockback.
- `src/game/combat/ProjectileSystem.ts`: projectile spawn, movement, expiry.
- `src/game/combat/CollisionSystem.ts`: projectile-NPC and player-obstacle collision.
- `src/game/ui/Hud.ts`: HTML HUD updates.
- `src/game/debug/DebugTools.ts`: Babylon Inspector toggle and debug stats.
- `public/assets/README.md`: GLB export conventions for future Blender assets.
- `tests/smoke.spec.ts`: Playwright smoke test.
- `playwright.config.ts`: Playwright config.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Create: `public/assets/README.md`
- Create: `public/assets/models/.gitkeep`
- Create: `public/assets/textures/.gitkeep`

- [ ] **Step 1: Create package metadata**

Create `package.json`:

```json
{
  "name": "kodu",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "test:smoke": "playwright test tests/smoke.spec.ts",
    "test": "npm run typecheck && npm run test:smoke"
  },
  "dependencies": {
    "@babylonjs/core": "^8.0.0",
    "@babylonjs/gui": "^8.0.0",
    "@babylonjs/inspector": "^8.0.0",
    "@babylonjs/loaders": "^8.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "typescript": "^5.9.0",
    "vite": "^7.0.0"
  }
}
```

- [ ] **Step 2: Create TypeScript and Vite config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "tests", "playwright.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
  },
});
```

- [ ] **Step 3: Create the HTML shell**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kodu</title>
  </head>
  <body>
    <canvas id="game-canvas" aria-label="Kodu game canvas"></canvas>
    <div id="hud-root"></div>
    <div id="error-root" role="alert"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 4: Create initial CSS**

Create `src/styles.css`:

```css
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #172018;
  background: #9ad7ef;
}

html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

#game-canvas {
  display: block;
  width: 100vw;
  height: 100vh;
  outline: none;
  touch-action: none;
}

#hud-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.hud-panel {
  position: fixed;
  left: 16px;
  top: 16px;
  display: grid;
  gap: 6px;
  min-width: 220px;
  padding: 12px 14px;
  color: #172018;
  background: rgba(255, 255, 242, 0.84);
  border: 2px solid rgba(37, 70, 43, 0.22);
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(25, 45, 30, 0.16);
  backdrop-filter: blur(6px);
}

.hud-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
}

.hud-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
}

.hud-help {
  position: fixed;
  left: 16px;
  bottom: 16px;
  padding: 10px 12px;
  font-size: 13px;
  color: #172018;
  background: rgba(255, 255, 242, 0.78);
  border-radius: 8px;
}

#error-root:not(:empty) {
  position: fixed;
  inset: 16px;
  display: grid;
  place-items: center;
  padding: 24px;
  color: #fff7ec;
  background: rgba(94, 23, 23, 0.92);
  border-radius: 8px;
  font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
}
```

- [ ] **Step 5: Create asset conventions doc**

Create `public/assets/README.md`:

```md
# Kodu Assets

Use `public/assets/models` for Blender-exported GLB files and `public/assets/textures` for external textures.

Blender export defaults:

- Export format: GLB for single-file game assets.
- Apply transforms before export.
- Keep model origins meaningful: feet center for characters, base center for props.
- Use meters as authoring scale.
- Use short lowercase filenames such as `player.glb`, `npc_slime.glb`, and `tree_oak.glb`.
- Avoid unsupported compression extensions until the runtime loader is explicitly configured.
```

Create empty files:

```text
public/assets/models/.gitkeep
public/assets/textures/.gitkeep
```

- [ ] **Step 6: Install dependencies**

Run:

```bash
npm install
```

Expected: `node_modules` and `package-lock.json` are created without install errors.

- [ ] **Step 7: Commit scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/styles.css public/assets
git commit -m "feat: scaffold Babylon Vite project"
```

Expected: commit succeeds.

## Task 2: App Bootstrap And Scene Shell

**Files:**
- Create: `src/game/GameApp.ts`
- Create: `src/game/GameScene.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement app entry**

Create `src/main.ts`:

```ts
import "./styles.css";
import { GameApp } from "./game/GameApp";

function showFatalError(error: unknown): void {
  const root = document.querySelector<HTMLDivElement>("#error-root");
  const message = error instanceof Error ? `${error.message}\n\n${error.stack ?? ""}` : String(error);
  if (root) root.textContent = message;
  console.error(error);
}

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
  if (!canvas) throw new Error("Missing #game-canvas element.");
  const app = new GameApp(canvas);
  await app.start();
  (globalThis as typeof globalThis & { __KODU_APP__?: GameApp }).__KODU_APP__ = app;
}

main().catch(showFatalError);
```

- [ ] **Step 2: Implement `GameApp`**

Create `src/game/GameApp.ts`:

```ts
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
```

- [ ] **Step 3: Implement `GameScene` shell**

Create `src/game/GameScene.ts`:

```ts
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
```

- [ ] **Step 4: Verify typecheck**

Run:

```bash
npm run typecheck
```

Expected: TypeScript exits with code 0.

- [ ] **Step 5: Commit app bootstrap**

Run:

```bash
git add src/main.ts src/game/GameApp.ts src/game/GameScene.ts
git commit -m "feat: add Babylon app bootstrap"
```

Expected: commit succeeds.

## Task 3: Diorama World And Camera

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/world/createMaterials.ts`
- Create: `src/game/world/createDioramaMap.ts`
- Create: `src/game/camera/CameraRig.ts`
- Modify: `src/game/GameScene.ts`

- [ ] **Step 1: Define shared types**

Create `src/game/types.ts`:

```ts
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type Obstacle = {
  readonly name: string;
  readonly center: Vector3;
  readonly halfExtents: Vector3;
  readonly mesh: Mesh;
};

export type DioramaMap = {
  readonly bounds: {
    readonly minX: number;
    readonly maxX: number;
    readonly minZ: number;
    readonly maxZ: number;
  };
  readonly obstacles: Obstacle[];
};

export type DebugStats = {
  npcCount: number;
  projectileCount: number;
  playerHealth: number;
};
```

- [ ] **Step 2: Create cartoon materials**

Create `src/game/world/createMaterials.ts`:

```ts
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import type { Scene } from "@babylonjs/core/scene";

export type CartoonMaterials = ReturnType<typeof createMaterials>;

export function createMaterials(scene: Scene) {
  const make = (name: string, color: Color3): StandardMaterial => {
    const material = new StandardMaterial(name, scene);
    material.diffuseColor = color;
    material.specularColor = new Color3(0.08, 0.08, 0.08);
    material.emissiveColor = color.scale(0.08);
    return material;
  };

  return {
    grass: make("mat-grass", new Color3(0.42, 0.72, 0.36)),
    edge: make("mat-edge", new Color3(0.34, 0.52, 0.29)),
    player: make("mat-player", new Color3(0.18, 0.42, 0.92)),
    npc: make("mat-npc", new Color3(0.9, 0.26, 0.18)),
    projectile: make("mat-projectile", new Color3(1.0, 0.85, 0.25)),
    stone: make("mat-stone", new Color3(0.56, 0.62, 0.6)),
    treeTrunk: make("mat-tree-trunk", new Color3(0.48, 0.3, 0.18)),
    treeTop: make("mat-tree-top", new Color3(0.25, 0.58, 0.3)),
  };
}
```

- [ ] **Step 3: Create diorama map**

Create `src/game/world/createDioramaMap.ts`:

```ts
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { DioramaMap, Obstacle } from "../types";
import type { CartoonMaterials } from "./createMaterials";

function makeObstacle(name: string, center: Vector3, halfExtents: Vector3, scene: Scene, materials: CartoonMaterials): Obstacle {
  const mesh = MeshBuilder.CreateBox(name, {
    width: halfExtents.x * 2,
    height: halfExtents.y * 2,
    depth: halfExtents.z * 2,
  }, scene);
  mesh.position.copyFrom(center);
  mesh.material = materials.stone;
  return { name, center, halfExtents, mesh };
}

function addTree(name: string, position: Vector3, scene: Scene, materials: CartoonMaterials): void {
  const trunk = MeshBuilder.CreateCylinder(`${name}-trunk`, { height: 0.75, diameter: 0.22, tessellation: 8 }, scene);
  trunk.position = position.add(new Vector3(0, 0.38, 0));
  trunk.material = materials.treeTrunk;

  const top = MeshBuilder.CreateSphere(`${name}-top`, { diameter: 0.9, segments: 12 }, scene);
  top.position = position.add(new Vector3(0, 0.95, 0));
  top.scaling.y = 0.82;
  top.material = materials.treeTop;
}

export function createDioramaMap(scene: Scene, materials: CartoonMaterials): DioramaMap {
  const ground = MeshBuilder.CreateBox("map-grass-platform", { width: 14, height: 0.45, depth: 10 }, scene);
  ground.position.y = -0.25;
  ground.material = materials.grass;

  const edge = MeshBuilder.CreateBox("map-dark-edge", { width: 14.4, height: 0.42, depth: 10.4 }, scene);
  edge.position.y = -0.52;
  edge.material = materials.edge;

  const obstacles = [
    makeObstacle("rock-west", new Vector3(-3.1, 0.28, -1.4), new Vector3(0.7, 0.35, 0.55), scene, materials),
    makeObstacle("rock-east", new Vector3(3.2, 0.28, 1.2), new Vector3(0.65, 0.35, 0.55), scene, materials),
  ];

  addTree("tree-north-west", new Vector3(-4.8, 0, 2.7), scene, materials);
  addTree("tree-south-east", new Vector3(4.9, 0, -2.8), scene, materials);

  return {
    bounds: { minX: -6.4, maxX: 6.4, minZ: -4.4, maxZ: 4.4 },
    obstacles,
  };
}
```

- [ ] **Step 4: Create camera rig**

Create `src/game/camera/CameraRig.ts`:

```ts
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
```

- [ ] **Step 5: Wire map and camera into `GameScene`**

Modify `src/game/GameScene.ts` so it creates materials, map, and camera:

```ts
// add imports
import { CameraRig } from "./camera/CameraRig";
import { createMaterials, type CartoonMaterials } from "./world/createMaterials";
import { createDioramaMap } from "./world/createDioramaMap";
import type { DioramaMap } from "./types";

// add fields
private materials!: CartoonMaterials;
private map!: DioramaMap;
private cameraRig!: CameraRig;

// inside init(), after light creation
this.materials = createMaterials(this.scene);
this.map = createDioramaMap(this.scene, this.materials);
this.cameraRig = new CameraRig(this.scene);

// inside update()
this.cameraRig.update();
```

- [ ] **Step 6: Verify typecheck and commit**

Run:

```bash
npm run typecheck
git add src/game
git commit -m "feat: add diorama world and camera"
```

Expected: typecheck passes and commit succeeds.

## Task 4: Input, Player Movement, And Aiming

**Files:**
- Create: `src/game/input/InputManager.ts`
- Create: `src/game/player/PlayerController.ts`
- Create: `src/game/utils/math.ts`
- Modify: `src/game/GameScene.ts`

- [ ] **Step 1: Create math helpers**

Create `src/game/utils/math.ts`:

```ts
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function horizontalLength(vector: Vector3): number {
  return Math.hypot(vector.x, vector.z);
}

export function normalizeHorizontal(vector: Vector3): Vector3 {
  const length = horizontalLength(vector);
  if (length <= 0.0001) return Vector3.Zero();
  return new Vector3(vector.x / length, 0, vector.z / length);
}
```

- [ ] **Step 2: Create input manager**

Create `src/game/input/InputManager.ts`:

```ts
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
```

- [ ] **Step 3: Create player controller**

Create `src/game/player/PlayerController.ts`:

```ts
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { CartoonMaterials } from "../world/createMaterials";
import type { DioramaMap } from "../types";
import type { InputManager } from "../input/InputManager";
import { clamp, normalizeHorizontal } from "../utils/math";

export type FireRequest = {
  readonly origin: Vector3;
  readonly direction: Vector3;
};

export class PlayerController {
  readonly mesh;
  readonly radius = 0.42;
  health = 5;
  private facing = new Vector3(1, 0, 0);
  private fireCooldown = 0;

  constructor(scene: Scene, materials: CartoonMaterials, private readonly map: DioramaMap) {
    this.mesh = MeshBuilder.CreateCapsule("player", { height: 1.15, radius: 0.34, tessellation: 10 }, scene);
    this.mesh.position.set(0, 0.62, 0);
    this.mesh.material = materials.player;
  }

  update(deltaSeconds: number, input: InputManager): FireRequest | undefined {
    const move = normalizeHorizontal(new Vector3(input.moveX, 0, input.moveZ));
    if (move.lengthSquared() > 0) {
      this.facing.copyFrom(move);
      const speed = 4.2;
      this.mesh.position.x = clamp(this.mesh.position.x + move.x * speed * deltaSeconds, this.map.bounds.minX, this.map.bounds.maxX);
      this.mesh.position.z = clamp(this.mesh.position.z + move.z * speed * deltaSeconds, this.map.bounds.minZ, this.map.bounds.maxZ);
      this.mesh.rotation.y = Math.atan2(this.facing.x, this.facing.z);
    }

    this.fireCooldown = Math.max(0, this.fireCooldown - deltaSeconds);
    if (input.consumeFire() && this.fireCooldown <= 0) {
      this.fireCooldown = 0.28;
      return {
        origin: this.mesh.position.add(new Vector3(this.facing.x * 0.55, 0.15, this.facing.z * 0.55)),
        direction: this.facing.clone(),
      };
    }
    return undefined;
  }

  get position(): Vector3 {
    return this.mesh.position;
  }
}
```

- [ ] **Step 4: Wire input/player into `GameScene`**

Modify `src/game/GameScene.ts` with fields and update flow:

```ts
import { InputManager } from "./input/InputManager";
import { PlayerController } from "./player/PlayerController";

private input!: InputManager;
private player!: PlayerController;

// inside init(), after map and camera
this.input = new InputManager(this.scene, this.canvas);
this.player = new PlayerController(this.scene, this.materials, this.map);
this.cameraRig.setTarget(this.player.position);

// inside update(deltaSeconds)
const fireRequest = this.player.update(deltaSeconds, this.input);
this.cameraRig.setTarget(this.player.position);
void fireRequest;

// inside dispose()
this.input?.dispose();
```

- [ ] **Step 5: Verify typecheck and commit**

Run:

```bash
npm run typecheck
git add src/game
git commit -m "feat: add player movement and input"
```

Expected: typecheck passes and commit succeeds.

## Task 5: NPCs, Projectiles, Collision, And Knockback

**Files:**
- Create: `src/game/npc/NpcSystem.ts`
- Create: `src/game/combat/ProjectileSystem.ts`
- Create: `src/game/combat/CollisionSystem.ts`
- Modify: `src/game/GameScene.ts`

- [ ] **Step 1: Create NPC system**

Create `src/game/npc/NpcSystem.ts`:

```ts
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { CartoonMaterials } from "../world/createMaterials";

export type Npc = {
  readonly mesh: Mesh;
  readonly radius: number;
  velocity: Vector3;
  health: number;
  hitTimer: number;
};

export class NpcSystem {
  readonly npcs: Npc[] = [];

  constructor(private readonly scene: Scene, private readonly materials: CartoonMaterials) {
    [
      new Vector3(-2.4, 0.52, 2.0),
      new Vector3(2.2, 0.52, 1.4),
      new Vector3(3.6, 0.52, -2.1),
    ].forEach((position, index) => this.spawn(`npc-${index + 1}`, position));
  }

  update(deltaSeconds: number): void {
    for (const npc of this.npcs) {
      npc.mesh.position.addInPlace(npc.velocity.scale(deltaSeconds));
      npc.velocity.scaleInPlace(Math.pow(0.08, deltaSeconds));
      npc.hitTimer = Math.max(0, npc.hitTimer - deltaSeconds);
      const material = npc.mesh.material;
      if (material && "diffuseColor" in material) {
        material.diffuseColor = npc.hitTimer > 0 ? new Color3(1, 0.85, 0.45) : this.materials.npc.diffuseColor;
      }
    }
  }

  applyHit(npc: Npc, direction: Vector3, damage: number, knockback: number): void {
    npc.health -= damage;
    npc.hitTimer = 0.12;
    npc.velocity.addInPlace(direction.scale(knockback));
    if (npc.health <= 0) {
      npc.mesh.dispose();
      const index = this.npcs.indexOf(npc);
      if (index >= 0) this.npcs.splice(index, 1);
    }
  }

  dispose(): void {
    this.npcs.forEach((npc) => npc.mesh.dispose());
    this.npcs.length = 0;
  }

  private spawn(name: string, position: Vector3): void {
    const mesh = MeshBuilder.CreateCapsule(name, { height: 0.95, radius: 0.32, tessellation: 8 }, this.scene);
    mesh.position = position.clone();
    mesh.material = this.materials.npc.clone(`${name}-mat`);
    this.npcs.push({ mesh, radius: 0.42, velocity: Vector3.Zero(), health: 3, hitTimer: 0 });
  }
}
```

- [ ] **Step 2: Create projectile system**

Create `src/game/combat/ProjectileSystem.ts`:

```ts
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { CartoonMaterials } from "../world/createMaterials";
import { normalizeHorizontal } from "../utils/math";

export type Projectile = {
  readonly mesh: Mesh;
  readonly radius: number;
  readonly direction: Vector3;
  life: number;
};

export class ProjectileSystem {
  readonly projectiles: Projectile[] = [];

  constructor(private readonly scene: Scene, private readonly materials: CartoonMaterials) {}

  spawn(origin: Vector3, direction: Vector3): void {
    const mesh = MeshBuilder.CreateSphere("projectile", { diameter: 0.28, segments: 10 }, this.scene);
    mesh.position = origin.clone();
    mesh.material = this.materials.projectile;
    this.projectiles.push({
      mesh,
      radius: 0.18,
      direction: normalizeHorizontal(direction),
      life: 1.4,
    });
  }

  update(deltaSeconds: number): void {
    const speed = 7.5;
    for (const projectile of [...this.projectiles]) {
      projectile.mesh.position.addInPlace(projectile.direction.scale(speed * deltaSeconds));
      projectile.life -= deltaSeconds;
      if (projectile.life <= 0) this.remove(projectile);
    }
  }

  remove(projectile: Projectile): void {
    projectile.mesh.dispose();
    const index = this.projectiles.indexOf(projectile);
    if (index >= 0) this.projectiles.splice(index, 1);
  }

  dispose(): void {
    this.projectiles.forEach((projectile) => projectile.mesh.dispose());
    this.projectiles.length = 0;
  }
}
```

- [ ] **Step 3: Create collision system**

Create `src/game/combat/CollisionSystem.ts`:

```ts
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { NpcSystem } from "../npc/NpcSystem";
import type { ProjectileSystem } from "./ProjectileSystem";
import { normalizeHorizontal } from "../utils/math";

function horizontalDistance(a: Vector3, b: Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export class CollisionSystem {
  resolveProjectileHits(projectiles: ProjectileSystem, npcs: NpcSystem): void {
    for (const projectile of [...projectiles.projectiles]) {
      for (const npc of [...npcs.npcs]) {
        const hitDistance = projectile.radius + npc.radius;
        if (horizontalDistance(projectile.mesh.position, npc.mesh.position) <= hitDistance) {
          const direction = normalizeHorizontal(npc.mesh.position.subtract(projectile.mesh.position));
          npcs.applyHit(npc, direction.lengthSquared() > 0 ? direction : projectile.direction, 1, 4.8);
          projectiles.remove(projectile);
          break;
        }
      }
    }
  }
}
```

- [ ] **Step 4: Wire combat into `GameScene`**

Modify `src/game/GameScene.ts`:

```ts
import { CollisionSystem } from "./combat/CollisionSystem";
import { ProjectileSystem } from "./combat/ProjectileSystem";
import { NpcSystem } from "./npc/NpcSystem";

private npcs!: NpcSystem;
private projectiles!: ProjectileSystem;
private collisions!: CollisionSystem;

// inside init(), after player creation
this.npcs = new NpcSystem(this.scene, this.materials);
this.projectiles = new ProjectileSystem(this.scene, this.materials);
this.collisions = new CollisionSystem();

// inside update(deltaSeconds), after player update
if (fireRequest) this.projectiles.spawn(fireRequest.origin, fireRequest.direction);
this.projectiles.update(deltaSeconds);
this.npcs.update(deltaSeconds);
this.collisions.resolveProjectileHits(this.projectiles, this.npcs);

// inside dispose()
this.projectiles?.dispose();
this.npcs?.dispose();
```

- [ ] **Step 5: Verify manually**

Run:

```bash
npm run dev
```

Expected: opening the served URL shows a small map. WASD moves the player. Clicking or pressing space fires yellow projectiles. Projectiles knock red NPCs backward and remove them after three hits.

- [ ] **Step 6: Typecheck and commit**

Run:

```bash
npm run typecheck
git add src/game
git commit -m "feat: add projectile combat and NPC knockback"
```

Expected: typecheck passes and commit succeeds.

## Task 6: HUD, Inspector, And Smoke Test

**Files:**
- Create: `src/game/ui/Hud.ts`
- Create: `src/game/debug/DebugTools.ts`
- Create: `playwright.config.ts`
- Create: `tests/smoke.spec.ts`
- Modify: `src/game/GameScene.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Create HUD**

Create `src/game/ui/Hud.ts`:

```ts
import type { DebugStats } from "../types";

export class Hud {
  private readonly root: HTMLDivElement;

  constructor(root: HTMLDivElement) {
    this.root = root;
    this.root.innerHTML = `
      <section class="hud-panel">
        <h1 class="hud-title">Kodu</h1>
        <div class="hud-row"><span>Health</span><strong data-hud="health">5</strong></div>
        <div class="hud-row"><span>NPCs</span><strong data-hud="npcs">0</strong></div>
        <div class="hud-row"><span>Projectiles</span><strong data-hud="projectiles">0</strong></div>
      </section>
      <section class="hud-help">Move WASD / Arrows · Fire Click / Space · Inspector I</section>
    `;
  }

  update(stats: DebugStats): void {
    this.set("health", String(stats.playerHealth));
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
```

- [ ] **Step 2: Create debug tools**

Create `src/game/debug/DebugTools.ts`:

```ts
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
```

- [ ] **Step 3: Wire HUD and debug tools**

Modify `src/game/GameScene.ts`:

```ts
import { DebugTools } from "./debug/DebugTools";
import { Hud } from "./ui/Hud";

private hud!: Hud;
private debugTools!: DebugTools;

// inside init(), after systems
const hudRoot = document.querySelector<HTMLDivElement>("#hud-root");
if (!hudRoot) throw new Error("Missing #hud-root element.");
this.hud = new Hud(hudRoot);
this.debugTools = new DebugTools(this.scene);

// inside update(deltaSeconds), after combat systems
this.hud.update({
  playerHealth: this.player.health,
  npcCount: this.npcs.npcs.length,
  projectileCount: this.projectiles.projectiles.length,
});

// inside dispose()
this.debugTools?.dispose();
this.hud?.dispose();
```

- [ ] **Step 4: Create Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1280, height: 800 },
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

- [ ] **Step 5: Create smoke test**

Create `tests/smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("renders the game and fires a projectile", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();
  await expect(page.locator(".hud-title")).toHaveText("Kodu");

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyD");
  await page.mouse.click(800, 420);

  await expect(page.locator('[data-hud="projectiles"]')).not.toHaveText("0");
  await page.waitForTimeout(1800);
  await expect(page.locator('[data-hud="projectiles"]')).toHaveText("0");
  expect(pageErrors).toEqual([]);
});
```

- [ ] **Step 6: Run verification**

Run:

```bash
npm run build
npm run test:smoke
```

Expected: build exits with code 0; smoke test passes.

- [ ] **Step 7: Commit HUD and verification**

Run:

```bash
git add src/game src/styles.css playwright.config.ts tests/smoke.spec.ts
git commit -m "feat: add HUD inspector and smoke test"
```

Expected: commit succeeds.

## Self-Review Checklist

- Spec coverage:
  - Vite + TypeScript + Babylon.js scaffold: Task 1.
  - Orthographic 2.5D camera: Task 3.
  - Toy diorama map: Task 3.
  - Player exploration: Task 4.
  - Projectile attack: Task 5.
  - NPC knockback and defeat: Task 5.
  - HTML HUD and Babylon Inspector: Task 6.
  - GLB asset path conventions: Task 1.
  - Build/typecheck/smoke verification: Tasks 2, 3, 4, 5, and 6.
- Placeholder scan:
  - No TBD, TODO, or undefined future tasks.
  - Primitive art is explicitly in scope for the first playable slice.
- Type consistency:
  - `DioramaMap`, `DebugStats`, `InputManager`, `PlayerController`, `ProjectileSystem`, `NpcSystem`, `CollisionSystem`, `Hud`, and `DebugTools` are introduced before use.
  - `GameScene` owns system lifecycle and calls `dispose()` for systems that allocate event handlers or meshes.
