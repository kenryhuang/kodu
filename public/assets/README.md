# Kodu Assets

Use `public/assets/models` for Blender-exported GLB files and `public/assets/textures` for external textures.

Blender export defaults:

- Export format: GLB for single-file game assets.
- Apply transforms before export.
- Keep model origins meaningful: feet center for characters, base center for props.
- Use meters as authoring scale.
- Use short lowercase filenames such as `player.glb`, `npc_slime.glb`, and `tree_oak.glb`.
- Avoid unsupported compression extensions until the runtime loader is explicitly configured.
