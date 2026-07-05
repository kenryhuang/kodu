# Kodu Concept Gap Visual Pass Design

## Goal

Bring the in-game render closer to the approved concept image. The previous pass added texture files and basic material wiring, but the concept image also depends on dense ground detail, stronger object grounding, richer shadows, more natural foliage, and less plastic-looking characters.

## Visual Direction

- Add visible cast/contact shadows so houses, trees, rocks, player, and NPCs feel attached to the terrain.
- Increase ground richness with non-colliding detail props: grass clumps, wildflowers, small stones, and darker organic patches.
- Make trees feel less like hard low-poly blobs by adding more leaf shell/card layers and darker inner canopy depth.
- Keep buildings simple but strengthen material hierarchy through darker roof grooves, aged wood trim, and slight wall grime.
- Reduce player/NPC plastic feel while keeping color readability.

## Scope

- Add a Babylon shadow generator on the existing sun light and configure terrain/road/patch receivers.
- Add deterministic decorative ground props to the map without changing collision bounds.
- Add extra tree foliage shells and ground clutter around tree bases.
- Tune existing materials and lighting to lower saturation and improve contrast.
- Extend smoke tests to verify shadows and visual-density props exist.

## Non-Goals

- No imported model packs.
- No external asset downloads.
- No gameplay behavior changes.
- No full PBR/normal-map pipeline in this pass.

## Verification

- Tests must check the new visual systems structurally: shadow generator/casters, ground detail props, wildflowers, pebbles, and foliage layers.
- `npm test` must pass.
- Browser screenshot should be compared against the concept image, focusing on ground density, shadows, and object grounding.
