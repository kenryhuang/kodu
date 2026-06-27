# Kodu

Kodu is a browser-based 2.5D cartoon RPG prototype built with Babylon.js, TypeScript, and Vite. It is currently a playable toy-diorama slice: a small terrain map, an orthographic follow camera, keyboard movement, jumping, mouse-aimed projectiles, NPC knockback, blocking obstacles, generated terrain textures, and a compact HTML HUD.

The project is intentionally lightweight. It uses focused game systems instead of a full entity-component-system framework so the prototype can stay easy to read, test, and extend.

## Current Features

- Babylon.js render loop managed through a Vite application shell.
- Orthographic 2.5D camera that follows the player while ignoring jump height.
- Keyboard movement with WASD and arrow keys.
- Spacebar jumping with deterministic landing support for reachable obstacles.
- Pointer aiming projected onto the ground plane.
- Click-to-fire projectile combat with cooldown, lifetime cleanup, NPC damage, knockback, hit flash, and defeat cleanup.
- Diorama terrain built from a generated heightmap with textured grass, sand patches, winding roads, rocks, houses, fences, trees, bushes, and grass cards.
- Blocking obstacles for rocks and houses, with support for jumping onto lower obstacles.
- HTML/CSS HUD for player health, state, NPC count, projectile count, and controls.
- Babylon Inspector toggle for development.
- Playwright smoke tests that verify rendering, controls, assets, camera resizing, terrain composition, collision behavior, and projectile cleanup.

## Tech Stack

- Runtime: Babylon.js 8
- Language: TypeScript 5 with strict checking
- Build tool and dev server: Vite 7
- Test runner: Playwright
- Package manager: npm

Vite 7 in this lockfile requires Node.js `^20.19.0 || >=22.12.0`.

## Quick Start

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Open the URL printed by Vite, usually:

```text
http://localhost:5173
```

Build the production bundle:

```bash
npm run build
```

Run the full verification suite:

```bash
npm test
```

## Controls

| Action | Control |
| --- | --- |
| Move | `WASD` or arrow keys |
| Jump | `Space` |
| Aim | Move the pointer over the canvas |
| Fire | Mouse click or pointer click |
| Toggle Babylon Inspector | `I` |

The canvas takes focus after startup and after pointer clicks. Spacebar is reserved for jumping and does not fire a projectile.

## Project Structure

```text
.
├── src/
│   ├── main.ts                         # Browser entry point and startup error handling
│   ├── styles.css                      # Fullscreen canvas, HUD, and fatal error overlay
│   └── game/
│       ├── GameApp.ts                  # Babylon engine ownership, resize, and render loop
│       ├── GameScene.ts                # Scene assembly and per-frame system orchestration
│       ├── camera/CameraRig.ts         # Orthographic 2.5D follow camera
│       ├── combat/CollisionSystem.ts   # Player obstacle support and projectile/NPC hits
│       ├── combat/ProjectileSystem.ts  # Projectile spawn, motion, expiry, and disposal
│       ├── debug/DebugTools.ts         # Babylon Inspector toggle
│       ├── input/InputManager.ts       # Keyboard, pointer, jump, fire, and aim projection
│       ├── npc/NpcSystem.ts            # NPC spawn, health, knockback, hit feedback, disposal
│       ├── player/PlayerController.ts  # Player movement, jumping, facing, bounds, fire requests
│       ├── ui/Hud.ts                   # HTML HUD rendering
│       ├── world/createDioramaMap.ts   # Terrain, roads, houses, vegetation, rocks, obstacles
│       ├── world/createMaterials.ts    # Flat, dynamic, and image-backed cartoon materials
│       ├── types.ts                    # Small shared game data types
│       └── utils/math.ts               # Shared math helpers
├── public/assets/                      # Generated PNG assets and future model/texture home
├── scripts/generate-terrain-assets.mjs # Deterministic PNG asset generator
├── tests/smoke.spec.ts                 # Playwright smoke and behavior tests
├── docs/superpowers/                   # Design notes and implementation plans
├── index.html                          # Canvas, HUD root, error root
├── vite.config.ts
├── playwright.config.ts
└── tsconfig.json
```

## Runtime Architecture

`GameApp` owns the Babylon `Engine`, creates `GameScene`, wires resize behavior, and advances the render loop.

`GameScene` creates the light, materials, map, camera, input manager, player, NPC system, projectile system, collision system, HUD, and debug tools. Each frame it:

1. Updates the player and receives optional fire requests.
2. Spawns projectiles when requested.
3. Resolves vertical landing support and horizontal obstacle collision.
4. Clamps the player to map bounds.
5. Updates projectiles and NPCs.
6. Resolves projectile hits against NPCs.
7. Updates HUD counts and camera target.
8. Renders through Babylon.

