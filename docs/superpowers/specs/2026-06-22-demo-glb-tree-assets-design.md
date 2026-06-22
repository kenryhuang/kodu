# Demo GLB Tree Assets Design

## Goal

Replace the current procedural tree visuals with tree models sourced from the Babylon.js Playground demo `#DR9MT2#77`, because the current low-poly leaf volumes read as dark stone clusters rather than believable foliage. The target look is still stylized and game-friendly, but with more realistic leaf silhouettes, alpha-cut foliage, bark texture, and branch structure.

## Reference

- Demo: https://playground.babylonjs.com/#DR9MT2#77
- Demo GLB source: `https://raw.githubusercontent.com/CedricGuillemet/dump/master/starryassets/ancient_ruins05k-png.glb`
- Original model referenced by the demo: Sketchfab `Ancient ruins` by fedorzabelin, licensed CC Attribution.

The implementation must include attribution in the repo when the GLB is vendored locally.

## Asset Strategy

Download the demo GLB into `public/assets/models/ancient_ruins05k-png.glb` and load it from the local app. Do not load the model from GitHub at runtime.

The full GLB contains more than trees. The runtime should import the file once, identify tree-related meshes by names observed in the asset, and hide the source meshes after building reusable tree templates. The expected tree mesh names include the demo-style low-poly leaf and trunk meshes, such as `TreeLOWPOLY_Leaves_0` and `TreeLOWPOLY_Tree_0`.

If more tree mesh names are present, the loader can include them by a conservative tree-name predicate, but it should not blindly display the full ruins scene.

## Scene Integration

Create a small tree asset loader near the world creation code. It should:

- Import the GLB once per scene.
- Extract or group tree meshes into a reusable template.
- Apply demo-like material fixes to imported tree materials:
  - disable back-face culling;
  - use alpha testing for foliage;
  - disable alpha blending for foliage;
  - use nearest-neighbor texture sampling for the stylized texture look.
- Clone or instantiate the template for each village tree placement.
- Keep the current six tree placements, but vary each instance by scale, yaw, and a small foliage tint or material variant where practical.

The imported trees are visual scenery only. They should not add player collision obstacles, because house and rock obstacle behavior already covers traversal rules and tree collision would make movement noisy.

## Visual Requirements

The resulting trees should read as trees at gameplay distance:

- leaf edges should be irregular and leaf-like, not closed blob volumes;
- trunks should show bark/wood texture and branch-like structure;
- the tree silhouette should have transparent gaps from alpha-cut foliage;
- individual trees should not look like exact copies.

The old procedural tree volumes may remain in code only as a fallback if the GLB fails to load during development, but they should not be the main visible tree path.

## Testing

Smoke tests should cover:

- the local GLB asset is served with a non-empty response;
- the village scene contains imported/demo tree meshes or instances;
- foliage materials use alpha testing, not alpha blending;
- the old procedural tree leaf volumes are not the primary tree representation;
- existing player jump, firing, obstacle, camera, and resize tests continue to pass.

Manual visual verification should include desktop and narrow mobile screenshots from `http://localhost:4173/`.

## Non-Goals

- Do not import the full ruins environment as visible map content.
- Do not make trees physical blockers.
- Do not redesign terrain, houses, roads, player movement, or controls in this pass.
- Do not depend on remote asset URLs at runtime.
