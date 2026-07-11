# Terrain Atlas Tiles Design

## Goal

Extract every grass, dirt-road, and water tile above the tree row in `public/assets/terrain/0eb25ff3-a845-49d2-a37c-fd90ef46a85b.png` into an independently usable transparent PNG asset.

## Scope

- Include the complete terrain set above the tree row.
- Grass includes flat grass patches, flowered variants, rocky variants, raised cliff blocks, cliff edges, and cliff corners.
- Roads include isolated patches, straight segments, corners, T junctions, intersections, rounded ends, and large clearing shapes.
- Water includes river segments, corners, junctions, ponds, waterfalls, shoreline scenes, and the bridge tile.
- Keep the existing tree, shrub, flower, wood, and rock extraction unchanged.
- Do not place the new terrain tiles into the current map in this change.

## Asset Layout And Naming

Generated files live under three category directories:

- `public/assets/terrain/atlas/grass`
- `public/assets/terrain/atlas/road`
- `public/assets/terrain/atlas/water`

Names use lowercase kebab-case and describe both shape and variant, for example `grass-flat-flowers-a.png`, `road-corner-ne.png`, and `waterfall-wide.png`. Directional suffixes describe the tile as it appears in the source atlas so map-editor users can inspect assets without hidden rotations.

## Extraction Pipeline

Extend `scripts/slice-terrain-atlas-props.py` with a separate terrain-tile manifest containing the source crop box, category, and asset name for every selected tile. The existing natural-prop manifest and outputs remain stable.

Each source crop goes through the existing background flood-fill, alpha conversion, tiny-component cleanup, and tight bounding-box crop. The algorithm removes only atlas-page background connected to a crop edge; enclosed light pixels and texture details remain visible.

The generator creates category directories as needed and reports every output path and final dimensions. Re-running it deterministically overwrites the same named assets.

## Visual Review

Generate a contact sheet in `output/` that groups grass, road, and water assets on a checkerboard. Review it for:

- missing source tiles;
- neighboring artwork leaking into a crop;
- clipped grass, stone, road, water, bridge, or waterfall edges;
- unwanted opaque atlas background;
- accidental removal of light flowers, foam, stones, or highlights.

## Testing

Update the existing terrain image smoke test with the complete generated asset manifest. For each new PNG, verify:

- the file is served successfully as `image/png`;
- width and height are at least 16 pixels;
- the image contains visible pixels;
- the image contains transparent pixels.

Run the focused asset test first, then the full test suite after visual review.

## Out Of Scope

- Runtime materials, tile-map assembly, collision, or terrain placement.
- Rotated or recolored variants not present in the source atlas.
- Changes to existing vegetation assets or the original source atlas.
