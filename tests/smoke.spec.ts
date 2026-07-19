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
  terrainMainRoadMaxTurnDegrees: number;
  terrainMainRoadCrossWidthSamples: number;
  terrainMainRoadMaxHeightGap: number;
  terrainMainRoadCrownHeight: number;
  terrainMainRoadMaxShoulderGap: number;
  terrainMainRoadInnerShoulderRise: number;
  terrainMainRoadMinNormalY: number;
  terrainMainRoadMaxUvEdgeDelta: number;
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
  roadReliefPebbles: number;
  roadReliefShoulderChunks: number;
  roadReliefVertices: number;
  roadReliefShadowReceivers: number;
  roadReliefShadowCasters: number;
  roadReliefCollisionEntries: number;
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
  atlasTreeCards: number;
  atlasTreeAlphaMaterials: number;
  pathTiles: number;
  fenceSegments: number;
  houseWallTextureMaterials: number;
  houseRoofTextureMaterials: number;
  terrainGrassDiffuse: {
    r: number;
    g: number;
    b: number;
  } | null;
  terrainGrassDiffuseTextureSource: string | null;
  terrainGrassBumpTextureSource: string | null;
  terrainGrassTextureScale: {
    u: number;
    v: number;
  } | null;
  terrainRoadDiffuse: {
    r: number;
    g: number;
    b: number;
  } | null;
  terrainRoadDisableLighting: boolean | null;
  terrainRoadEmissive: {
    r: number;
    g: number;
    b: number;
  } | null;
  terrainRoadEmissiveTextureSource: string | null;
  terrainRoadBumpTextureSource: string | null;
  terrainRoadBumpLevel: number | null;
  terrainRoadSpecular: { r: number; g: number; b: number } | null;
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

async function jumpAndAdvance(page: Page, frameCount: number): Promise<PlayerSnapshot & CameraSnapshot & { projectileCount: number }> {
  return page.evaluate((frames) => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          projectiles?: { projectiles: unknown[] };
          input?: {
            onKeyDown(event: KeyboardEvent): void;
            onKeyUp(event: KeyboardEvent): void;
          };
          player?: {
            footHeight: number;
            isGrounded: boolean;
            position: { x: number; y: number; z: number };
            surfaceHeight: number;
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
          update(deltaSeconds: number): void;
        };
      };
    }).__KODU_APP__;
    const gameScene = app?.gameScene;
    const input = gameScene?.input;
    const player = gameScene?.player;
    const scene = gameScene?.scene;
    const camera = scene?.activeCamera;
    const projectiles = gameScene?.projectiles;
    if (!gameScene || !input || !player || !scene || !camera || !projectiles) {
      throw new Error("Missing jump simulation dependencies");
    }
    input.onKeyDown(new KeyboardEvent("keydown", {
      code: "Space",
      key: " ",
      bubbles: true,
      cancelable: true,
    }));
    for (let frame = 0; frame < frames; frame += 1) {
      gameScene.update(1 / 60);
    }
    input.onKeyUp(new KeyboardEvent("keyup", {
      code: "Space",
      key: " ",
      bubbles: true,
      cancelable: true,
    }));
    return {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      footHeight: player.footHeight,
      grounded: player.isGrounded,
      surfaceHeight: player.surfaceHeight,
      renderWidth: scene.getEngine().getRenderWidth(),
      renderHeight: scene.getEngine().getRenderHeight(),
      orthoLeft: Number(camera.orthoLeft),
      orthoRight: Number(camera.orthoRight),
      positionY: camera.position.y,
      targetY: camera.getTarget().y,
      projectileCount: projectiles.projectiles.length,
    };
  }, frameCount);
}

async function advanceGameFrames(page: Page, frameCount: number): Promise<PlayerSnapshot> {
  return page.evaluate((frames) => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          player?: {
            footHeight: number;
            isGrounded: boolean;
            position: { x: number; y: number; z: number };
            surfaceHeight: number;
          };
          update(deltaSeconds: number): void;
        };
      };
    }).__KODU_APP__;
    const gameScene = app?.gameScene;
    const player = gameScene?.player;
    if (!gameScene || !player) throw new Error("Missing game scene or player");
    for (let frame = 0; frame < frames; frame += 1) {
      gameScene.update(1 / 60);
    }
    return {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      footHeight: player.footHeight,
      grounded: player.isGrounded,
      surfaceHeight: player.surfaceHeight,
    };
  }, frameCount);
}

