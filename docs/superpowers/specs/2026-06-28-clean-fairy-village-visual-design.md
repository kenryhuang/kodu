# Clean Fairy Village Visual Design

## Goal

Shift the village scene toward a clean, bright fairy-tale look while preserving the current game mechanics and the improved grass direction.

## Selected Direction

Use direction A: clean fairy village. The scene should feel lighter, simpler, and more natural, with warm dirt paths, houses placed beside roads instead of on top of them, trees with readable trunks and leaf layers, and sparse organic ground details.

## Scope

- Change visual materials, generated PNG assets, map placement, and mesh composition.
- Keep player controls, NPCs, projectiles, camera, collisions, and map bounds intact.
- Keep three houses as blocking obstacles, but move their bodies off the main road and simplify their visual details.
- Keep road ribbons and meadow overlays, but make roads warmer and cleaner.

## Design Requirements

- Road: warm tan/brown dirt, lower contrast, fewer black muddy ruts, soft alpha edges.
- Houses: bright plaster walls, clean roof colors, fewer grime/moss/weathering parts, simpler silhouettes.
- Placement: no house body may intersect the main road footprint in the smoke-test snapshot.
- Trees: each tree must have a visible trunk/branch structure and leaf cards or leaf clusters arranged as layered foliage instead of ball-like blobs.
- Ground details: sand/dirt patches, bushes, grass clumps, pebbles, and flowers should be sparse, organic, and placed away from the road where practical.
- Overall: reduce dark heavy patches and noisy texture details so the scene reads clean at gameplay camera distance.

## Verification

- Add Playwright smoke assertions for warm road material color, house-road separation, simplified house detail counts, and leafy tree structure.
- Regenerate deterministic PNG assets.
- Run `npm run typecheck` and `npm run test:smoke`.
- Capture a final screenshot for visual review.
