# Large Textured Terrain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the small diorama platform with a larger height-map terrain that uses committed image assets for grass, sand, and road surfaces.

**Architecture:** Add a small terrain asset pipeline under `scripts/` that generates PNG files into `public/assets/terrain/`. Extend the Babylon material factory with URL texture materials, then update `createDioramaMap` to create a large height-map ground and visual road/sand layers while preserving planar player physics and existing obstacle behavior.

**Tech Stack:** TypeScript, Babylon.js `MeshBuilder.CreateGroundFromHeightMap`, Babylon.js `Texture`, Node.js asset generation, Playwright smoke tests, Vite public assets.

## Global Constraints

- Terrain images must live under `public/assets/terrain/`.
- Required PNG assets: `heightmap-valley.png`, `grass.png`, `sand.png`, `road.png`.
- Player movement remains planar in this pass.
- Existing jump, house, rock, camera, and airborne high-obstacle collision behavior must continue to pass.
- `npm test` and `npm run build` must pass before completion.

---

## File Structure

- Create `scripts/generate-terrain-assets.mjs`: deterministic Node script that writes the four PNG terrain assets without adding npm dependencies.
- Create `public/assets/terrain/heightmap-valley.png`: grayscale height map for the large terrain.
- Create `public/assets/terrain/grass.png`: reusable cartoon grass tile.
- Create `public/assets/terrain/sand.png`: reusable cartoon sand tile.
- Create `public/assets/terrain/road.png`: reusable cartoon dirt road tile.
- Modify `src/game/world/createMaterials.ts`: add terrain image texture materials.
- Modify `src/game/world/createDioramaMap.ts`: replace the box platform with a large height-map terrain, add visual sand and road ground layers, enlarge bounds.
- Modify `tests/smoke.spec.ts`: add asset URL checks and terrain scene/material assertions.

---

### Task 1: Terrain Asset Pipeline

**Files:**
- Create: `scripts/generate-terrain-assets.mjs`
- Create: `public/assets/terrain/heightmap-valley.png`
- Create: `public/assets/terrain/grass.png`
- Create: `public/assets/terrain/sand.png`
- Create: `public/assets/terrain/road.png`
- Modify: `tests/smoke.spec.ts`

**Interfaces:**
- Produces asset URLs:
  - `/assets/terrain/heightmap-valley.png`
  - `/assets/terrain/grass.png`
  - `/assets/terrain/sand.png`
  - `/assets/terrain/road.png`

- [ ] **Step 1: Write the failing asset URL smoke test**

Add this test near the other smoke tests in `tests/smoke.spec.ts`:

```ts
test("terrain image assets are served", async ({ page }) => {
  await page.goto("/");
  for (const asset of [
    "/assets/terrain/heightmap-valley.png",
    "/assets/terrain/grass.png",
    "/assets/terrain/sand.png",
    "/assets/terrain/road.png",
  ]) {
    const response = await page.request.get(asset);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
    expect((await response.body()).byteLength).toBeGreaterThan(500);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test:smoke -- --grep "terrain image assets are served"
```

Expected: FAIL because the PNG files do not exist yet.

- [ ] **Step 3: Add the deterministic asset generator**

Create `scripts/generate-terrain-assets.mjs` with these responsibilities:

