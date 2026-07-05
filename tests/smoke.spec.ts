import { expect, test, type Locator, type Page } from "@playwright/test";

type CameraSnapshot = {
  renderWidth: number;
  renderHeight: number;
  orthoLeft: number;
  orthoRight: number;
  positionY: number;
  targetY: number;
};

type PlayerSnapshot = {
  x: number;
  y: number;
  z: number;
  footHeight: number;
  grounded: boolean;
  surfaceHeight: number;
};

type VillageSnapshot = {
  terrainGrounds: number;
  terrainSandPatches: number;
  terrainMeadowPatches: number;
  terrainRoadPatches: number;
  terrainMainRoads: number;
  terrainMainRoadVertices: number;
  terrainMainRoadBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null;
  terrainRoadSpurs: number;
  terrainRectangularLayers: number;
  terrainPatchMinVertices: number;
  terrainSandPatchMinVertices: number;
  terrainSandTextureSource: string | null;
  terrainTextureMaterials: number;
  terrainAlphaBlendMaterials: number;
  terrainRepeatedAlphaMaterials: number;
  textureReliefMaterials: number;
  conceptAtlasTextureMaterials: number;
  conceptAtlasCoreMaterials: number;
  conceptTileCoreMaterials: number;
  vegetationAlphaMaterials: number;
  treeTrunkBases: number;
  treeRoots: number;
  treeBranches: number;
  treeCanopies: number;
  treeLeafCards: number;
  treeLeafSprigs: number;
  treeLeafVolumes: number;
  treeLeafVolumeVertices: number;
  treeLeafShells: number;
  treeStyleVariants: number;
  treeFoliageAlphaTestMaterials: number;
  treeFoliageAlphaBlendMaterials: number;
  treeLeafHighlights: number;
  extraFoliageShells: number;
  grassCards: number;
  bushCards: number;
  groundDetailClumps: number;
  wildflowerCards: number;
  pebbleMeshes: number;
  treeBaseClutter: number;
  shadowGenerators: number;
  shadowCasters: number;
  shadowReceivers: number;
  skyLightIntensity: number;
  sunLightIntensity: number;
  houseBodies: number;
  houseRoofs: number;
  houseDoors: number;
  houseWindows: number;
  houseWindowFrames: number;
  houseChimneys: number;
  houseRoofOverhangs: number;
  houseRoofTiles: number;
  houseFoundationStones: number;
  houseWallWeathering: number;
  houseRoofBattens: number;
  houseRoofMoss: number;
  houseDoorHardware: number;
  stoneClusterPieces: number;
  treeBarkRidges: number;
  treeLeafDepthCards: number;
  pathTiles: number;
  fenceSegments: number;
  houseWallTextureMaterials: number;
  houseRoofTextureMaterials: number;
  terrainGrassDiffuse: {
    r: number;
    g: number;
    b: number;
  } | null;
  terrainRoadDiffuse: {
    r: number;
    g: number;
    b: number;
  } | null;
  pathDirtDiffuse: {
    r: number;
    g: number;
    b: number;
  } | null;
  houseObstacles: Array<{
    name: string;
    topHeight: number;
  }>;
  houseRoadClearances: Array<{
    name: string;
    clearance: number;
  }>;
  mapBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
};