async function readVillageSnapshot(page: Page): Promise<VillageSnapshot> {
  await page.waitForFunction(() => {
    const app = (globalThis as typeof globalThis & {
      __KODU_APP__?: {
        gameScene?: {
          map?: unknown;
          scene?: {
            meshes?: Array<{ name?: string }>;
          };
        };
      };
    }).__KODU_APP__;
    return Boolean(
      app?.gameScene?.scene
      && app.gameScene.map
      && app.gameScene.scene.meshes?.some((mesh) => mesh.name === "terrain-road-main"),
    );
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
                  renderList?: Array<{ name?: string }>;
                } | null;
              } | null;
            }>;
            materials: Array<{
              name: string;
              transparencyMode?: number | null;
              useAlphaFromDiffuseTexture?: boolean;
              needAlphaTesting?: () => boolean;
              bumpTexture?: {
                name?: string;
                url?: string;
                level?: number;
                uScale?: number;
                vScale?: number;
              } | null;
              diffuseTexture?: {
                name?: string;
                url?: string;
                uScale?: number;
                vScale?: number;
              } | null;
              emissiveTexture?: {
                name?: string;
                url?: string;
              } | null;
              diffuseColor?: {
                r: number;
                g: number;
                b: number;
              };
              emissiveColor?: {
                r: number;
                g: number;
                b: number;
              };
              specularColor?: {
                r: number;
                g: number;
                b: number;
              };
              disableLighting?: boolean;
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
              getVerticesData(kind: string): number[] | null;
              getHeightAtCoordinates?(x: number, z: number): number;
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
      .filter((shadowMap): shadowMap is { renderList?: Array<{ name?: string }> } => Boolean(shadowMap));
    const shadowCasters = shadowMaps.reduce((sum, shadowMap) => sum + (shadowMap.renderList?.length ?? 0), 0);
    const roadReliefShadowCasters = shadowMaps.reduce(
      (sum, shadowMap) => sum + (shadowMap.renderList?.filter((mesh) => mesh.name?.startsWith("road-relief-")).length ?? 0),
      0,
    );
    const skyLightIntensity = scene.lights?.find((light) => light.name === "sky-light")?.intensity ?? 0;
    const sunLightIntensity = scene.lights?.find((light) => light.name === "sun-light")?.intensity ?? 0;
    const mainRoad = scene.meshes.find((mesh) => mesh.name === "terrain-road-main");
    const terrainGround = scene.meshes.find((mesh) => mesh.name === "terrain-heightmap-ground");
    const mainRoadBox = mainRoad?.getBoundingInfo().boundingBox;
    const mainRoadPositions = mainRoad?.getVerticesData("position") ?? [];
    const mainRoadNormals = mainRoad?.getVerticesData("normal") ?? [];
    const mainRoadUvs = mainRoad?.getVerticesData("uv") ?? [];
    const mainRoadUs = Array.from({ length: mainRoadUvs.length / 2 }, (_, index) => mainRoadUvs[index * 2]);
    const mainRoadCrossWidthSamples = mainRoadUs.findIndex((u, index) => index > 0 && u <= mainRoadUs[index - 1]);
    const mainRoadRowSize = mainRoadCrossWidthSamples > 0 ? mainRoadCrossWidthSamples : mainRoadUs.length;
    const terrainMainRoadMinNormalY = mainRoadNormals.length > 0
      ? Math.min(...Array.from({ length: mainRoadNormals.length / 3 }, (_, index) => mainRoadNormals[index * 3 + 1]))
      : -1;
    const mainRoadCenters: Array<{ x: number; z: number }> = [];
    let mainRoadMaxHeightGap = 0;
    let terrainMainRoadCrownHeight = 0;
    let terrainMainRoadMaxShoulderGap = 0;
    let terrainMainRoadInnerShoulderRise = 0;
    let mainRoadMaxUvEdgeDelta = 0;
    for (let vertex = 0; vertex < mainRoadPositions.length / 3; vertex += 1) {
      const position = vertex * 3;
      const groundHeight = terrainGround?.getHeightAtCoordinates?.(
        mainRoadPositions[position],
        mainRoadPositions[position + 2],
      );
      if (groundHeight !== undefined) {
        mainRoadMaxHeightGap = Math.max(
          mainRoadMaxHeightGap,
          Math.abs(mainRoadPositions[position + 1] - groundHeight),
        );
      }
    }
    for (let row = 0; row + mainRoadRowSize <= mainRoadPositions.length / 3; row += mainRoadRowSize) {
      const offsets: number[] = [];
      for (let cross = 0; cross < mainRoadRowSize; cross += 1) {
        const vertex = row + cross;
        const position = vertex * 3;
        const groundHeight = terrainGround?.getHeightAtCoordinates?.(
          mainRoadPositions[position],
          mainRoadPositions[position + 2],
        );
        offsets.push(groundHeight === undefined ? 0 : mainRoadPositions[position + 1] - groundHeight);
      }
      const center = offsets[Math.floor(offsets.length / 2)];
      const shoulder = (offsets[0] + offsets[offsets.length - 1]) * 0.5;
      terrainMainRoadCrownHeight = Math.max(terrainMainRoadCrownHeight, center - shoulder);
      terrainMainRoadMaxShoulderGap = Math.max(
        terrainMainRoadMaxShoulderGap,
        Math.abs(offsets[0]),
        Math.abs(offsets[offsets.length - 1]),
      );
      const innerShoulder = (offsets[1] + offsets[offsets.length - 2]) * 0.5;
      terrainMainRoadInnerShoulderRise = Math.max(
        terrainMainRoadInnerShoulderRise,
        innerShoulder - shoulder,
      );
    }
    for (let vertex = 0; vertex < mainRoadPositions.length / 3; vertex += mainRoadRowSize) {
      const rightVertex = Math.min(vertex + mainRoadRowSize - 1, mainRoadPositions.length / 3 - 1);
      const leftPosition = vertex * 3;
      const rightPosition = rightVertex * 3;
      mainRoadCenters.push({
        x: (mainRoadPositions[leftPosition] + mainRoadPositions[rightPosition]) * 0.5,
        z: (mainRoadPositions[leftPosition + 2] + mainRoadPositions[rightPosition + 2]) * 0.5,
      });
      mainRoadMaxUvEdgeDelta = Math.max(
        mainRoadMaxUvEdgeDelta,
        Math.abs(mainRoadUvs[vertex * 2 + 1] - mainRoadUvs[rightVertex * 2 + 1]),
      );
    }
    let mainRoadMaxTurnDegrees = 0;
    for (let index = 1; index < mainRoadCenters.length - 1; index += 1) {
      const previous = mainRoadCenters[index - 1];
      const current = mainRoadCenters[index];
      const next = mainRoadCenters[index + 1];
      const incoming = { x: current.x - previous.x, z: current.z - previous.z };
      const outgoing = { x: next.x - current.x, z: next.z - current.z };
      const denominator = Math.hypot(incoming.x, incoming.z) * Math.hypot(outgoing.x, outgoing.z);
      if (denominator <= 0.000001) continue;
      const cosine = Math.max(-1, Math.min(1, (incoming.x * outgoing.x + incoming.z * outgoing.z) / denominator));
      mainRoadMaxTurnDegrees = Math.max(mainRoadMaxTurnDegrees, Math.acos(cosine) * 180 / Math.PI);
    }
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
    const atlasTreeAlphaMaterials = scene.materials.filter((material) => (
      material.name.startsWith("mat-atlas-tree-")
      && material.useAlphaFromDiffuseTexture
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
    const roadReliefMeshes = scene.meshes.filter((mesh) => mesh.name.startsWith("road-relief-"));
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
      atlasTreeCards: names.filter((name) => name.startsWith("atlas-tree-card-")).length,
      atlasTreeAlphaMaterials: atlasTreeAlphaMaterials.length,
      terrainGrounds: names.filter((name) => name === "terrain-heightmap-ground").length,
      terrainSandPatches: names.filter((name) => name.startsWith("terrain-patch-sand-")).length,
      terrainMeadowPatches: names.filter((name) => name.startsWith("terrain-patch-meadow-")).length,
      terrainRoadPatches: names.filter((name) => name.startsWith("terrain-patch-road-")).length,
      terrainMainRoads: names.filter((name) => name === "terrain-road-main").length,
      terrainMainRoadVertices: mainRoad?.getTotalVertices() ?? 0,
      terrainMainRoadMaxTurnDegrees: mainRoadMaxTurnDegrees,
      terrainMainRoadCrossWidthSamples: mainRoadCrossWidthSamples,
      terrainMainRoadMaxHeightGap: mainRoadMaxHeightGap,
      terrainMainRoadCrownHeight,
      terrainMainRoadMaxShoulderGap,
      terrainMainRoadInnerShoulderRise,
      terrainMainRoadMinNormalY,
      terrainMainRoadMaxUvEdgeDelta: mainRoadMaxUvEdgeDelta,
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
      roadReliefPebbles: names.filter((name) => name.startsWith("road-relief-pebble-")).length,
      roadReliefShoulderChunks: names.filter((name) => name.startsWith("road-relief-shoulder-")).length,
      roadReliefVertices: roadReliefMeshes.reduce((sum, mesh) => sum + mesh.getTotalVertices(), 0),
      roadReliefShadowReceivers: roadReliefMeshes.filter((mesh) => mesh.receiveShadows).length,
      roadReliefShadowCasters,
      roadReliefCollisionEntries: map.obstacles.filter((obstacle) => obstacle.name.startsWith("road-relief-")).length,
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
      terrainGrassDiffuseTextureSource: terrainGrassMaterial?.diffuseTexture
        ? terrainGrassMaterial.diffuseTexture.url ?? terrainGrassMaterial.diffuseTexture.name ?? null
        : null,
      terrainGrassBumpTextureSource: terrainGrassMaterial?.bumpTexture
        ? terrainGrassMaterial.bumpTexture.url ?? terrainGrassMaterial.bumpTexture.name ?? null
        : null,
      terrainGrassTextureScale: terrainGrassMaterial?.diffuseTexture
        ? {
            u: terrainGrassMaterial.diffuseTexture.uScale ?? 1,
            v: terrainGrassMaterial.diffuseTexture.vScale ?? 1,
          }
        : null,
      terrainRoadDiffuse: colorSnapshot(terrainRoadMaterial),
      terrainRoadDisableLighting: terrainRoadMaterial?.disableLighting ?? null,
      terrainRoadEmissive: terrainRoadMaterial?.emissiveColor
        ? colorSnapshot({ diffuseColor: terrainRoadMaterial.emissiveColor })
        : null,
      terrainRoadEmissiveTextureSource: terrainRoadMaterial?.emissiveTexture
        ? terrainRoadMaterial.emissiveTexture.url ?? terrainRoadMaterial.emissiveTexture.name ?? null
        : null,
      terrainRoadBumpTextureSource: terrainRoadMaterial?.bumpTexture
        ? terrainRoadMaterial.bumpTexture.url ?? terrainRoadMaterial.bumpTexture.name ?? null
        : null,
      terrainRoadBumpLevel: terrainRoadMaterial?.bumpTexture?.level ?? null,
      terrainRoadSpecular: terrainRoadMaterial?.specularColor
        ? colorSnapshot({ diffuseColor: terrainRoadMaterial.specularColor })
        : null,
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
  const seamlessGrassAsset = "/assets/terrain/atlas/grass/grass-seamless-blended.png";
  const atlasTerrainAssets = [
    "/assets/terrain/atlas/road/road-ribbon-seamless.png",
    "/assets/terrain/atlas/road/road-ribbon-normal.png",
    "/assets/terrain/atlas/grass/grass-flat.png",
    "/assets/terrain/atlas/grass/grass-flat-yellow.png",
    "/assets/terrain/atlas/grass/grass-flat-yellow-flowers.png",
    "/assets/terrain/atlas/grass/grass-flat-white-flowers.png",
    "/assets/terrain/atlas/grass/grass-cliff-block-wide.png",
    "/assets/terrain/atlas/grass/grass-cliff-block-small.png",
    "/assets/terrain/atlas/grass/grass-cliff-block-medium-a.png",
    "/assets/terrain/atlas/grass/grass-cliff-block-medium-b.png",
    "/assets/terrain/atlas/grass/grass-cliff-block-narrow-a.png",
    "/assets/terrain/atlas/grass/grass-cliff-block-narrow-b.png",
    "/assets/terrain/atlas/grass/grass-cliff-corner-large.png",
    "/assets/terrain/atlas/grass/grass-cliff-edge-narrow-a.png",
    "/assets/terrain/atlas/grass/grass-cliff-edge-medium-a.png",
    "/assets/terrain/atlas/grass/grass-cliff-corner-small-a.png",
    "/assets/terrain/atlas/grass/grass-cliff-corner-small-b.png",
    "/assets/terrain/atlas/grass/grass-cliff-edge-wide-a.png",
    "/assets/terrain/atlas/grass/grass-cliff-corner-wide-a.png",
    "/assets/terrain/atlas/grass/grass-cliff-edge-medium-b.png",
    "/assets/terrain/atlas/grass/grass-cliff-corner-wide-b.png",
    "/assets/terrain/atlas/grass/grass-cliff-edge-wide-b.png",
    "/assets/terrain/atlas/grass/grass-cliff-edge-narrow-b.png",
    "/assets/terrain/atlas/grass/grass-cliff-edge-medium-c.png",
    "/assets/terrain/atlas/grass/grass-cliff-block-medium-c.png",
    "/assets/terrain/atlas/grass/grass-dirt-patch-a.png",
    "/assets/terrain/atlas/grass/grass-dirt-patch-b.png",
    "/assets/terrain/atlas/grass/grass-flowers-red.png",
    "/assets/terrain/atlas/grass/grass-flowers-white-a.png",
    "/assets/terrain/atlas/grass/grass-flowers-white-b.png",
    "/assets/terrain/atlas/grass/grass-dirt-stones-a.png",
    "/assets/terrain/atlas/grass/grass-dirt-circle.png",
    "/assets/terrain/atlas/grass/grass-dirt-stones-b.png",
    "/assets/terrain/atlas/grass/grass-rocks-small.png",
    "/assets/terrain/atlas/grass/grass-rocks-large.png",
    "/assets/terrain/atlas/grass/grass-flowers-white-c.png",
    "/assets/terrain/atlas/grass/grass-flowers-yellow.png",
    "/assets/terrain/atlas/road/road-straight-vertical-wide.png",
    "/assets/terrain/atlas/road/road-square-small.png",
    "/assets/terrain/atlas/road/road-straight-horizontal-wide.png",
    "/assets/terrain/atlas/road/road-vertical-a.png",
    "/assets/terrain/atlas/road/road-vertical-b.png",
    "/assets/terrain/atlas/road/road-rectangle-wide.png",
    "/assets/terrain/atlas/road/road-vertical-narrow-a.png",
    "/assets/terrain/atlas/road/road-corner-east.png",
    "/assets/terrain/atlas/road/road-corner-west.png",
    "/assets/terrain/atlas/road/road-vertical-narrow-b.png",
    "/assets/terrain/atlas/road/road-end-round.png",
    "/assets/terrain/atlas/road/road-vertical-narrow-c.png",
    "/assets/terrain/atlas/road/road-t-junction-a.png",
    "/assets/terrain/atlas/road/road-t-junction-b.png",
    "/assets/terrain/atlas/road/road-t-junction-wide-a.png",
    "/assets/terrain/atlas/road/road-t-junction-c.png",
    "/assets/terrain/atlas/road/road-t-junction-wide-b.png",
    "/assets/terrain/atlas/road/road-clearing-round-a.png",
    "/assets/terrain/atlas/road/road-clearing-round-b.png",
    "/assets/terrain/atlas/road/road-rectangle-small.png",
    "/assets/terrain/atlas/road/road-corner-large.png",
    "/assets/terrain/atlas/water/water-river-vertical-tall.png",
    "/assets/terrain/atlas/water/water-river-straight-wide.png",
    "/assets/terrain/atlas/water/water-river-inlets.png",
    "/assets/terrain/atlas/water/water-river-corner-a.png",
    "/assets/terrain/atlas/water/water-river-corner-wide.png",
    "/assets/terrain/atlas/water/water-river-corner-small-a.png",
    "/assets/terrain/atlas/water/water-river-corner-b.png",
    "/assets/terrain/atlas/water/water-river-corner-small-b.png",
    "/assets/terrain/atlas/water/waterfall-pool-small.png",
    "/assets/terrain/atlas/water/water-pond-large.png",
    "/assets/terrain/atlas/water/water-river-junction-a.png",
    "/assets/terrain/atlas/water/water-river-junction-b.png",
    "/assets/terrain/atlas/water/water-river-u-bend-a.png",
    "/assets/terrain/atlas/water/water-river-u-bend-b.png",
    "/assets/terrain/atlas/water/water-river-t-waterfall.png",
    "/assets/terrain/atlas/water/water-pond-small.png",
    "/assets/terrain/atlas/water/waterfall-small.png",
    "/assets/terrain/atlas/water/water-river-straight-narrow.png",
    "/assets/terrain/atlas/water/water-shoreline-a.png",
    "/assets/terrain/atlas/water/water-shoreline-b.png",
    "/assets/terrain/atlas/water/water-shoreline-c.png",
    "/assets/terrain/atlas/water/water-shoreline-d.png",
    "/assets/terrain/atlas/water/water-shoreline-e.png",
    "/assets/terrain/atlas/water/water-bridge.png",
    "/assets/terrain/atlas/water/water-river-pool-wide.png",
    "/assets/terrain/atlas/water/waterfall-wide.png",
    "/assets/terrain/atlas/water/waterfall-narrow.png",
  ];
  const atlasPropAssets = [
    "/assets/vegetation/atlas/tree-round-small.png",
    "/assets/vegetation/atlas/tree-pine-small.png",
    "/assets/vegetation/atlas/tree-pine-tall.png",
    "/assets/vegetation/atlas/tree-canopy-small.png",
    "/assets/vegetation/atlas/tree-canopy-medium.png",
    "/assets/vegetation/atlas/tree-oak-large.png",
    "/assets/vegetation/atlas/tree-pine-large.png",
    "/assets/vegetation/atlas/tree-round-medium.png",
    "/assets/vegetation/atlas/tree-fruit.png",
    "/assets/vegetation/atlas/tree-yellow.png",
    "/assets/vegetation/atlas/wood-stump.png",
    "/assets/vegetation/atlas/wood-hollow-stump.png",
    "/assets/vegetation/atlas/wood-log.png",
    "/assets/vegetation/atlas/bush-green.png",
    "/assets/vegetation/atlas/bush-white-flowers.png",
    "/assets/vegetation/atlas/bush-red-flowers.png",
    "/assets/vegetation/atlas/plant-spiky.png",
    "/assets/vegetation/atlas/plant-leafy.png",
    "/assets/vegetation/atlas/flower-daisy-white.png",
    "/assets/vegetation/atlas/flower-yellow.png",
    "/assets/vegetation/atlas/flower-red.png",
    "/assets/vegetation/atlas/flower-pink.png",
    "/assets/vegetation/atlas/flower-lavender.png",
    "/assets/vegetation/atlas/flower-blue.png",
    "/assets/vegetation/atlas/flower-yellow-small.png",
    "/assets/vegetation/atlas/flower-clover-a.png",
    "/assets/vegetation/atlas/flower-clover-b.png",
    "/assets/vegetation/atlas/flower-clover-c.png",
    "/assets/vegetation/atlas/flower-lily-pad.png",
    "/assets/vegetation/atlas/plant-reeds.png",
    "/assets/vegetation/atlas/rock-cluster-large.png",
    "/assets/vegetation/atlas/rock-cluster-tall.png",
    "/assets/vegetation/atlas/rock-scatter.png",
    "/assets/vegetation/atlas/rock-small-a.png",
    "/assets/vegetation/atlas/rock-small-b.png",
    "/assets/vegetation/atlas/rock-moss-flat.png",
    "/assets/vegetation/atlas/rock-moss-low.png",
  ];
  const atlasAssets = [...atlasTerrainAssets, ...atlasPropAssets];
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
    seamlessGrassAsset,
    ...atlasAssets,
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

  for (const image of dimensions.filter(({ asset }) => !atlasAssets.includes(asset) && asset !== "/assets/terrain/heightmap-valley.png")) {
    expect(image.width, `${image.asset} width`).toBeGreaterThanOrEqual(256);
    expect(image.height, `${image.asset} height`).toBeGreaterThanOrEqual(256);
  }

  for (const image of dimensions.filter(({ asset }) => atlasAssets.includes(asset))) {
    expect(image.width, `${image.asset} width`).toBeGreaterThanOrEqual(16);
    expect(image.height, `${image.asset} height`).toBeGreaterThanOrEqual(16);
  }

  const seamlessGrassDimensions = dimensions.find(({ asset }) => asset === seamlessGrassAsset);
  expect(seamlessGrassDimensions).toEqual({
    asset: seamlessGrassAsset,
    width: 512,
    height: 512,
  });
  const roadAssetDimensions = new Map<string, [number, number]>([
    ["/assets/terrain/atlas/road/road-ribbon-seamless.png", [1024, 2048]],
    ["/assets/terrain/atlas/road/road-ribbon-normal.png", [1024, 2048]],
    ["/assets/terrain/atlas/road/road-straight-vertical-wide.png", [300, 388]],
    ["/assets/terrain/atlas/road/road-square-small.png", [260, 308]],
    ["/assets/terrain/atlas/road/road-straight-horizontal-wide.png", [476, 296]],
    ["/assets/terrain/atlas/road/road-vertical-a.png", [336, 344]],
    ["/assets/terrain/atlas/road/road-vertical-b.png", [368, 372]],
    ["/assets/terrain/atlas/road/road-rectangle-wide.png", [372, 300]],
    ["/assets/terrain/atlas/road/road-vertical-narrow-a.png", [300, 380]],
    ["/assets/terrain/atlas/road/road-corner-east.png", [420, 372]],
    ["/assets/terrain/atlas/road/road-corner-west.png", [516, 404]],
    ["/assets/terrain/atlas/road/road-vertical-narrow-b.png", [292, 392]],
    ["/assets/terrain/atlas/road/road-end-round.png", [336, 360]],
    ["/assets/terrain/atlas/road/road-vertical-narrow-c.png", [240, 376]],
    ["/assets/terrain/atlas/road/road-t-junction-a.png", [456, 360]],
    ["/assets/terrain/atlas/road/road-t-junction-b.png", [468, 360]],
    ["/assets/terrain/atlas/road/road-t-junction-wide-a.png", [596, 364]],
    ["/assets/terrain/atlas/road/road-t-junction-c.png", [500, 364]],
    ["/assets/terrain/atlas/road/road-t-junction-wide-b.png", [640, 364]],
    ["/assets/terrain/atlas/road/road-clearing-round-a.png", [512, 380]],
    ["/assets/terrain/atlas/road/road-clearing-round-b.png", [516, 444]],
    ["/assets/terrain/atlas/road/road-rectangle-small.png", [344, 264]],
    ["/assets/terrain/atlas/road/road-corner-large.png", [308, 352]],
  ]);
  for (const [asset, [width, height]] of roadAssetDimensions) {
    expect(dimensions.find((dimension) => dimension.asset === asset)).toEqual({ asset, width, height });
  }

  const waterTileMaximumHeights = new Map([
    ["/assets/terrain/atlas/water/water-pond-large.png", 205],
    ["/assets/terrain/atlas/water/water-pond-small.png", 80],
    ["/assets/terrain/atlas/water/waterfall-small.png", 85],
    ["/assets/terrain/atlas/water/water-river-straight-narrow.png", 85],
  ]);
  for (const image of dimensions) {
    const maximumHeight = waterTileMaximumHeights.get(image.asset);
    if (maximumHeight !== undefined) {
      expect(image.height, `${image.asset} excludes the next atlas row`).toBeLessThanOrEqual(maximumHeight);
    }
  }

  const alphaStats = await page.evaluate(async (imageAssets) => Promise.all(imageAssets.map((asset) => new Promise<{
    asset: string;
    transparentPixels: number;
    visiblePixels: number;
  }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const surface = document.createElement("canvas");
      surface.width = image.naturalWidth;
      surface.height = image.naturalHeight;
      const context = surface.getContext("2d");
      if (!context) {
        reject(new Error(`Missing canvas context for ${asset}`));
        return;
      }
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, surface.width, surface.height).data;
      let transparentPixels = 0;
      let visiblePixels = 0;
      for (let index = 3; index < data.length; index += 4) {
        if (data[index] === 0) transparentPixels += 1;
        if (data[index] > 0) visiblePixels += 1;
      }
      resolve({ asset, transparentPixels, visiblePixels });
    };
    image.onerror = () => reject(new Error(`Could not load ${asset}`));
    image.src = asset;
  }))), atlasAssets.filter((asset) => !asset.endsWith("/road-ribbon-normal.png")));

  for (const image of alphaStats) {
    expect(image.transparentPixels, `${image.asset} transparent pixels`).toBeGreaterThan(0);
    expect(image.visiblePixels, `${image.asset} visible pixels`).toBeGreaterThan(0);
  }

  const seamStats = await page.evaluate(async (asset) => new Promise<{
    leftRight: [number, number, number];
    topBottom: [number, number, number];
  }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const surface = document.createElement("canvas");
      surface.width = image.naturalWidth;
      surface.height = image.naturalHeight;
      const context = surface.getContext("2d");
      if (!context) {
        reject(new Error(`Missing canvas context for ${asset}`));
        return;
      }
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, surface.width, surface.height).data;
      const leftRight: [number, number, number] = [0, 0, 0];
      const topBottom: [number, number, number] = [0, 0, 0];
      for (let y = 0; y < surface.height; y += 1) {
        const leftIndex = y * surface.width * 4;
        const rightIndex = (y * surface.width + surface.width - 1) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          leftRight[channel] += Math.abs(data[leftIndex + channel] - data[rightIndex + channel]);
        }
      }
      for (let x = 0; x < surface.width; x += 1) {
        const topIndex = x * 4;
        const bottomIndex = ((surface.height - 1) * surface.width + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          topBottom[channel] += Math.abs(data[topIndex + channel] - data[bottomIndex + channel]);
        }
      }
      resolve({
        leftRight: leftRight.map((difference) => difference / surface.height) as [number, number, number],
        topBottom: topBottom.map((difference) => difference / surface.width) as [number, number, number],
      });
    };
    image.onerror = () => reject(new Error(`Could not load ${asset}`));
    image.src = asset;
  }), seamlessGrassAsset);

  for (const difference of [...seamStats.leftRight, ...seamStats.topBottom]) {
    expect(difference).toBeLessThanOrEqual(2);
  }

  const roadSeamStats = await page.evaluate(async (asset) => new Promise<number[]>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const surface = document.createElement("canvas");
      surface.width = image.naturalWidth;
      surface.height = image.naturalHeight;
      const context = surface.getContext("2d");
      if (!context) return reject(new Error(`Missing canvas context for ${asset}`));
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, surface.width, surface.height).data;
      const differences = [0, 0, 0, 0];
      for (let x = 0; x < surface.width; x += 1) {
        const top = x * 4;
        const bottom = ((surface.height - 1) * surface.width + x) * 4;
        for (let channel = 0; channel < 4; channel += 1) {
          differences[channel] += Math.abs(data[top + channel] - data[bottom + channel]);
        }
      }
      resolve(differences.map((difference) => difference / surface.width));
    };
    image.onerror = () => reject(new Error(`Could not load ${asset}`));
    image.src = asset;
  }), "/assets/terrain/atlas/road/road-ribbon-seamless.png");
  for (const difference of roadSeamStats) expect(difference).toBeLessThanOrEqual(2);

  const roadTextureStats = await page.evaluate(async (imageAssets) => Promise.all(imageAssets.map((asset) => new Promise<{
    asset: string;
    opaqueMean: [number, number, number];
    detail: number;
  }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const surface = document.createElement("canvas");
      surface.width = image.naturalWidth;
      surface.height = image.naturalHeight;
      const context = surface.getContext("2d");
      if (!context) return reject(new Error(`Missing canvas context for ${asset}`));
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, surface.width, surface.height).data;
      const channelTotals = [0, 0, 0];
      let opaquePixels = 0;
      let detailTotal = 0;
      let detailSamples = 0;
      const luminanceAt = (pixel: number) => (
        data[pixel] * 0.2126 + data[pixel + 1] * 0.7152 + data[pixel + 2] * 0.0722
      );
      for (let y = 0; y < surface.height; y += 1) {
        for (let x = 0; x < surface.width; x += 1) {
          const pixel = (y * surface.width + x) * 4;
          if (data[pixel + 3] < 220) continue;
          channelTotals[0] += data[pixel];
          channelTotals[1] += data[pixel + 1];
          channelTotals[2] += data[pixel + 2];
          opaquePixels += 1;
          for (const neighbor of [pixel - 4, pixel - surface.width * 4]) {
            if (neighbor >= 0 && data[neighbor + 3] >= 220) {
              detailTotal += Math.abs(luminanceAt(pixel) - luminanceAt(neighbor));
              detailSamples += 1;
            }
          }
        }
      }
      resolve({
        asset,
        opaqueMean: channelTotals.map((total) => total / opaquePixels) as [number, number, number],
        detail: (detailTotal / detailSamples) * (surface.width / 75),
      });
    };
    image.onerror = () => reject(new Error(`Could not load ${asset}`));
    image.src = asset;
  }))), [
    "/assets/terrain/atlas/road/road-ribbon-seamless.png",
    "/assets/terrain/atlas/road/road-straight-vertical-wide.png",
  ]);
  const generatedRoad = roadTextureStats[0];
  const sourceRoad = roadTextureStats[1];
  expect(generatedRoad.opaqueMean[1]).toBeGreaterThanOrEqual(sourceRoad.opaqueMean[1] - 10);
  expect(generatedRoad.opaqueMean[2]).toBeGreaterThanOrEqual(sourceRoad.opaqueMean[2] - 10);
  expect(generatedRoad.detail).toBeGreaterThanOrEqual(sourceRoad.detail * 0.5);
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

  const after = await jumpAndAdvance(page, 1);
  expect(after.y).toBeGreaterThan(before.y + 0.08);
  expect(after.grounded).toBe(false);
  expect(after.projectileCount).toBe(0);

  const landed = await advanceGameFrames(page, 90);
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

  const during = await jumpAndAdvance(page, 5);
  expect(during.y).toBeGreaterThan(playerBefore.y + 0.35);
  expect(during.targetY).toBeCloseTo(before.targetY, 2);
  expect(during.positionY).toBeCloseTo(before.positionY, 1);
});