```js
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "public", "assets", "terrain");
mkdirSync(outDir, { recursive: true });

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let c = index;
  for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(fileName, width, height, pixelAt) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = pixelAt(x, y, width, height);
      raw[row + 1 + x * 4 + 0] = r;
      raw[row + 1 + x * 4 + 1] = g;
      raw[row + 1 + x * 4 + 2] = b;
      raw[row + 1 + x * 4 + 3] = a;
    }
  }
  writeFileSync(join(outDir, fileName), Buffer.concat([
    pngSignature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]));
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wave = (x, y, seed) => Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453 % 1;

writePng("heightmap-valley.png", 128, 128, (x, y, width, height) => {
  const nx = (x / (width - 1)) * 2 - 1;
  const nz = (y / (height - 1)) * 2 - 1;
  const radius = Math.sqrt(nx * nx + nz * nz);
  const roadNorth = Math.abs(nx + nz * 0.12) < 0.08 && nz < 0.62;
  const roadEast = Math.abs(nz - 0.16) < 0.08 && nx > -0.1;
  const roadSouthWest = Math.abs(nz - nx * 0.36) < 0.09 && nx < 0.15 && nz > -0.78;
  let value = 34 + clamp(radius - 0.35, 0, 1) * 110;
  if (roadNorth || roadEast || roadSouthWest) value = Math.min(value, 72);
  const shade = Math.round(clamp(value, 20, 180));
  return [shade, shade, shade, 255];
});

writePng("grass.png", 64, 64, (x, y) => {
  const n = Math.floor(Math.abs(wave(x, y, 3)) * 22);
  const blade = (x + y * 2) % 13 === 0 ? 24 : 0;
  return [78 + n, 142 + n + blade, 58 + n, 255];
});

writePng("sand.png", 64, 64, (x, y) => {
  const n = Math.floor(Math.abs(wave(x, y, 7)) * 20);
  const dot = (x * 5 + y * 3) % 29 === 0 ? 18 : 0;
  return [196 + n + dot, 163 + n + dot, 94 + n, 255];
});

writePng("road.png", 64, 64, (x, y) => {
  const n = Math.floor(Math.abs(wave(x, y, 11)) * 18);
  const pebble = (x * 7 + y * 5) % 23 === 0 ? -22 : 0;
  return [129 + n + pebble, 91 + n + pebble, 54 + n + pebble, 255];
});
```

The script must not depend on third-party packages.

- [ ] **Step 4: Generate and inspect assets**

Run:

```bash
node scripts/generate-terrain-assets.mjs
ls -lh public/assets/terrain
```

Expected: the four PNG files exist and are non-empty.

- [ ] **Step 5: Run the asset test to verify it passes**

Run:

```bash
npm run test:smoke -- --grep "terrain image assets are served"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-terrain-assets.mjs public/assets/terrain tests/smoke.spec.ts
git commit -m "feat: add terrain image assets"
```

---

### Task 2: Terrain Materials And Large Height Map

**Files:**
- Modify: `src/game/world/createMaterials.ts`
- Modify: `src/game/world/createDioramaMap.ts`
- Modify: `tests/smoke.spec.ts`

**Interfaces:**
- `createMaterials(scene)` returns:
  - `terrainGrass`
  - `terrainSand`
  - `terrainRoad`
- `createDioramaMap(scene, materials)` creates meshes:
  - `terrain-heightmap-ground`
  - `terrain-sand-south-east`
  - `terrain-road-center`
  - `terrain-road-north`
  - `terrain-road-east`
  - `terrain-road-south-west`

- [ ] **Step 1: Write the failing terrain scene smoke test**

Extend the existing village/map snapshot helper to report:

```ts
terrainGrounds: names.filter((name) => name === "terrain-heightmap-ground").length,
terrainSandLayers: names.filter((name) => name.startsWith("terrain-sand-")).length,
terrainRoadLayers: names.filter((name) => name.startsWith("terrain-road-")).length,
terrainTextureMaterials: materialNames.filter((name) => name.startsWith("mat-terrain-")).length,
mapBounds: map.bounds,
```

Add assertions to the village/map test:

```ts
expect(village.terrainGrounds).toBe(1);
expect(village.terrainSandLayers).toBeGreaterThanOrEqual(1);
expect(village.terrainRoadLayers).toBeGreaterThanOrEqual(4);
expect(village.terrainTextureMaterials).toBeGreaterThanOrEqual(3);
expect(village.mapBounds.maxX - village.mapBounds.minX).toBeGreaterThanOrEqual(32);
expect(village.mapBounds.maxZ - village.mapBounds.minZ).toBeGreaterThanOrEqual(24);
```

- [ ] **Step 2: Run the terrain scene test to verify it fails**

Run:

```bash
npm run test:smoke -- --grep "renders village houses as tall blocking obstacles"
```

Expected: FAIL because the terrain mesh, layers, and materials are not implemented.

- [ ] **Step 3: Add terrain texture materials**

In `src/game/world/createMaterials.ts`, add a helper:

