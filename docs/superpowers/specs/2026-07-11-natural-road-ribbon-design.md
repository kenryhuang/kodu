# Natural Road Ribbon Design

## Goal

Add one continuous natural dirt road to the current sparse grass map using texture detail sampled from `public/assets/terrain/atlas/road`. The road must follow the height map, blend into the grass without visible tile joints, and leave gameplay behavior unchanged.

## Approved Direction

Use the approved continuous curved road ribbon rather than placing the extracted road sprites as complete tiles. Full sprites contain different painted silhouettes, grass borders, perspective, and widths; direct placement produces visible repeated pieces. The ribbon instead uses their central dirt, pebble, and rut detail inside one transparent repeating road material.

## Generated Road Texture

Add a deterministic Pillow generator that writes `public/assets/terrain/atlas/road/road-ribbon-seamless.png` as a `256x512` RGBA texture.

Texture sources:

- `road-straight-horizontal-wide.png`
- `road-rectangle-wide.png`
- `road-clearing-round-b.png`

Only the central 58 percent of each source is sampled. Samples receive radial feather masks and deterministic quarter-turn rotation, scale, and placement. The top and bottom rows are made periodic so the texture repeats along the road without a visible joint.

The texture alpha profile remains opaque through the middle 64 percent of its width. The outer 18 percent on each side fades to full transparency with a smoothstep curve. Small deterministic width noise prevents the edge from reading as a perfectly straight cut. Transparent side pixels reveal the existing grass material beneath the ribbon.

## Route And Geometry

Reuse the existing `sampleRoute`, `roadJitter`, and `addRoadRibbon` helpers in `createDioramaMap.ts`. Create one mesh named `terrain-road-main` from these control points:

| X | Z | Width |
|---:|---:|---:|
| -18.0 | -10.5 | 2.30 |
| -12.0 | -8.1 | 2.45 |
| -8.0 | -6.4 | 2.35 |
| -3.0 | -5.2 | 2.55 |
| 0.0 | -1.2 | 2.70 |
| 4.0 | -0.4 | 2.50 |
| 8.0 | 0.0 | 2.25 |
| 12.0 | 4.5 | 2.40 |
| 18.0 | 8.8 | 2.30 |

The route enters from the lower-left map boundary, crosses the lower side of the central activity area, and exits at the upper-right boundary. It keeps the large oak beside the road rather than under its center line and clears both right-side trees.

Sample each control-point segment eight times. Each vertex uses `terrainVisualHeightAt(x, z) + 0.055` so the road follows the height map without z-fighting. Width jitter remains subtle and deterministic. Road UV `u` spans the width and `v` advances by traveled distance divided by `5`, causing one texture repeat per five world units.

## Material

Use `mat-terrain-road` for the ribbon with:

- diffuse and bump source `road-ribbon-seamless.png`;
- diffuse alpha enabled with alpha blending;
- wrap mode along the road and transparent edges across it;
- bump level `0.045`;
- no specular highlight;
- current warm dirt tint and emissive values.

The road mesh is visual only. It does not add an obstacle, change map bounds, alter movement speed, or affect jumping and projectile collision.

## Testing

Automated tests must verify:

- the generated texture is served as `image/png` at exactly `256x512`;
- it contains both transparent and visible pixels;
- mean top/bottom RGB and alpha differences are at most `2.0` per channel;
- the scene contains exactly one `terrain-road-main` mesh with at least `120` vertices;
- the road bounds reach both map-side entry areas and span at least `32` world units in X and `17` in Z;
- `mat-terrain-road` uses the generated texture for diffuse and bump channels with alpha blending;
- map bounds and obstacle count remain unchanged;
- existing player, NPC, camera, jump, projectile, and collision tests still pass.

Visual verification at desktop and mobile sizes must confirm:

- no sprite-shaped road pieces or periodic cross-road seams are visible;
- the grass remains visible through both feathered road edges;
- curves and width changes are smooth;
- the road does not pass through a tree trunk;
- characters and HUD remain readable.

## Out Of Scope

- Branch roads, T junctions, crossroads, plazas, bridges, or water crossings.
- Road collision, movement modifiers, navigation logic, or NPC pathfinding.
- Moving or replacing current trees and characters.
- Baking the road into the full terrain texture.
