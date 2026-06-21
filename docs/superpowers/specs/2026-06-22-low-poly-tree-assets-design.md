# Low-Poly Tree Assets Design

## Goal

Upgrade the map trees from thin vegetation-card clusters into fuller low-poly tree assets that better match the Babylon.js `#DR9MT2#77` demo: solid stylized trunks, sculpted branch structure, dense leaf masses, hard alpha-tested foliage edges, and strong readable silhouettes from the current orthographic camera.

## References

- Babylon.js Playground `#DR9MT2#77` loads `ancient_ruins05k-png.glb`, which includes separate `TreeLOWPOLY_Tree_0` and `TreeLOWPOLY_Leaves_0` meshes.
- The demo's `Leaves` material uses alpha masking, double-sided rendering, and a high alpha cutoff instead of soft alpha blending.
- The demo's material pass disables back-face culling and changes non-ground texture sampling toward nearest-neighbor pixel styling.

## Scope

- Replace the current sparse `tree-*-leaf-card-*` canopy approach with a fuller local low-poly tree asset builder.
- Keep all tree assets generated in code and local PNG assets; do not load the full remote ruins GLB at runtime.
- Build trees from solid trunk, root, branch, and leaf-mass meshes, not only flat crossed planes.
- Use alpha-tested foliage materials with nearest-neighbor sampling for a crisper game-asset look.
- Preserve several tree variations so repeated trees do not look cloned.
- Keep ground grass and bush vegetation cards as secondary decoration unless they visually conflict with the new trees.
- Keep player movement, obstacle collision, jump behavior, houses, roads, and firing controls unchanged.

## Non-Goals

- Do not import the full `ancient_ruins05k-png.glb` into the app.
- Do not make trees into physical obstacles in this pass.
- Do not add skeletal animation, wind animation, LOD switching, or runtime asset streaming.
- Do not change the terrain, roads, houses, or player controls except where tree placement needs small visual spacing adjustments.

## Tree Asset Design

Each tree should be assembled as a small local asset:

- A thicker, tapered low-poly trunk made from cylinders or custom vertex meshes.
- Multiple angled branch meshes that reach into the canopy instead of ending below it.
- Root wedges at the ground to anchor the tree visually.
- Several overlapping low-poly leaf masses made from flattened irregular ellipsoid or custom polygon meshes.
- A few alpha-tested leaf-shell planes embedded in the leaf mass only for silhouette breakup, not as the main canopy volume.

The canopy should read as a dense object with volume from the game camera. Leaf geometry should overlap at different heights and offsets, forming a coherent crown rather than separate floating cards. The silhouette should be uneven and stylized, with small gaps and cutouts, but not transparent enough to look sparse.

## Foliage Materials

Add a dedicated alpha-test material path for foliage. It should:

- Use generated PNGs from `public/assets/vegetation/`.
- Set `backFaceCulling = false`.
- Use alpha from the diffuse texture.
- Prefer alpha testing or mask-like transparency over soft alpha blending for tree leaves.
- Use nearest-neighbor texture sampling for tree foliage and bark detail where it improves the low-poly look.

The existing `tree-leaves.png` can be regenerated or replaced with a denser, more asset-like texture. Additional textures such as `tree-leaf-shell.png` or `tree-bark.png` are allowed if they keep the implementation local and deterministic.

## Variation

Create at least three visual tree styles:

- Broad oak-like tree with a wide crown.
- Tall narrow tree with a higher crown.
- Bent village tree with asymmetrical branch and leaf placement.

Variation should come from data-driven style parameters: scale, yaw, trunk lean, branch angles, canopy lobe positions, leaf tint, and shell count. The implementation should avoid hard-coding every tree by hand.

## Testing

- Smoke tests verify tree foliage materials use an alpha-test or mask-like mode, not only alpha blending.
- Smoke tests verify tree leaf volume meshes exist and have enough vertices to represent solid low-poly crowns.
- Smoke tests verify tree leaf card count is reduced or no longer the main canopy signal.
- Smoke tests verify at least three tree style variants are present in the scene.
- Existing terrain, road, house, jump, collision, firing, and camera tests must continue to pass.
- `npm test` and `npm run build` must pass before the implementation is considered complete.