```ts
const makeImageTextured = (name: string, url: string, fallbackColor: Color3, scale = 1): StandardMaterial => {
  const material = make(name, fallbackColor);
  const texture = new Texture(url, scene, {
    noMipmap: false,
    invertY: false,
    samplingMode: Texture.NEAREST_SAMPLINGMODE,
  });
  texture.uScale = scale;
  texture.vScale = scale;
  material.diffuseTexture = texture;
  material.diffuseColor = new Color3(1, 1, 1);
  return material;
};
```

Return these materials:

```ts
terrainGrass: makeImageTextured("mat-terrain-grass", "/assets/terrain/grass.png", new Color3(0.42, 0.72, 0.36), 12),
terrainSand: makeImageTextured("mat-terrain-sand", "/assets/terrain/sand.png", new Color3(0.78, 0.64, 0.38), 5),
terrainRoad: makeImageTextured("mat-terrain-road", "/assets/terrain/road.png", new Color3(0.55, 0.4, 0.25), 4),
```

- [ ] **Step 4: Replace the platform with height-map terrain**

In `src/game/world/createDioramaMap.ts`, replace `map-grass-platform` and `map-dark-edge` with:

```ts
const terrain = MeshBuilder.CreateGroundFromHeightMap("terrain-heightmap-ground", "/assets/terrain/heightmap-valley.png", {
  width: 36,
  height: 28,
  subdivisions: 96,
  minHeight: -0.12,
  maxHeight: 0.9,
}, scene);
terrain.material = materials.terrainGrass;
```

Add a low dark base under the terrain:

```ts
const edge = MeshBuilder.CreateBox("map-dark-edge", { width: 37, height: 0.42, depth: 29 }, scene);
edge.position.y = -0.42;
edge.material = materials.edge;
```

- [ ] **Step 5: Add visual sand and road layers**

Use `addPathTile` for named road overlays with `materials.terrainRoad`, and add a thin sand box or ground layer named `terrain-sand-south-east` with `materials.terrainSand`. Keep these layers visual-only and do not add them to `obstacles`.

Required approximate placements:

```ts
addTerrainLayer("terrain-sand-south-east", new Vector3(8.5, 0.035, -6.4), 7.2, 4.8, -0.15, scene, materials.terrainSand);
addTerrainLayer("terrain-road-center", new Vector3(0, 0.045, 0.4), 1.25, 8.2, 0.08, scene, materials.terrainRoad);
addTerrainLayer("terrain-road-north", new Vector3(-1.2, 0.046, 6.8), 1.05, 8.5, -0.28, scene, materials.terrainRoad);
addTerrainLayer("terrain-road-east", new Vector3(8.2, 0.047, 2.1), 1.05, 11.5, Math.PI / 2 - 0.16, scene, materials.terrainRoad);
addTerrainLayer("terrain-road-south-west", new Vector3(-7.3, 0.048, -5.2), 1.05, 10.4, Math.PI / 2 + 0.32, scene, materials.terrainRoad);
```

- [ ] **Step 6: Enlarge map bounds**

Return:

```ts
bounds: { minX: -17.2, maxX: 17.2, minZ: -13.2, maxZ: 13.2 }
```

- [ ] **Step 7: Run the terrain scene test to verify it passes**

Run:

```bash
npm run test:smoke -- --grep "renders village houses as tall blocking obstacles"
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/game/world/createMaterials.ts src/game/world/createDioramaMap.ts tests/smoke.spec.ts
git commit -m "feat: add large textured terrain map"
```

---

### Task 3: Full Verification And Preview

**Files:**
- Verify all project files from Tasks 1 and 2.

**Interfaces:**
- Local preview remains on `http://localhost:4173/`.

- [ ] **Step 1: Run full tests**

Run:

```bash
npm test
```

Expected: all smoke tests pass.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: build exits 0. Existing Fluent UI `use client` and chunk-size warnings may still appear.

- [ ] **Step 3: Restart preview on port 4173**

Run:

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
kill <pid-from-lsof-if-any>
npx vite preview --host 0.0.0.0 --port 4173
curl -I http://localhost:4173/
```

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 4: Final status**

Report:

- latest commits
- tests and build results
- preview URL and PID
