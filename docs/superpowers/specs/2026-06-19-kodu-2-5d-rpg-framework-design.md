# Kodu 2.5D RPG Framework Design

## Summary

Build a Babylon.js + TypeScript + Vite game framework for a 2.5D cartoon RPG prototype in `~/workspace/kodu`. The first playable slice is a toy-diorama adventure: a small readable map, orthographic camera, low-poly cartoon visuals, player exploration, and projectile attacks that knock back NPCs.

## Goals

- Create a clean Babylon.js project foundation that can run locally with Vite.
- Establish a modular game architecture that is easy to extend without building a full ECS yet.
- Implement a playable loop: move, explore, aim/fire a projectile, hit NPCs, apply knockback, and show simple feedback.
- Support quick placeholder assets now and Blender-exported GLB assets later.
- Include Babylon Inspector and simple UI hooks for debugging and iteration.

## Non-Goals For First Slice

- No full quest system, inventory, save/load, dialogue trees, or level editor.
- No multiplayer or backend.
- No full physics simulation unless a simple collision model proves insufficient.
- No polished production art. First slice uses primitives and generated low-poly placeholders.

## Technology Stack

- Runtime: Babylon.js.
- Language: TypeScript.
- Build/dev server: Vite.
- Assets: Blender-exported GLB/glTF, with primitives used for the first placeholder scene.
- Debugging: Babylon Inspector.
- UI: HTML/CSS overlay for HUD and debug readouts; Babylon GUI reserved for optional world-space labels and prompts.

## Gameplay Slice

The player starts on a compact floating island or board-like map. WASD or arrow keys move the player. The camera is orthographic and follows the player from an angled 2.5D perspective. Clicking or pressing a fire control launches a projectile in the current aim direction. Projectiles collide with NPCs, apply knockback, trigger a hit flash, reduce health, and remove defeated NPCs.

NPCs are simple actors. The first version can use idle or light wander behavior. They do not need complex AI. They exist to validate collision, projectile lifetime, knockback, and game-state cleanup.

## Architecture

Use a lightweight system architecture rather than a full ECS.

- `GameApp`: owns engine creation, canvas setup, resize handling, and scene bootstrapping.
- `GameScene`: creates the Babylon scene, lights, camera, map, actors, systems, and update loop.
- `InputManager`: tracks keyboard, pointer position, pointer clicks, and fire commands.
- `PlayerController`: owns player movement, facing/aim direction, and projectile spawn requests.
- `ProjectileSystem`: creates, updates, expires, and disposes projectile entities.
- `NpcSystem`: spawns NPCs, updates simple behavior, tracks health, and handles hit reactions.
- `CollisionSystem`: performs simple radius/AABB checks for player-map bounds, projectile-NPC hits, and obstacle blocking.
- `CameraRig`: maintains orthographic 2.5D follow camera.
- `Hud`: manages HTML overlay for health, controls, NPC count, and debug text.
- `DebugTools`: toggles Babylon Inspector and exposes debug helpers.

Each module should have a narrow public surface. Scene objects may use Babylon meshes internally, but game logic should exchange small domain objects such as positions, velocities, radii, health, and references to render nodes.

## Rendering And Art Direction

The first visual target is a toy diorama:

- Orthographic camera.
- Chunky low-poly player, NPCs, projectiles, trees, rocks, and obstacles.
- Soft color palette with high readability.
- Simple toon-like material choices using flat colors, hemispheric/directional light, and optional outlines later.
- Map boundaries should be visually obvious.

Initial assets should be generated with Babylon primitives so the framework is immediately playable. The asset folder should reserve room for GLB replacement models:

- `public/assets/models/`
- `public/assets/textures/`
- `public/assets/README.md` documenting Blender export conventions.

## Controls

- Move: WASD and arrow keys.
- Aim: pointer direction projected onto the ground plane, with fallback to current facing direction.
- Fire: mouse click or spacebar.
- Debug: a key such as `I` toggles Babylon Inspector.

Controls should be centralized in `InputManager` so mobile/touch or gamepad support can be added later.

## Collision And Combat

Use simple deterministic collision for the first slice:

- Player uses a circular footprint.
- NPCs use circular footprints.
- Projectiles use circular footprints and a finite lifetime.
- Obstacles can use simple boxes or circles.
- Knockback is velocity-based and decays over time.

This avoids adding a physics dependency before the core game feel is proven. If obstacles, slopes, or character pushing become complex, Rapier or Babylon physics can be introduced in a later milestone.

## UI

HTML overlay should show:

- Player health or status.
- NPC count.
- Basic controls.
- Debug readout such as FPS, projectile count, or current state.

Babylon GUI can be used only where world-space UI is valuable, such as NPC labels, interaction prompts, or hit indicators. The first slice should keep most UI in HTML/CSS for speed and maintainability.

## Error Handling

- Asset loading should surface a visible error overlay rather than failing silently.
- Scene startup should guard against missing canvas, failed engine creation, and failed asset loads.
- Systems should dispose Babylon meshes/materials they create when entities expire.
- Debug mode should expose useful counts to catch leaked projectiles or NPC meshes.

## Testing And Verification

Initial verification should be practical:

- `npm run build` must pass.
- `npm run typecheck` must pass.
- A Playwright smoke test should open the local game, verify a canvas renders, verify no page errors, and confirm firing creates/removes projectiles.
- Manual verification should include moving around the map, firing at NPCs, observing knockback, and toggling Babylon Inspector.

## First Implementation Milestone

The first milestone is complete when:

- `~/workspace/kodu` contains a working Vite + TypeScript + Babylon.js project.
- The game launches locally with a 2.5D toy-diorama scene.
- The player can move.
- The camera follows in orthographic 2.5D view.
- The player can fire projectiles.
- NPCs are knocked back when hit and disappear when defeated.
- A simple HUD and Inspector toggle exist.
- Build/typecheck/smoke verification pass.