This keeps the game loop explicit and avoids introducing a larger architecture before the prototype needs it.

## Gameplay Systems

### Player

The player is represented by a Babylon capsule with a circular gameplay footprint. Movement is horizontal and clamped inside map bounds. Jumping uses a simple vertical velocity model with gravity, maximum reachable landing height, and deterministic landing on eligible obstacle tops.

### Camera

The camera is a fixed-angle orthographic `FreeCamera`. It follows the player's horizontal position but uses a fixed target height so jumping does not cause distracting camera bob. Orthographic bounds are recalculated on resize to preserve framing across viewport shapes.

### Combat

Clicking the canvas fires a projectile in the pointer aim direction. If no pointer aim is available, the player fires in the current facing direction. Projectiles move horizontally, expire after a short lifetime, and are disposed when they hit or time out.

NPCs start with health, a circular footprint, and a knockback velocity. Projectile hits damage NPCs, flash their material briefly, apply knockback, and remove defeated NPCs cleanly.

### Collision

The collision system uses simple deterministic checks:

- Player footprint: circle
- NPC footprint: circle
- Projectile footprint: circle
- Obstacles: axis-aligned boxes in gameplay space

Horizontal obstacle resolution pushes the player out of blocking obstacles. Vertical support resolution lets the player land on obstacle tops when the top is within jump reach and the player descends through the surface.

## Assets

The checked-in PNG assets live under `public/assets` and are served by Vite from `/assets/...`.

Terrain assets:

- `public/assets/terrain/heightmap-valley.png`
- `public/assets/terrain/grass.png`
- `public/assets/terrain/sand.png`
- `public/assets/terrain/road.png`

Vegetation assets:

- `public/assets/vegetation/tree-leaves.png`
- `public/assets/vegetation/tree-leaf-shell.png`
- `public/assets/vegetation/tree-bark.png`
- `public/assets/vegetation/bush.png`
- `public/assets/vegetation/grass-card.png`

Regenerate these procedural PNGs with:

```bash
node scripts/generate-terrain-assets.mjs
```

`public/assets/README.md` documents conventions for future Blender-exported GLB files and external textures.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite on `0.0.0.0` with the configured default port. |
| `npm run typecheck` | Run `tsc --noEmit`. |
| `npm run build` | Run TypeScript checking and build with Vite. |
| `npm run test:smoke` | Run the Playwright smoke tests. |
| `npm test` | Run typecheck and smoke tests. |

The Playwright config starts the dev server at `http://127.0.0.1:5173` and reuses an existing server outside CI.

## Testing Coverage

The smoke suite currently verifies:

- Generated image assets are served and have expected dimensions.
- The canvas renders non-empty game pixels.
- HUD text and counters are visible and update.
- Firing creates and later removes projectiles.
- Space jumps without firing.
- Camera height remains stable while the player jumps.
- The village scene contains expected terrain, roads, houses, trees, vegetation, materials, and blocking house obstacles.
- The player can land on reachable obstacles.
- The player cannot land on obstacles above jump reach.
- Airborne movement cannot pass through high obstacles.
- Orthographic camera bounds update on viewport resize.

Run the full suite before pushing gameplay or rendering changes:

```bash
npm test
```

## Development Notes

- `main.ts` exposes the running app on `globalThis.__KODU_APP__` so Playwright can inspect deterministic state.
- Startup errors are rendered into `#error-root` so browser failures are visible on the page.
- Systems that create meshes or cloned materials are responsible for disposing them.
- The prototype avoids a physics dependency for now. The current collision model is deliberately simple and deterministic.
- The design notes under `docs/superpowers/specs` and `docs/superpowers/plans` capture the larger intent for the RPG framework and recent terrain, village, tree, and jump-obstacle work.

## Roadmap Ideas

- Replace primitive actors with GLB character and prop assets.
- Add animation states for idle, run, jump, fire, hit, and defeat.
- Add NPC behavior beyond knockback-only reactions.
- Add interactable objects, dialogue, pickups, or simple quests.
- Add mobile/touch and gamepad input paths through `InputManager`.
- Add sound effects and lightweight music.
- Add world-space labels or interaction prompts where useful.
- Introduce a physics engine only if slopes, pushing, or richer movement make the current model too costly.

## Troubleshooting

If the canvas stays blank, check the visible error overlay and the browser console. Common causes are missing assets, a failed dependency install, or using an unsupported Node.js version for Vite.

If Playwright cannot start, make sure dependencies are installed and the dev server port is available:

```bash
npm install
npm run test:smoke
```

If terrain or vegetation images are missing, regenerate the procedural assets:

```bash
node scripts/generate-terrain-assets.mjs
```