async function sampleCanvasScreenshot(page: Page, canvas: Locator): Promise<{
  width: number;
  height: number;
  pixels: number[][];
}> {
  const screenshot = await canvas.screenshot();
  return page.evaluate(async (pngBase64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${pngBase64}`;
    await image.decode();

    const surface = document.createElement("canvas");
    surface.width = image.width;
    surface.height = image.height;

    const context = surface.getContext("2d");
    if (!context) throw new Error("Missing 2D context");

    context.drawImage(image, 0, 0);
    const points: Array<[number, number]> = [
      [Math.floor(surface.width * 0.5), Math.floor(surface.height * 0.55)],
      [Math.floor(surface.width * 0.38), Math.floor(surface.height * 0.72)],
      [Math.floor(surface.width * 0.62), Math.floor(surface.height * 0.72)],
      [Math.floor(surface.width * 0.5), Math.floor(surface.height * 0.35)],
    ];

    return {
      width: surface.width,
      height: surface.height,
      pixels: points.map(([x, y]) => Array.from(context.getImageData(x, y, 1, 1).data)),
    };
  }, screenshot.toString("base64"));
}

async function readPlayerSnapshot(page: Page): Promise<PlayerSnapshot> {
  return page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          player?: {
            position: { x: number; y: number; z: number };
            footHeight: number;
            isGrounded: boolean;
            surfaceHeight: number;
          };
        };
      };
    }).__KODU_APP__;
    const player = app?.gameScene?.player;
    if (!player) throw new Error("Missing player controller");
    return {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      footHeight: player.footHeight,
      grounded: player.isGrounded,
      surfaceHeight: player.surfaceHeight,
    };
  });
}

async function readProjectileCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          projectiles?: { projectiles: unknown[] };
        };
      };
    }).__KODU_APP__;
    const projectiles = app?.gameScene?.projectiles;
    if (!projectiles) throw new Error("Missing projectile system");
    return projectiles.projectiles.length;
  });
}

async function readVillageSnapshot(page: Page): Promise<VillageSnapshot> {
  await page.waitForFunction(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          map?: unknown;
          scene?: unknown;
        };
      };
    }).__KODU_APP__;
    return Boolean(app?.gameScene?.scene && app.gameScene.map);
  });
  return page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          scene?: {
            lights?: Array<{
              name?: string;
              intensity?: number;
              getShadowGenerator?: () => {
                getShadowMap?: () => {
                  renderList?: unknown[];
                } | null;
              } | null;
            }>;
            materials: Array<{
              name: string;
              transparencyMode?: number | null;
              useAlphaFromDiffuseTexture?: boolean;
              needAlphaTesting?: () => boolean;
              bumpTexture?: unknown;
              diffuseTexture?: {
                name?: string;
                url?: string;
              } | null;
              diffuseColor?: {
                r: number;
                g: number;
                b: number;
              };
            }>;
            meshes: Array<{
              name: string;
              getBoundingInfo(): {
                boundingBox: {
                  minimumWorld: { x: number; z: number };
                  maximumWorld: { x: number; z: number };
                };
              };
              getTotalVertices(): number;
              receiveShadows?: boolean;
            }>;
          };
          map?: {
            bounds: {
              minX: number;
              maxX: number;
              minZ: number;
              maxZ: number;
            };
            obstacles: Array<{
              name: string;
              center: { x: number; y: number; z: number };
              halfExtents: { x: number; y: number; z: number };
            }>;
          };
        };
      };
    }).__KODU_APP__;
    const scene = app?.gameScene?.scene;
    const map = app?.gameScene?.map;
    if (!scene || !map) throw new Error("Missing game scene or map");
    const names = scene.meshes.map((mesh) => mesh.name);
    const materialNames = scene.materials.map((material) => material.name);
    const terrainGrassMaterial = scene.materials.find((material) => material.name === "mat-terrain-grass");
    const terrainRoadMaterial = scene.materials.find((material) => material.name === "mat-terrain-road");
    const terrainSandMaterial = scene.materials.find((material) => material.name === "mat-terrain-sand");
    const pathDirtMaterial = scene.materials.find((material) => material.name === "mat-path-dirt");
    const textureReliefMaterials = scene.materials.filter((material) => (
      Boolean(material.bumpTexture)
      && (
        material.name.startsWith("mat-terrain-")
        || material.name.startsWith("mat-house-")
        || material.name.startsWith("mat-tree-")
        || material.name.startsWith("mat-fence-")
        || material.name.startsWith("mat-stone")
        || material.name.startsWith("mat-pebble")
      )
    ));
    const conceptAtlasTextureMaterials = scene.materials.filter((material) => {
      const texture = material.diffuseTexture;
      return Boolean(
        texture?.name?.includes("concept-material-atlas")
        || texture?.url?.includes("concept-material-atlas"),
      );
    });
    const coreAtlasMaterialNames = new Set([
      "mat-terrain-grass",
      "mat-terrain-road",
      "mat-terrain-sand",
      "mat-stone",
      "mat-house-wall-cream",
      "mat-house-wall-mint",
      "mat-house-wall-clay",
      "mat-house-roof-red",
      "mat-house-roof-teal",
      "mat-house-roof-violet",
      "mat-house-trim",
      "mat-house-door",
      "mat-house-window",
      "mat-house-chimney",
      "mat-house-foundation-stone",
      "mat-fence-wood",
      "mat-tree-bark",
      "mat-tree-bark-ridge",
    ]);
    const conceptAtlasCoreMaterials = conceptAtlasTextureMaterials.filter((material) => (
      coreAtlasMaterialNames.has(material.name)
    ));
    const conceptTileCoreMaterials = scene.materials.filter((material) => {
      const texture = material.diffuseTexture;
      const source = `${texture?.name ?? ""} ${texture?.url ?? ""}`;
      return coreAtlasMaterialNames.has(material.name) && source.includes("/assets/textures/concept/");
    });
    const shadowMaps = (scene.lights ?? [])
      .map((light) => light.getShadowGenerator?.()?.getShadowMap?.())
      .filter((shadowMap): shadowMap is { renderList?: unknown[] } => Boolean(shadowMap));
    const shadowCasters = shadowMaps.reduce((sum, shadowMap) => sum + (shadowMap.renderList?.length ?? 0), 0);
    const skyLightIntensity = scene.lights?.find((light) => light.name === "sky-light")?.intensity ?? 0;
    const sunLightIntensity = scene.lights?.find((light) => light.name === "sun-light")?.intensity ?? 0;
    const mainRoad = scene.meshes.find((mesh) => mesh.name === "terrain-road-main");
    const mainRoadBox = mainRoad?.getBoundingInfo().boundingBox;
    const blendedTerrainMaterials = scene.materials.filter((material) => (
      material.name === "mat-terrain-sand"
      || material.name === "mat-terrain-road"
      || material.name === "mat-path-dirt"
    ) && material.useAlphaFromDiffuseTexture);
    const vegetationAlphaMaterials = scene.materials.filter((material) => (
      material.name === "mat-tree-leaves-card"
      || material.name === "mat-bush-card"
      || material.name === "mat-grass-card"
    ) && material.useAlphaFromDiffuseTexture);
    const treeLeafVolumeMeshes = scene.meshes.filter((mesh) => (
      mesh.name.startsWith("tree-") && mesh.name.includes("-leaf-volume-")
    ));
    const treeStyleIds = new Set(
      treeLeafVolumeMeshes
        .map((mesh) => /-style-([a-z-]+)-leaf-volume-/.exec(mesh.name)?.[1])
        .filter((style): style is string => Boolean(style)),
    );
    const treeFoliageMaterials = scene.materials.filter((material) => (
      material.name === "mat-tree-leaf-mask"
      || material.name === "mat-tree-leaf-shell"
    ));
    const treeFoliageAlphaTestMaterials = treeFoliageMaterials.filter((material) => (
      material.transparencyMode === 1 || Boolean(material.needAlphaTesting?.())
    ));
    const treeFoliageAlphaBlendMaterials = treeFoliageMaterials.filter((material) => (
      material.transparencyMode === 2
    ));
    const repeatedAlphaMaterials = blendedTerrainMaterials.filter((material) => {
      const texture = (material as unknown as {
        diffuseTexture?: {
          uScale?: number;
          vScale?: number;
        };
      }).diffuseTexture;
      return (texture?.uScale ?? 1) > 1 || (texture?.vScale ?? 1) > 1;
    });
    const terrainPatchVertexCounts = scene.meshes
      .filter((mesh) => mesh.name.startsWith("terrain-patch-"))
      .map((mesh) => mesh.getTotalVertices());
    const terrainSandPatchVertexCounts = scene.meshes
      .filter((mesh) => mesh.name.startsWith("terrain-patch-sand-"))
      .map((mesh) => mesh.getTotalVertices());
    const houseObstacles = map.obstacles
      .filter((obstacle) => obstacle.name.startsWith("house-") && obstacle.name.endsWith("-body"))
      .map((obstacle) => ({
        name: obstacle.name,
        topHeight: obstacle.center.y + obstacle.halfExtents.y,
      }));
    const mainRoadRoute = [
      { x: -17.4, z: -11.4, width: 1.28 },
      { x: -11.2, z: -6.6, width: 1.42 },
      { x: -5.6, z: -2.8, width: 1.18 },
      { x: -0.8, z: 0.35, width: 1.52 },
      { x: 4.8, z: 2.0, width: 1.34 },
      { x: 10.2, z: 5.8, width: 1.18 },
      { x: 17.4, z: 10.6, width: 1.42 },
    ];
    const distanceToSegment = (x: number, z: number, ax: number, az: number, bx: number, bz: number): number => {
      const vx = bx - ax;
      const vz = bz - az;
      const wx = x - ax;
      const wz = z - az;
      const lengthSq = vx * vx + vz * vz || 1;
      const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / lengthSq));
      const px = ax + vx * t;
      const pz = az + vz * t;
      return Math.hypot(x - px, z - pz);
    };
    const houseRoadClearances = map.obstacles
      .filter((obstacle) => obstacle.name.startsWith("house-") && obstacle.name.endsWith("-body"))
      .map((obstacle) => {
        let clearance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < mainRoadRoute.length - 1; index += 1) {
          const a = mainRoadRoute[index];
          const b = mainRoadRoute[index + 1];
          const segmentDistance = distanceToSegment(obstacle.center.x, obstacle.center.z, a.x, a.z, b.x, b.z);
          const roadRadius = Math.max(a.width, b.width) * 0.5;
          const houseRadius = Math.hypot(obstacle.halfExtents.x, obstacle.halfExtents.z);
          clearance = Math.min(clearance, segmentDistance - roadRadius - houseRadius);
        }
        return { name: obstacle.name, clearance };
      });
    const colorSnapshot = (material: { diffuseColor?: { r: number; g: number; b: number } } | undefined) => (
      material?.diffuseColor
        ? {
            r: material.diffuseColor.r,
            g: material.diffuseColor.g,
            b: material.diffuseColor.b,
          }
        : null
    );
    return {
      houseBodies: names.filter((name) => name.startsWith("house-") && name.endsWith("-body")).length,
      houseRoofs: names.filter((name) => name.startsWith("house-") && name.endsWith("-roof")).length,
      houseDoors: names.filter((name) => name.startsWith("house-") && name.endsWith("-door")).length,
      houseWindows: names.filter((name) => name.startsWith("house-") && name.includes("-window-") && !name.includes("-window-frame-")).length,
      houseWindowFrames: names.filter((name) => name.startsWith("house-") && name.includes("-window-frame-")).length,
      houseChimneys: names.filter((name) => name.startsWith("house-") && name.endsWith("-chimney")).length,
      houseRoofOverhangs: names.filter((name) => name.startsWith("house-") && name.includes("-roof-overhang-")).length,
      houseRoofTiles: names.filter((name) => name.startsWith("house-") && name.includes("-roof-tile-")).length,
      houseFoundationStones: names.filter((name) => name.startsWith("house-foundation-stone-")).length,
      houseWallWeathering: names.filter((name) => name.startsWith("house-wall-weathering-")).length,
      houseRoofBattens: names.filter((name) => name.startsWith("house-roof-batten-")).length,
      houseRoofMoss: names.filter((name) => name.startsWith("house-roof-moss-")).length,
      houseDoorHardware: names.filter((name) => name.startsWith("house-door-hardware-")).length,
      stoneClusterPieces: names.filter((name) => name.startsWith("stone-cluster-piece-")).length,
      treeBarkRidges: names.filter((name) => name.startsWith("tree-bark-ridge-")).length,
      treeLeafDepthCards: names.filter((name) => name.startsWith("tree-leaf-depth-card-")).length,
      terrainGrounds: names.filter((name) => name === "terrain-heightmap-ground").length,
      terrainSandPatches: names.filter((name) => name.startsWith("terrain-patch-sand-")).length,
      terrainMeadowPatches: names.filter((name) => name.startsWith("terrain-patch-meadow-")).length,
      terrainRoadPatches: names.filter((name) => name.startsWith("terrain-patch-road-")).length,
      terrainMainRoads: names.filter((name) => name === "terrain-road-main").length,
      terrainMainRoadVertices: mainRoad?.getTotalVertices() ?? 0,
      terrainMainRoadBounds: mainRoadBox ? {
        minX: mainRoadBox.minimumWorld.x,
        maxX: mainRoadBox.maximumWorld.x,
        minZ: mainRoadBox.minimumWorld.z,
        maxZ: mainRoadBox.maximumWorld.z,
      } : null,
      terrainRoadSpurs: names.filter((name) => name.startsWith("terrain-road-spur-")).length,
      terrainRectangularLayers: names.filter((name) => (
        name.startsWith("terrain-sand-")
        || (name.startsWith("terrain-road-") && name !== "terrain-road-main" && !name.startsWith("terrain-road-spur-"))
      )).length,
      terrainPatchMinVertices: terrainPatchVertexCounts.length ? Math.min(...terrainPatchVertexCounts) : 0,
      terrainSandPatchMinVertices: terrainSandPatchVertexCounts.length ? Math.min(...terrainSandPatchVertexCounts) : 0,
      terrainSandTextureSource: terrainSandMaterial
        ? `${terrainSandMaterial.diffuseTexture?.name ?? ""} ${terrainSandMaterial.diffuseTexture?.url ?? ""}`
        : null,
      terrainTextureMaterials: materialNames.filter((name) => name.startsWith("mat-terrain-")).length,
      terrainAlphaBlendMaterials: blendedTerrainMaterials.length,
      terrainRepeatedAlphaMaterials: repeatedAlphaMaterials.length,
      textureReliefMaterials: textureReliefMaterials.length,
      conceptAtlasTextureMaterials: conceptAtlasTextureMaterials.length,
      conceptAtlasCoreMaterials: conceptAtlasCoreMaterials.length,
      conceptTileCoreMaterials: conceptTileCoreMaterials.length,
      vegetationAlphaMaterials: vegetationAlphaMaterials.length,
      treeTrunkBases: names.filter((name) => name.startsWith("tree-") && name.endsWith("-trunk-base")).length,
      treeRoots: names.filter((name) => name.startsWith("tree-") && name.includes("-root-")).length,
      treeBranches: names.filter((name) => name.startsWith("tree-") && name.includes("-branch-")).length,
      treeCanopies: names.filter((name) => name.startsWith("tree-") && name.includes("-canopy-")).length,
      treeLeafCards: names.filter((name) => name.startsWith("tree-") && name.includes("-leaf-card-")).length,
      treeLeafSprigs: names.filter((name) => name.startsWith("tree-leaf-sprig-")).length,
      treeLeafVolumes: treeLeafVolumeMeshes.length,
      treeLeafVolumeVertices: treeLeafVolumeMeshes.reduce((sum, mesh) => sum + mesh.getTotalVertices(), 0),
      treeLeafShells: names.filter((name) => name.startsWith("tree-") && name.includes("-leaf-shell-")).length,
      treeStyleVariants: treeStyleIds.size,
      treeFoliageAlphaTestMaterials: treeFoliageAlphaTestMaterials.length,
      treeFoliageAlphaBlendMaterials: treeFoliageAlphaBlendMaterials.length,
      treeLeafHighlights: names.filter((name) => name.startsWith("tree-") && name.includes("-leaf-highlight-")).length,
      extraFoliageShells: names.filter((name) => name.startsWith("tree-") && name.includes("-extra-foliage-shell-")).length,
      grassCards: names.filter((name) => name.startsWith("grass-card-")).length,
      bushCards: names.filter((name) => name.startsWith("bush-card-")).length,
      groundDetailClumps: names.filter((name) => name.startsWith("ground-detail-clump-")).length,
      wildflowerCards: names.filter((name) => name.startsWith("wildflower-card-")).length,
      pebbleMeshes: names.filter((name) => name.startsWith("pebble-detail-")).length,
      treeBaseClutter: names.filter((name) => name.startsWith("tree-base-clutter-")).length,
      shadowGenerators: shadowMaps.length,
      shadowCasters,
      shadowReceivers: scene.meshes.filter((mesh) => mesh.receiveShadows).length,
      skyLightIntensity,
      sunLightIntensity,
      pathTiles: names.filter((name) => name.startsWith("village-path-")).length,
      fenceSegments: names.filter((name) => name.startsWith("fence-")).length,
      houseWallTextureMaterials: materialNames.filter((name) => name.startsWith("mat-house-wall-")).length,
      houseRoofTextureMaterials: materialNames.filter((name) => name.startsWith("mat-house-roof-")).length,
      terrainGrassDiffuse: colorSnapshot(terrainGrassMaterial),
      terrainRoadDiffuse: colorSnapshot(terrainRoadMaterial),
      pathDirtDiffuse: colorSnapshot(pathDirtMaterial),
      houseObstacles,
      houseRoadClearances,
      mapBounds: map.bounds,
    };
  });
}

async function placePlayer(page: Page, x: number, z: number): Promise<void> {
  await page.evaluate(({ x: nextX, z: nextZ }) => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          player?: {
            position: { x: number; z: number };
            landOnSurface(surfaceHeight: number): void;
            clampToBounds(): void;
          };
        };
      };
    }).__KODU_APP__;
    const player = app?.gameScene?.player;
    if (!player) throw new Error("Missing player controller");
    player.position.x = nextX;
    player.position.z = nextZ;
    player.landOnSurface(0);
    player.clampToBounds();
  }, { x, z });
}

async function dropPlayerFromHeight(page: Page, x: number, centerY: number, z: number): Promise<void> {
  await page.evaluate(({ x: nextX, centerY: nextY, z: nextZ }) => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          player?: {
            position: { x: number; y: number; z: number };
            landOnSurface(surfaceHeight: number): void;
            startFalling(): void;
            clampToBounds(): void;
          };
        };
      };
    }).__KODU_APP__;
    const player = app?.gameScene?.player;
    if (!player) throw new Error("Missing player controller");
    player.landOnSurface(0);
    player.position.x = nextX;
    player.position.y = nextY;
    player.position.z = nextZ;
    player.startFalling();
    player.clampToBounds();
  }, { x, centerY, z });
}

async function addTestObstacle(
  page: Page,
  obstacle: {
    name: string;
    center: { x: number; y: number; z: number };
    halfExtents: { x: number; y: number; z: number };
  },
): Promise<void> {
  await page.evaluate((nextObstacle) => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          map?: {
            obstacles: Array<{
              name: string;
              center: { x: number; y: number; z: number };
              halfExtents: { x: number; y: number; z: number };
              mesh?: unknown;
            }>;
          };
        };
      };
    }).__KODU_APP__;
    const map = app?.gameScene?.map;
    if (!map) throw new Error("Missing diorama map");
    map.obstacles.push({ ...nextObstacle, mesh: undefined });
  }, obstacle);
}

async function readCameraSnapshot(page: Page): Promise<CameraSnapshot> {
  return page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          scene?: {
            activeCamera?: {
              getTarget(): { y: number };
              orthoLeft: number;
              orthoRight: number;
              position: { y: number };
            };
            getEngine(): { getRenderWidth(): number; getRenderHeight(): number };
          };
        };
      };
    }).__KODU_APP__;
    const scene = app?.gameScene?.scene;
    const camera = scene?.activeCamera;
    if (!scene || !camera) throw new Error("Missing active camera");

    return {
      renderWidth: scene.getEngine().getRenderWidth(),
      renderHeight: scene.getEngine().getRenderHeight(),
      orthoLeft: Number(camera.orthoLeft),
      orthoRight: Number(camera.orthoRight),
      positionY: camera.position.y,
      targetY: camera.getTarget().y,
    };
  });
}

async function waitForCameraReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          scene?: {
            activeCamera?: {
              getTarget(): { y: number };
              position: { y: number };
            };
          };
        };
      };
    }).__KODU_APP__;
    const camera = app?.gameScene?.scene?.activeCamera;
    return Boolean(camera && Math.abs(camera.position.y - (camera.getTarget().y + 8.4)) < 0.03);
  });
}

test("terrain image assets are served", async ({ page }) => {
  await page.goto("/");
  const assets = [
    "/assets/terrain/heightmap-valley.png",
    "/assets/terrain/grass.png",
    "/assets/terrain/meadow.png",
    "/assets/terrain/sand.png",
    "/assets/terrain/road.png",
    "/assets/vegetation/tree-leaves.png",
    "/assets/vegetation/tree-leaf-shell.png",
    "/assets/vegetation/tree-bark.png",
    "/assets/vegetation/bush.png",
    "/assets/vegetation/grass-card.png",
    "/assets/textures/stone.png",
    "/assets/textures/weathered-wood.png",
    "/assets/textures/roof-tiles-red.png",
    "/assets/textures/roof-tiles-teal.png",
    "/assets/textures/roof-tiles-violet.png",
    "/assets/textures/plaster-warm.png",
    "/assets/textures/plaster-sage.png",
    "/assets/textures/plaster-clay.png",
    "/assets/textures/trim-aged.png",
    "/assets/textures/door-wood.png",
    "/assets/textures/window-glass.png",
    "/assets/textures/concept-material-atlas.png",
    "/assets/textures/concept/grass.png",
    "/assets/textures/concept/dirt-road.png",
    "/assets/textures/concept/plaster-warm.png",
    "/assets/textures/concept/weathered-wood.png",
    "/assets/textures/concept/roof-red.png",
    "/assets/textures/concept/stone-masonry.png",
    "/assets/textures/concept/bark.png",
    "/assets/textures/concept/window-glass.png",
    "/assets/textures/concept/plaster-clay.png",
    "/assets/textures/concept/roof-teal.png",
    "/assets/textures/concept/pebbles.png",
    "/assets/textures/concept/trim-wood.png",
    "/assets/textures/concept/dark-dirt.png",
  ];
  for (const asset of assets) {
    const response = await page.request.get(asset);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
    expect((await response.body()).byteLength).toBeGreaterThan(500);
  }

  const dimensions = await page.evaluate(async (imageAssets) => Promise.all(imageAssets.map((asset) => new Promise<{
    asset: string;
    width: number;
    height: number;
  }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ asset, width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error(`Could not load ${asset}`));
    image.src = asset;
  }))), assets);

  for (const image of dimensions.filter(({ asset }) => asset !== "/assets/terrain/heightmap-valley.png")) {
    expect(image.width, `${image.asset} width`).toBeGreaterThanOrEqual(256);
    expect(image.height, `${image.asset} height`).toBeGreaterThanOrEqual(256);
  }
});

test("renders the game and fires a projectile", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  const canvas = page.locator("#game-canvas");
  await expect(canvas).toBeVisible();
  await expect(page.locator(".hud-title")).toHaveText("Kodu");
  await expect(page.locator(".hud-help")).toHaveText("Move WASD / Arrows · Jump Space · Fire Click · Inspector I");
  await expect(page.locator('[data-hud="state"]')).toHaveText("Ready");

  const canvasSample = await sampleCanvasScreenshot(page, canvas);

  expect(canvasSample.width).toBeGreaterThan(0);
  expect(canvasSample.height).toBeGreaterThan(0);
  expect(canvasSample.pixels.some(([r, g, b, a]) => r !== 148 || g !== 209 || b !== 235 || a !== 255)).toBe(true);

  await page.keyboard.down("KeyD");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyD");
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error("Missing canvas bounds");
  await page.mouse.click(canvasBox.x + canvasBox.width * 0.18, canvasBox.y + canvasBox.height * 0.82);

  await expect(page.locator('[data-hud="projectiles"]')).not.toHaveText("0");
  await page.waitForTimeout(1800);
  await expect(page.locator('[data-hud="projectiles"]')).toHaveText("0");
  expect(await readProjectileCount(page)).toBe(0);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("space jumps without firing a projectile", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();
  await waitForCameraReady(page);

  const before = await readPlayerSnapshot(page);
  expect(await readProjectileCount(page)).toBe(0);

  await page.keyboard.down("Space");
  let after: { grounded: boolean; y: number } | undefined;
  try {
    const jumpSample = await page.waitForFunction((startY) => {
      const app = (globalThis as typeof globalThis & {
        __KODU_APP__?: {
          gameScene?: {
            player?: {
              isGrounded: boolean;
              position: { y: number };
            };
          };
        };
      }).__KODU_APP__;
      const player = app?.gameScene?.player;
      if (!player || player.isGrounded || player.position.y <= startY + 0.08) return false;
      return {
        grounded: player.isGrounded,
        y: player.position.y,
      };
    }, before.y);
    after = await jumpSample.jsonValue() as { grounded: boolean; y: number };
  } finally {
    await page.keyboard.up("Space");
  }

  if (!after) throw new Error("Missing jump sample");
  expect(after.y).toBeGreaterThan(before.y + 0.08);
  expect(after.grounded).toBe(false);
  expect(await readProjectileCount(page)).toBe(0);

  await page.waitForTimeout(900);
  const landed = await readPlayerSnapshot(page);
  expect(landed.grounded).toBe(true);
  expect(landed.footHeight).toBeCloseTo(0, 1);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("camera ignores player jump height", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();
  await waitForCameraReady(page);

  const before = await readCameraSnapshot(page);
  const playerBefore = await readPlayerSnapshot(page);

  await page.keyboard.down("Space");

  let during: CameraSnapshot & { playerY: number } | undefined;
  try {
    const jumpSample = await page.waitForFunction((startY) => {
      const app = (globalThis as typeof globalThis & {
        __KODU_APP__?: {
          gameScene?: {
            player?: {
              position: { y: number };
            };
            scene?: {
              activeCamera?: {
                getTarget(): { y: number };
                orthoLeft: number;
                orthoRight: number;
                position: { y: number };
              };
              getEngine(): { getRenderWidth(): number; getRenderHeight(): number };
            };
          };
        };
      }).__KODU_APP__;
      const gameScene = app?.gameScene;
      const player = gameScene?.player;
      const scene = gameScene?.scene;
      const camera = scene?.activeCamera;
      if (!player || !scene || !camera || player.position.y <= startY + 0.35) return false;
      return {
        renderWidth: scene.getEngine().getRenderWidth(),
        renderHeight: scene.getEngine().getRenderHeight(),
        orthoLeft: Number(camera.orthoLeft),
        orthoRight: Number(camera.orthoRight),
        positionY: camera.position.y,
        targetY: camera.getTarget().y,
        playerY: player.position.y,
      };
    }, playerBefore.y);
    during = await jumpSample.jsonValue() as CameraSnapshot & { playerY: number };
  } finally {
    await page.keyboard.up("Space");
  }

  if (!during) throw new Error("Missing camera jump sample");
  expect(during.playerY).toBeGreaterThan(playerBefore.y + 0.35);
  expect(during.targetY).toBeCloseTo(before.targetY, 2);
  expect(during.positionY).toBeCloseTo(before.positionY, 1);
});

test("renders village houses as tall blocking obstacles", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const village = await readVillageSnapshot(page);
  expect(village.terrainGrounds).toBe(1);
  expect(village.terrainSandPatches).toBeGreaterThanOrEqual(2);
  expect(village.terrainMeadowPatches).toBeGreaterThanOrEqual(4);
  expect(village.terrainRoadPatches).toBe(0);
  expect(village.terrainMainRoads).toBe(1);
  expect(village.terrainMainRoadVertices).toBeGreaterThanOrEqual(80);
  expect(village.terrainMainRoadBounds).not.toBeNull();
  expect(village.terrainMainRoadBounds!.minX).toBeLessThanOrEqual(-15);
  expect(village.terrainMainRoadBounds!.maxX).toBeGreaterThanOrEqual(14);
  expect(village.terrainMainRoadBounds!.minZ).toBeLessThanOrEqual(-10);
  expect(village.terrainMainRoadBounds!.maxZ).toBeGreaterThanOrEqual(8);
  expect(village.terrainRoadSpurs).toBeGreaterThanOrEqual(3);
  expect(village.terrainRectangularLayers).toBe(0);
  expect(village.terrainPatchMinVertices).toBeGreaterThanOrEqual(9);
  expect(village.terrainSandPatchMinVertices).toBeGreaterThanOrEqual(42);
  expect(village.terrainSandTextureSource).toContain("/assets/terrain/sand.png");
  expect(village.terrainTextureMaterials).toBeGreaterThanOrEqual(3);
  expect(village.terrainAlphaBlendMaterials).toBeGreaterThanOrEqual(3);
  expect(village.terrainRepeatedAlphaMaterials).toBeGreaterThanOrEqual(2);
  expect(village.terrainGrassDiffuse).not.toBeNull();
  expect(village.terrainGrassDiffuse!.r).toBeGreaterThanOrEqual(1.2);
  expect(village.terrainGrassDiffuse!.g).toBeGreaterThanOrEqual(1.24);
  expect(village.terrainGrassDiffuse!.b).toBeGreaterThanOrEqual(0.96);
  expect(village.terrainRoadDiffuse).not.toBeNull();
  expect(village.terrainRoadDiffuse!.r).toBeGreaterThanOrEqual(1.08);
  expect(village.terrainRoadDiffuse!.g).toBeGreaterThanOrEqual(0.82);
  expect(village.terrainRoadDiffuse!.b).toBeLessThanOrEqual(0.72);
  expect(village.pathDirtDiffuse).not.toBeNull();
  expect(village.pathDirtDiffuse!.r).toBeGreaterThanOrEqual(1.05);
  expect(village.pathDirtDiffuse!.g).toBeGreaterThanOrEqual(0.78);
  expect(village.pathDirtDiffuse!.b).toBeLessThanOrEqual(0.7);
  expect(village.textureReliefMaterials).toBeGreaterThanOrEqual(9);
  expect(village.conceptAtlasTextureMaterials).toBeGreaterThanOrEqual(3);
  expect(village.conceptAtlasCoreMaterials).toBeLessThanOrEqual(3);
  expect(village.conceptTileCoreMaterials).toBeGreaterThanOrEqual(12);
  expect(village.vegetationAlphaMaterials).toBeGreaterThanOrEqual(3);
  expect(village.treeTrunkBases).toBeGreaterThanOrEqual(5);
  expect(village.treeRoots).toBeGreaterThanOrEqual(15);
  expect(village.treeBranches).toBeGreaterThanOrEqual(10);
  expect(village.treeCanopies).toBe(0);
  expect(village.treeLeafCards).toBe(0);
  expect(village.treeLeafSprigs).toBeGreaterThanOrEqual(190);
  expect(village.treeLeafVolumes).toBe(0);
  expect(village.treeLeafVolumeVertices).toBe(0);
  expect(village.treeLeafShells).toBe(0);
  expect(village.treeStyleVariants).toBe(0);
  expect(village.treeFoliageAlphaTestMaterials).toBeGreaterThanOrEqual(2);
  expect(village.treeFoliageAlphaBlendMaterials).toBe(0);
  expect(village.extraFoliageShells).toBe(0);
  expect(village.grassCards).toBeGreaterThanOrEqual(12);
  expect(village.bushCards).toBeGreaterThanOrEqual(8);
  expect(village.groundDetailClumps).toBeGreaterThanOrEqual(24);
  expect(village.groundDetailClumps).toBeLessThanOrEqual(34);
  expect(village.wildflowerCards).toBeGreaterThanOrEqual(12);
  expect(village.wildflowerCards).toBeLessThanOrEqual(18);
  expect(village.pebbleMeshes).toBeGreaterThanOrEqual(12);
  expect(village.pebbleMeshes).toBeLessThanOrEqual(18);
  expect(village.treeBaseClutter).toBeGreaterThanOrEqual(8);
  expect(village.shadowGenerators).toBeGreaterThanOrEqual(1);
  expect(village.shadowCasters).toBeGreaterThanOrEqual(20);
  expect(village.shadowReceivers).toBeGreaterThanOrEqual(8);
  expect(village.skyLightIntensity).toBeGreaterThanOrEqual(0.82);
  expect(village.sunLightIntensity).toBeGreaterThanOrEqual(1);
  expect(village.mapBounds.maxX - village.mapBounds.minX).toBeGreaterThanOrEqual(32);
  expect(village.mapBounds.maxZ - village.mapBounds.minZ).toBeGreaterThanOrEqual(24);
  expect(village.houseBodies).toBe(3);
  expect(village.houseRoofs).toBe(3);
  expect(village.houseDoors).toBe(3);
  expect(village.houseWindows).toBeGreaterThanOrEqual(6);
  expect(village.houseWindowFrames).toBeGreaterThanOrEqual(6);
  expect(village.houseChimneys).toBe(3);
  expect(village.houseRoofOverhangs).toBeGreaterThanOrEqual(6);
  expect(village.houseRoofTiles).toBeLessThanOrEqual(8);
  expect(village.houseFoundationStones).toBeLessThanOrEqual(12);
  expect(village.houseWallWeathering).toBe(0);
  expect(village.houseRoofBattens).toBeLessThanOrEqual(9);
  expect(village.houseRoofMoss).toBe(0);
  expect(village.houseDoorHardware).toBeLessThanOrEqual(6);
  expect(village.stoneClusterPieces).toBeGreaterThanOrEqual(10);
  expect(village.treeBarkRidges).toBeGreaterThanOrEqual(18);
  expect(village.treeLeafDepthCards).toBe(0);
  expect(village.houseWallTextureMaterials).toBeGreaterThanOrEqual(3);
  expect(village.houseRoofTextureMaterials).toBeGreaterThanOrEqual(3);
  expect(village.pathTiles).toBe(0);
  expect(village.fenceSegments).toBeGreaterThanOrEqual(4);
  expect(village.houseObstacles).toHaveLength(3);
  expect(village.houseRoadClearances).toHaveLength(3);
  for (const house of village.houseRoadClearances) {
    expect(house.clearance, `${house.name} should sit beside the main road`).toBeGreaterThan(0.28);
  }
  for (const obstacle of village.houseObstacles) {
    expect(obstacle.topHeight).toBeGreaterThan(1.8);
  }
});

test("player can jump onto a rock obstacle", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const rockWestTop = 0.63;
  const rockWestMinX = -3.8;
  const rockWestMaxX = -2.4;
  const playerRadius = 0.42;
  const after = await page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          collisions?: {
            resolvePlayerVerticalSupport(player: unknown, map: unknown): void;
          };
          map?: unknown;
          player?: {
            clampToBounds(): void;
            footHeight: number;
            isGrounded: boolean;
            landOnSurface(surfaceHeight: number): void;
            position: { x: number; y: number; z: number };
            startFalling(): void;
            surfaceHeight: number;
            update(deltaSeconds: number, input: unknown): void;
          };
        };
      };
    }).__KODU_APP__;
    const gameScene = app?.gameScene;
    const player = gameScene?.player;
    const collisions = gameScene?.collisions;
    const map = gameScene?.map;
    if (!player || !collisions || !map) throw new Error("Missing deterministic landing dependencies");

    player.landOnSurface(0);
    player.position.x = -3.1;
    player.position.y = 2.2;
    player.position.z = -1.4;
    player.startFalling();
    player.clampToBounds();

    const idleInput = {
      consumeFire: () => false,
      consumeJump: () => false,
      get moveX() { return 0; },
      get moveZ() { return 0; },
      getPointerAimDirection: () => undefined,
    };

    for (let step = 0; step < 180; step += 1) {
      player.update(1 / 60, idleInput);
      collisions.resolvePlayerVerticalSupport(player, map);
      player.clampToBounds();
      if (player.isGrounded && Math.abs(player.surfaceHeight - 0.63) < 0.05) break;
    }

    return {
      x: player.position.x,
      footHeight: player.footHeight,
      grounded: player.isGrounded,
      surfaceHeight: player.surfaceHeight,
    };
  });

  expect(after.grounded).toBe(true);
  expect(after.surfaceHeight).toBeCloseTo(rockWestTop, 1);
  expect(after.footHeight).toBeCloseTo(rockWestTop, 1);
  expect(after.x + playerRadius).toBeGreaterThan(rockWestMinX);
  expect(after.x - playerRadius).toBeLessThan(rockWestMaxX);
});

test("player cannot land on an obstacle above jump reach", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const unreachableTop = 2.0;
  await addTestObstacle(page, {
    name: "test-high-obstacle",
    center: { x: -3.1, y: 1.0, z: 2.8 },
    halfExtents: { x: 0.85, y: 1.0, z: 0.65 },
  });
  await dropPlayerFromHeight(page, -3.1, 3.1, 2.8);
  await page.waitForFunction(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          player?: {
            footHeight: number;
            isGrounded: boolean;
            surfaceHeight: number;
          };
        };
      };
    }).__KODU_APP__;
    const player = app?.gameScene?.player;
    return Boolean(player && player.isGrounded && Math.abs(player.surfaceHeight) < 0.05 && Math.abs(player.footHeight) < 0.05);
  });

  const after = await readPlayerSnapshot(page);
  expect(after.grounded).toBe(true);
  expect(after.surfaceHeight).not.toBeCloseTo(unreachableTop, 1);
  expect(after.footHeight).toBeCloseTo(0, 1);
});

test("airborne player cannot pass through high obstacles", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const obstacleCenterX = 1.1;
  const obstacleHalfX = 0.55;
  const playerRadius = 0.42;
  await addTestObstacle(page, {
    name: "test-airborne-high-obstacle",
    center: { x: obstacleCenterX, y: 0.95, z: 0 },
    halfExtents: { x: obstacleHalfX, y: 0.95, z: 0.65 },
  });

  const after = await page.evaluate(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          input?: unknown;
          player?: {
            footHeight: number;
            isGrounded: boolean;
            landOnSurface(surfaceHeight: number): void;
            position: { x: number; y: number; z: number };
          };
          update(deltaSeconds: number): void;
        };
      };
    }).__KODU_APP__;
    const gameScene = app?.gameScene;
    const player = gameScene?.player;
    if (!gameScene || !player) throw new Error("Missing game scene or player");

    player.landOnSurface(0);
    player.position.x = 0;
    player.position.z = 0;

    let jumpAvailable = true;
    gameScene.input = {
      consumeFire: () => false,
      consumeJump: () => {
        const shouldJump = jumpAvailable;
        jumpAvailable = false;
        return shouldJump;
      },
      get moveX() { return 1; },
      get moveZ() { return 0; },
      getPointerAimDirection: () => undefined,
    };

    for (let step = 0; step < 70; step += 1) {
      gameScene.update(1 / 60);
    }

    return {
      footHeight: player.footHeight,
      grounded: player.isGrounded,
      x: player.position.x,
    };
  });

  expect(after.footHeight).toBeLessThan(1.9);
  expect(after.x + playerRadius).toBeLessThanOrEqual(obstacleCenterX - obstacleHalfX + 0.03);
});

test("updates orthographic bounds when the viewport resizes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const initial = await readCameraSnapshot(page);
  expect(initial.renderWidth).toBeGreaterThan(0);
  expect(initial.renderHeight).toBeGreaterThan(0);

  await page.setViewportSize({ width: 800, height: 800 });
  await page.waitForFunction(() => {
    const app = (globalThis as typeof globalThis & { __KODU_APP__?: { gameScene?: { scene?: { getEngine(): { getRenderWidth(): number; getRenderHeight(): number } } } } }).__KODU_APP__;
    const engine = app?.gameScene?.scene?.getEngine();
    return engine?.getRenderWidth() === 800 && engine.getRenderHeight() === 800;
  });

  const resized = await readCameraSnapshot(page);
  const halfHeight = 5.2;
  expect(initial.orthoLeft).toBeCloseTo(-halfHeight * (initial.renderWidth / initial.renderHeight), 5);
  expect(initial.orthoRight).toBeCloseTo(halfHeight * (initial.renderWidth / initial.renderHeight), 5);
  expect(resized.orthoLeft).toBeCloseTo(-halfHeight * (resized.renderWidth / resized.renderHeight), 5);
  expect(resized.orthoRight).toBeCloseTo(halfHeight * (resized.renderWidth / resized.renderHeight), 5);
  expect(resized.orthoRight).not.toBeCloseTo(initial.orthoRight, 5);
});
