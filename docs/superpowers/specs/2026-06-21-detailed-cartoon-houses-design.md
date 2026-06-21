# Detailed Cartoon Houses Design

## Goal

Upgrade the village houses from simple block placeholders into richer cartoon low-poly houses while keeping the existing movement and collision behavior unchanged.

## Scope

- Keep the three existing village house placements.
- Keep each house body as the only blocking obstacle for movement and jump checks.
- Add visual detail meshes: doors, windows, frames, roof overhangs, chimneys, and roof tile strips.
- Add lightweight procedural texture materials using Babylon `DynamicTexture`; do not add external image assets.
- Give each house a small variation in color, door/window layout, chimney placement, and roof tile density.
- Preserve the current cartoon style and performance budget.

## Visual Direction

The houses should look like small hand-painted toy village buildings. Walls use warm painted plaster or timber-like texture. Roofs use saturated stylized shingles. Doors and windows use simple flat geometry with chunky trim so they read clearly from the orthographic camera.

## Collision And Gameplay

The house body obstacles remain taller than the player's `1.8m` jump reach. Decorative meshes are visual-only and must not be added to `map.obstacles`, so the player does not collide with doors, trim, chimneys, or roof tiles separately.

## Verification

- Smoke tests count the three house bodies and roofs.
- Smoke tests verify each house has detail meshes, including doors, windows, chimneys, roof overhangs, and roof tile strips.
- Smoke tests continue to verify house obstacle top heights are above `1.8m`.
- Full `npm test` and `npm run build` must pass before merging.
