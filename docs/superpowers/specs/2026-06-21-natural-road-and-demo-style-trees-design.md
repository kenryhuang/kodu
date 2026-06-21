# Natural Road And Demo-Style Trees Design

## Goal

Make the map feel more natural by replacing the separate road patches with one continuous irregular road that crosses the whole terrain, and by rebuilding trees with the textured vegetation-card technique used by the referenced Babylon.js demo.

## References

- Babylon.js Playground `#DR9MT2#80` uses low-poly scene meshes plus alpha-textured vegetation cards for leaves, plants, and grass.
- The current map already has image-based terrain materials for grass, sand, and dirt roads, plus generated terrain assets under `public/assets/terrain/`.

## Scope

- Replace the current disconnected road patch layout with a continuous main dirt road that visibly enters one side of the map, passes through the village area, and exits another side.
- Shape the road as an organic ribbon mesh generated from route control points, variable width, and irregular edge jitter.
- Keep short village spur paths where they help houses connect to the main road, but make the main road the dominant readable path.
- Add reusable vegetation image assets under `public/assets/vegetation/`.
- Rebuild tree canopies with transparent leaf-card clusters instead of sphere canopies.
- Add small grass or bush card groups around selected trees and grassland areas using the same alpha-card method.
- Keep the existing player movement, obstacle collision, jump height, houses, and firing controls unchanged.

## Non-Goals

- Do not import the full external demo GLB.
- Do not add a new asset loader or runtime dependency.
- Do not turn tree leaves, grass cards, or bushes into physical obstacles.
- Do not rewrite terrain physics or make the player follow terrain height in this pass.

## Road Design

The road should be a single mesh named and testable as the main continuous road. It follows a soft S-shaped route from the southwest edge, through the village center, toward the northeast or east edge. The route should be built from sampled control points so it has enough geometry to curve naturally instead of looking like rotated rectangles.

The mesh edges should vary independently. Width should change slightly along the route, and the left and right borders should receive small deterministic jitter. The road material can reuse the existing dirt road texture and alpha feathering so grass bleeds softly through the edge.

Short spur paths can be generated with the same helper for house approaches, but they should remain visually secondary and should not break the requirement that one road spans the map.

## Tree And Vegetation Design

Trees should follow the demo's method rather than the current sphere-canopy method. Each tree keeps a low-poly trunk, roots, and a few branch meshes. The canopy becomes multiple crossed or angled planes using a generated transparent leaf texture. The material should be double-sided and alpha-capable so the leaves read from the fixed camera angle without visible rectangular cards.

Variation should come from scale, trunk lean, branch yaw, leaf-card count, leaf tint, and canopy height. The result should stay cartoon-like, but the silhouette should look lighter and less blobby than spheres.

Additional grass or bush cards can reuse this pipeline: simple crossed planes, alpha texture, and no collision. These should be placed irregularly around grassland and near tree bases so the terrain feels less grid-like.

## Asset Pipeline

Create or extend a small Node asset generator that produces PNG textures in `public/assets/vegetation/`, such as:

- `tree-leaves.png` for canopy cards.
- `bush.png` for low shrub cards.
- `grass-card.png` for small ground vegetation cards.

The assets should be committed so the local preview and smoke tests can load them directly. Generated assets should remain stylized and transparent, matching the existing hand-painted terrain direction.

## Testing

- Smoke tests verify vegetation asset URLs exist and return PNG responses.
- Smoke tests verify the scene contains one continuous main road mesh with many vertices and bounds that span most of the map.
- Smoke tests verify road spur paths, if present, are secondary to the main road.
- Smoke tests verify tree canopies use vegetation card meshes and alpha-capable materials.
- Smoke tests verify old sphere canopy meshes are removed from the tree implementation.
- Existing jump, obstacle, house, terrain, firing, and camera tests must continue to pass.
- `npm test` and `npm run build` must pass before the implementation is considered complete.
