# Village Houses Design

## Goal

Add a small village feel to the existing Kodu diorama map by placing a few stylized houses and nearby village details. The result should feel like the Babylon.js Getting Started Chapter 2 village/house tutorial adapted to this game's current toy-diorama style.

## Scope

- Add three houses to the existing map.
- Build each house from Babylon primitives: a box body and a prism-like roof.
- Add lightweight village details such as a dirt path, short fence segments, and small props.
- Keep the current custom movement, collision, jump, projectile, NPC, and camera systems.
- Keep `Space` jump and mouse-click fire unchanged.
- Do not add external art assets, model loaders, textures, or a new placement system.

## House Behavior

Each house body is a collision obstacle. House body top height must be greater than the player's `1.8m` maximum jump reach from the floor, so houses block movement and cannot become valid jump landing surfaces.

Roofs are visual-only mesh children or companion meshes. They sit above the house body and do not need separate collision because the body already blocks the player footprint.

## Visual Style

Houses should use warm, readable colors that contrast with the grass and rocks:

- Wall material: light plaster or clay.
- Roof material: red-brown.
- Fence material: muted wood.
- Path material: compact dirt.

The houses should be placed near map edges or corners so the player still has a clear playable route through the center. Existing rocks must remain reachable jump targets.

## Implementation Shape

Extend `createMaterials.ts` with house, roof, fence, and path materials.

Extend `createDioramaMap.ts` with helper functions:

- `makeObstacle(...)` remains the collision obstacle factory for box-shaped blocking bodies.
- `addHouse(...)` creates a box body obstacle and a roof mesh.
- `addFenceSegment(...)` creates low decorative fence pieces.
- `addPathTile(...)` creates flat dirt path tiles.

The roof can use `MeshBuilder.CreateCylinder` with `tessellation: 3`, rotated and scaled into a simple triangular prism, matching the basic-house tutorial's prism-like roof idea while keeping code small.

## Testing

Update smoke coverage to verify:

- The scene contains three house body meshes.
- The scene contains three house roof meshes.
- At least three house obstacles are registered in the map.
- Every registered house obstacle has a top height greater than `1.8m`.
- Existing jump and obstacle landing tests still pass.

## Risks

- House placement can accidentally block the player's main movement route. Avoid the center lane and leave clear space around spawn.
- Low decorative pieces should not accidentally become confusing jump platforms. Keep fences decorative unless a later feature asks for fence collision.
- Roof mesh orientation may need minor adjustment after visual inspection, but it should remain primitive-based and asset-free.
