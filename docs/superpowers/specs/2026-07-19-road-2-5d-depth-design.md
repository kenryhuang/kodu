# Road 2.5D Depth Design

## Goal

Upgrade the existing high-resolution hand-painted road from a flat decal appearance to an obviously dimensional 2.5D surface. Pebbles, ruts, compacted dirt, and road shoulders must respond visibly to the existing scene light while preserving the current color style and road silhouette.

This change must not alter player movement, collision, route layout, or terrain traversal height.

## Current State and Root Cause

The main road is a terrain-following ribbon with seven vertices across its width. Its geometry already supplies enough cross-road samples for a shallow profile, and the scene already has hemispheric and directional lighting.

The road still appears flat because its material deliberately bypasses that lighting:

- `disableLighting` is enabled.
- The diffuse texture is also used as a full-strength emissive texture.
- The emissive color is pure white.
- No dedicated road normal map is bound.
- Every cross-road vertex currently sits at the same small offset above the terrain.

Higher color-texture resolution alone therefore cannot create stable 2.5D depth.

## Selected Approach

Use a hybrid material-and-geometry solution.

### Material Depth

Generate a seamless normal map from the remastered road source and save it beside the road atlas assets. The normal map will encode:

- raised light-colored pebbles;
- shallow depressions and ruts in compacted dirt;
- lower-frequency soil undulation;
- restrained edge variation around the grassy shoulder.

The road material will use the existing color texture as diffuse input and the new texture as bump/normal input. Lighting will be enabled. Specular response will remain very low and broad so the surface reads as dry matte soil instead of plastic. A small warm emissive contribution may remain only to protect the hand-painted palette in shadow; the diffuse texture must not remain a full-strength emissive texture.

### Geometric Depth

The road ribbon will receive a shallow, symmetric cross-section using its existing seven width samples:

- the center crown rises approximately 4–6 cm relative to the shoulders;
- the profile eases smoothly rather than forming a ridge;
- the outer shoulder remains close to the terrain and keeps the current alpha-blended silhouette;
- the entire road continues to follow heightmap elevation and ground normals.

This geometry is visual only. Collision and movement continue to use the existing terrain ground, so character behavior and reachable heights do not change.

## Asset Pipeline

Extend the deterministic road remaster pipeline to generate the normal map whenever the road textures are regenerated. The output must:

- match the ribbon texture dimensions of 1024 × 2048;
- tile continuously from top to bottom;
- use RGB normal data without accidental alpha holes;
- be reproducible from committed source materials;
- retain the existing road color outputs unchanged except where a later visual calibration explicitly requires it.

## Runtime Changes

`createMaterials` will configure the road as a lit matte `StandardMaterial` with the generated normal map. The material will keep alpha from the diffuse texture and retain bilinear sampling and wrapping behavior.

`addRoadRibbon` will apply the cross-road crown offset along the sampled ground normal rather than world Y alone. Normals will be recomputed from the final vertex positions so the directional light responds to the geometric profile.

No additional road mesh, physics body, shadow caster, or per-frame update is introduced.

## Visual Acceptance Criteria

At the default orthographic camera angle:

- individual pebbles read as raised objects rather than painted dots;
- ruts and compacted soil show directional light and shade;
- the road center and shoulders form a visible but restrained cross-section;
- road edges remain soft and hand-painted, without a hard curb;
- the surface is matte, with no plastic gloss or aggressive sharpening halo;
- the result remains legible at 1440 × 900 and 390 × 844 viewports.

## Automated Verification

Add or update tests that verify:

- the normal-map asset exists, is 1024 × 2048 RGB/RGBA, and is vertically seamless;
- the road material has lighting enabled;
- the road material binds the dedicated normal map;
- full-strength diffuse emissive mapping is removed;
- the road ribbon retains at least seven cross-width samples;
- the center vertices are measurably above the shoulder vertices within the 4–6 cm design range;
- the road continues to follow the terrain without a visible height gap;
- existing movement, jump, projectile, resize, and asset-serving tests remain green.

Final validation includes fresh desktop and mobile screenshots plus the full test and production-build commands.

## Non-Goals

- No displacement or tessellation shader.
- No parallax-occlusion mapping.
- No change to player collision or navigation.
- No replacement of the existing hand-painted road color artwork.
- No additional loose pebble meshes or road-side props in this iteration.