test("renders a sparse grass map with atlas tree cards", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const village = await readVillageSnapshot(page);
  expect(village.terrainGrounds).toBe(1);
  expect(village.terrainSandPatches).toBe(0);
  expect(village.terrainMeadowPatches).toBe(0);
  expect(village.terrainRoadPatches).toBe(0);
  expect(village.terrainMainRoads).toBe(1);
  expect(village.terrainMainRoadVertices).toBeGreaterThanOrEqual(120);
  expect(village.terrainMainRoadMaxTurnDegrees).toBeLessThan(12);
  expect(village.terrainMainRoadCrossWidthSamples).toBeGreaterThanOrEqual(5);
  expect(village.terrainMainRoadCrownHeight).toBeGreaterThanOrEqual(0.04);
  expect(village.terrainMainRoadCrownHeight).toBeLessThanOrEqual(0.065);
  expect(village.terrainMainRoadMaxShoulderGap).toBeLessThanOrEqual(0.015);
  expect(village.terrainMainRoadInnerShoulderRise).toBeGreaterThanOrEqual(0.03);
  expect(village.terrainMainRoadInnerShoulderRise).toBeLessThanOrEqual(0.045);
  expect(village.terrainMainRoadMinNormalY).toBeGreaterThan(0.65);
  expect(village.terrainMainRoadMaxHeightGap).toBeLessThanOrEqual(0.065);
  expect(village.terrainMainRoadMaxUvEdgeDelta).toBeGreaterThan(0.01);
  expect(village.terrainMainRoadBounds).not.toBeNull();
  expect(village.terrainMainRoadBounds!.maxX - village.terrainMainRoadBounds!.minX).toBeGreaterThanOrEqual(32);
  expect(village.terrainMainRoadBounds!.maxZ - village.terrainMainRoadBounds!.minZ).toBeGreaterThanOrEqual(17);
  expect(village.terrainRoadSpurs).toBe(0);
  expect(village.terrainRectangularLayers).toBe(0);
  expect(village.terrainPatchMinVertices).toBe(0);
  expect(village.terrainSandPatchMinVertices).toBe(0);
  expect(village.terrainGrassDiffuse).not.toBeNull();
  expect(village.terrainGrassDiffuse!.r).toBeGreaterThanOrEqual(1.2);
  expect(village.terrainGrassDiffuse!.g).toBeGreaterThanOrEqual(1.24);
  expect(village.terrainGrassDiffuse!.b).toBeGreaterThanOrEqual(0.96);
  expect(village.terrainGrassDiffuseTextureSource).toContain("/assets/terrain/atlas/grass/grass-seamless-blended.png");
  expect(village.terrainGrassBumpTextureSource).toContain("/assets/terrain/atlas/grass/grass-seamless-blended.png");
  expect(village.terrainGrassTextureScale?.u).toBeCloseTo(4.5, 5);
  expect(village.terrainGrassTextureScale?.v).toBeCloseTo(3.5, 5);
  expect(village.terrainRoadDisableLighting).toBe(false);
  expect(village.terrainRoadEmissive!.r).toBeLessThanOrEqual(0.08);
  expect(village.terrainRoadEmissive!.g).toBeLessThanOrEqual(0.07);
  expect(village.terrainRoadEmissive!.b).toBeLessThanOrEqual(0.05);
  expect(village.terrainRoadEmissiveTextureSource).toBeNull();
  expect(village.terrainRoadBumpTextureSource).toContain(
    "/assets/terrain/atlas/road/road-ribbon-normal.png",
  );
  expect(village.terrainRoadBumpLevel).toBeGreaterThanOrEqual(0.45);
  expect(village.terrainRoadSpecular!.r).toBeLessThanOrEqual(0.02);
  expect(village.treeTrunkBases).toBe(0);
  expect(village.treeRoots).toBe(0);
  expect(village.treeBranches).toBe(0);
  expect(village.treeCanopies).toBe(0);
  expect(village.treeLeafCards).toBe(0);
  expect(village.treeLeafSprigs).toBe(0);
  expect(village.treeLeafVolumes).toBe(0);
  expect(village.treeLeafVolumeVertices).toBe(0);
  expect(village.treeLeafShells).toBe(0);
  expect(village.treeStyleVariants).toBe(0);
  expect(village.extraFoliageShells).toBe(0);
  expect(village.grassCards).toBe(0);
  expect(village.bushCards).toBe(0);
  expect(village.groundDetailClumps).toBe(0);
  expect(village.wildflowerCards).toBe(0);
  expect(village.pebbleMeshes).toBe(0);
  expect(village.roadReliefPebbles).toBe(24);
  expect(village.roadReliefShoulderChunks).toBe(12);
  expect(village.roadReliefVertices).toBeGreaterThanOrEqual(300);
  expect(village.roadReliefShadowReceivers).toBe(36);
  expect(village.roadReliefShadowCasters).toBe(36);
  expect(village.roadReliefCollisionEntries).toBe(0);
  expect(village.treeBaseClutter).toBe(0);
  expect(village.shadowGenerators).toBeGreaterThanOrEqual(1);
  expect(village.shadowCasters).toBeGreaterThanOrEqual(4);
  expect(village.shadowReceivers).toBeGreaterThanOrEqual(38);
  expect(village.skyLightIntensity).toBeGreaterThanOrEqual(0.82);
  expect(village.sunLightIntensity).toBeGreaterThanOrEqual(1);
  expect(village.mapBounds.maxX - village.mapBounds.minX).toBeGreaterThanOrEqual(32);
  expect(village.mapBounds.maxZ - village.mapBounds.minZ).toBeGreaterThanOrEqual(24);
  expect(village.houseBodies).toBe(0);
  expect(village.houseRoofs).toBe(0);
  expect(village.houseDoors).toBe(0);
  expect(village.houseWindows).toBe(0);
  expect(village.houseWindowFrames).toBe(0);
  expect(village.houseChimneys).toBe(0);
  expect(village.houseRoofOverhangs).toBe(0);
  expect(village.houseRoofTiles).toBe(0);
  expect(village.houseFoundationStones).toBe(0);
  expect(village.houseWallWeathering).toBe(0);
  expect(village.houseRoofBattens).toBe(0);
  expect(village.houseRoofMoss).toBe(0);
  expect(village.houseDoorHardware).toBe(0);
  expect(village.stoneClusterPieces).toBe(0);
  expect(village.treeBarkRidges).toBe(0);
  expect(village.treeLeafDepthCards).toBe(0);
  expect(village.atlasTreeCards).toBe(3);
  expect(village.atlasTreeAlphaMaterials).toBe(3);
  expect(village.pathTiles).toBe(0);
  expect(village.fenceSegments).toBe(0);
  expect(village.houseObstacles).toHaveLength(0);
  expect(village.houseRoadClearances).toHaveLength(0);
});

test("player can jump onto a reachable test obstacle", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#game-canvas")).toBeVisible();

  const obstacleTop = 0.63;
  const obstacleMinX = -3.8;
  const obstacleMaxX = -2.4;
  const playerRadius = 0.42;
  await addTestObstacle(page, {
    name: "test-reachable-obstacle",
    center: { x: -3.1, y: 0.315, z: -1.4 },
    halfExtents: { x: 0.7, y: 0.315, z: 0.55 },
  });
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
  expect(after.surfaceHeight).toBeCloseTo(obstacleTop, 1);
  expect(after.footHeight).toBeCloseTo(obstacleTop, 1);
  expect(after.x + playerRadius).toBeGreaterThan(obstacleMinX);
  expect(after.x - playerRadius).toBeLessThan(obstacleMaxX);
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
