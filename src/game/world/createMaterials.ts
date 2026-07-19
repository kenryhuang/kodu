import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";

export type CartoonMaterials = ReturnType<typeof createMaterials>;

export function createMaterials(scene: Scene) {
  const make = (name: string, color: Color3): StandardMaterial => {
    const material = new StandardMaterial(name, scene);
    material.diffuseColor = color;
    material.specularColor = new Color3(0.08, 0.08, 0.08);
    material.emissiveColor = color.scale(0.08);
    return material;
  };

  const makeTransparent = (name: string, color: Color3, alpha: number): StandardMaterial => {
    const material = make(name, color);
    material.alpha = alpha;
    material.specularColor = new Color3(0, 0, 0);
    return material;
  };

  const makeMatte = (name: string, color: Color3, emissiveScale = 0.02): StandardMaterial => {
    const material = make(name, color);
    material.specularColor = new Color3(0.018, 0.018, 0.016);
    material.emissiveColor = color.scale(emissiveScale);
    return material;
  };

  const makeImageTextured = (
    name: string,
    url: string,
    fallbackColor: Color3,
    tileScale: number,
    vTileScale = tileScale,
    useDiffuseAlpha = false,
    bumpLevel = 0,
  ): StandardMaterial => {
    const material = make(name, fallbackColor);
    const texture = new Texture(url, scene, {
      invertY: false,
      samplingMode: Texture.BILINEAR_SAMPLINGMODE,
    });
    texture.uScale = tileScale;
    texture.vScale = vTileScale;
    texture.wrapU = Texture.WRAP_ADDRESSMODE;
    texture.wrapV = Texture.WRAP_ADDRESSMODE;
    texture.hasAlpha = useDiffuseAlpha;
    material.diffuseTexture = texture;
    material.diffuseColor = new Color3(1, 1, 1);
    material.backFaceCulling = false;
    if (bumpLevel > 0) {
      const bumpTexture = new Texture(url, scene, {
        invertY: false,
        samplingMode: Texture.BILINEAR_SAMPLINGMODE,
      });
      bumpTexture.uScale = tileScale;
      bumpTexture.vScale = vTileScale;
      bumpTexture.wrapU = Texture.WRAP_ADDRESSMODE;
      bumpTexture.wrapV = Texture.WRAP_ADDRESSMODE;
      bumpTexture.level = bumpLevel;
      material.bumpTexture = bumpTexture;
    }
    if (useDiffuseAlpha) {
      material.useAlphaFromDiffuseTexture = true;
      material.transparencyMode = Material.MATERIAL_ALPHABLEND;
      material.specularColor = new Color3(0, 0, 0);
    }
    return material;
  };

  const makeAlphaTestTextured = (
    name: string,
    url: string,
    fallbackColor: Color3,
    cutoff = 0.48,
  ): StandardMaterial => {
    const material = make(name, fallbackColor);
    const texture = new Texture(url, scene, {
      invertY: false,
      samplingMode: Texture.BILINEAR_SAMPLINGMODE,
    });
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    texture.hasAlpha = true;
    material.diffuseTexture = texture;
    material.diffuseColor = new Color3(1, 1, 1);
    material.backFaceCulling = false;
    material.useAlphaFromDiffuseTexture = true;
    material.transparencyMode = Material.MATERIAL_ALPHATEST;
    material.alphaCutOff = cutoff;
    material.specularColor = new Color3(0, 0, 0);
    return material;
  };

  const makeAtlasTreeSprite = (
    name: string,
    url: string,
    fallbackColor: Color3,
  ): StandardMaterial => {
    const material = makeAlphaTestTextured(name, url, fallbackColor, 0.1);
    const texture = material.diffuseTexture as Texture | null;
    if (texture) {
      texture.vScale = -1;
      texture.vOffset = 1;
    }
    return material;
  };

  const makeHouseWall = (name: string, url: string, fallbackColor: Color3): StandardMaterial => {
    void url;
    const cleanColor = name.endsWith("mint")
      ? new Color3(0.72, 0.9, 0.62)
      : name.endsWith("clay")
        ? new Color3(0.92, 0.58, 0.38)
        : new Color3(0.98, 0.78, 0.52);
    const material = makeMatte(name, cleanColor, 0.08);
    material.specularColor = new Color3(0.025, 0.024, 0.022);
    material.ambientColor = cleanColor.scale(0.45);
    void fallbackColor;
    return material;
  };

  const makeHouseRoof = (name: string, url: string, fallbackColor: Color3): StandardMaterial => {
    void url;
    const roofUrl = name.endsWith("teal")
      ? "/assets/textures/concept/roof-teal.png"
      : "/assets/textures/concept/roof-red.png";
    const tint = name.endsWith("teal")
      ? new Color3(1.06, 1.2, 1.16)
      : name.endsWith("violet")
        ? new Color3(1.08, 0.98, 1.18)
        : new Color3(1.18, 1.04, 0.94);
    const material = makeImageTextured(name, roofUrl, fallbackColor, 1.1, 1.25, false, 0.14);
    material.diffuseColor = tint;
    material.specularColor = new Color3(0.035, 0.032, 0.03);
    material.emissiveColor = fallbackColor.scale(0.065);
    return material;
  };

  const makeAtlasTextured = (
    name: string,
    fallbackColor: Color3,
    column: number,
    row: number,
    alpha = 1,
    bumpLevel = 0.08,
    useDiffuseAlpha = false,
    tint = new Color3(1, 1, 1),
  ): StandardMaterial => {
    const material = make(name, fallbackColor);
    const atlasUrl = "/assets/textures/concept-material-atlas.png";
    const texture = new Texture(atlasUrl, scene, {
      invertY: false,
      samplingMode: Texture.BILINEAR_SAMPLINGMODE,
    });
    texture.uScale = 0.25;
    texture.vScale = 0.25;
    texture.uOffset = column * 0.25;
    texture.vOffset = row * 0.25;
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    texture.hasAlpha = useDiffuseAlpha;
    material.diffuseTexture = texture;
    material.diffuseColor = tint;
    material.specularColor = new Color3(0.03, 0.03, 0.028);
    material.emissiveColor = fallbackColor.scale(0.045);
    material.ambientColor = fallbackColor.scale(0.35);
    material.backFaceCulling = false;
    if (bumpLevel > 0) {
      const bumpTexture = new Texture(atlasUrl, scene, {
        invertY: false,
        samplingMode: Texture.BILINEAR_SAMPLINGMODE,
      });
      bumpTexture.uScale = texture.uScale;
      bumpTexture.vScale = texture.vScale;
      bumpTexture.uOffset = texture.uOffset;
      bumpTexture.vOffset = texture.vOffset;
      bumpTexture.wrapU = Texture.CLAMP_ADDRESSMODE;
      bumpTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
      bumpTexture.level = bumpLevel;
      material.bumpTexture = bumpTexture;
    }
    if (useDiffuseAlpha) {
      material.useAlphaFromDiffuseTexture = true;
      material.transparencyMode = Material.MATERIAL_ALPHABLEND;
      material.specularColor = new Color3(0, 0, 0);
    }
    if (alpha < 1) {
      material.alpha = alpha;
      material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    }
    return material;
  };

  const houseWallVariants = [
    makeHouseWall("mat-house-wall-cream", "/assets/textures/plaster-warm.png", new Color3(0.7, 0.55, 0.4)),
    makeHouseWall("mat-house-wall-mint", "/assets/textures/plaster-sage.png", new Color3(0.55, 0.66, 0.5)),
    makeHouseWall("mat-house-wall-clay", "/assets/textures/plaster-clay.png", new Color3(0.68, 0.42, 0.32)),
  ];
  const houseRoofVariants = [
    makeHouseRoof("mat-house-roof-red", "/assets/textures/roof-tiles-red.png", new Color3(0.48, 0.2, 0.16)),
    makeHouseRoof("mat-house-roof-teal", "/assets/textures/roof-tiles-teal.png", new Color3(0.22, 0.42, 0.42)),
    makeHouseRoof("mat-house-roof-violet", "/assets/textures/roof-tiles-violet.png", new Color3(0.38, 0.32, 0.48)),
  ];
  const terrainGrass = makeImageTextured(
    "mat-terrain-grass",
    "/assets/terrain/atlas/grass/grass-seamless-blended.png",
    new Color3(0.7, 0.86, 0.38),
    4.5,
    3.5,
    false,
    0.07,
  );
  terrainGrass.diffuseColor = new Color3(1.24, 1.3, 1.0);
  terrainGrass.emissiveColor = new Color3(0.1, 0.14, 0.055);
  terrainGrass.ambientColor = new Color3(0.58, 0.66, 0.36);
  const terrainMeadow = makeImageTextured("mat-terrain-meadow", "/assets/terrain/meadow.png", new Color3(0.74, 0.88, 0.42), 1.35, 1.35, true, 0.04);
  terrainMeadow.diffuseColor = new Color3(1.2, 1.26, 0.98);
  terrainMeadow.emissiveColor = new Color3(0.08, 0.11, 0.04);
  const terrainRoad = makeImageTextured("mat-terrain-road", "/assets/terrain/atlas/road/road-ribbon-seamless.png", new Color3(0.8, 0.7, 0.46), 1, 1, true);
  terrainRoad.diffuseColor = new Color3(1, 1, 1);
  terrainRoad.emissiveColor = new Color3(1, 1, 1);
  terrainRoad.emissiveTexture = terrainRoad.diffuseTexture;
  terrainRoad.disableLighting = true;
  const pathDirt = makeImageTextured("mat-path-dirt", "/assets/textures/concept/dirt-road.png", new Color3(0.7, 0.46, 0.25), 1.4, 2.2, true, 0.04);
  pathDirt.diffuseColor = new Color3(1.1, 0.84, 0.58);
  pathDirt.emissiveColor = new Color3(0.07, 0.045, 0.022);
  const terrainSand = makeImageTextured("mat-terrain-sand", "/assets/terrain/sand.png", new Color3(0.78, 0.6, 0.34), 1.0, 1.0, true, 0.025);
  terrainSand.diffuseColor = new Color3(1.18, 1.02, 0.76);
  terrainSand.emissiveColor = new Color3(0.08, 0.055, 0.028);
  const atlasTreeOakLarge = makeAtlasTreeSprite("mat-atlas-tree-oak-large", "/assets/vegetation/atlas/tree-oak-large.png", new Color3(0.42, 0.66, 0.28));
  const atlasTreePineSmall = makeAtlasTreeSprite("mat-atlas-tree-pine-small", "/assets/vegetation/atlas/tree-pine-small.png", new Color3(0.32, 0.58, 0.28));
  const atlasTreeRoundSmall = makeAtlasTreeSprite("mat-atlas-tree-round-small", "/assets/vegetation/atlas/tree-round-small.png", new Color3(0.42, 0.68, 0.3));

  return {
    grass: make("mat-grass", new Color3(0.42, 0.72, 0.36)),
    terrainGrass,
    terrainMeadow,
    terrainSand,
    terrainRoad,
    edge: make("mat-edge", new Color3(0.34, 0.52, 0.29)),
    player: makeMatte("mat-player", new Color3(0.12, 0.32, 0.78), 0.015),
    npc: makeMatte("mat-npc", new Color3(0.72, 0.18, 0.13), 0.015),
    projectile: make("mat-projectile", new Color3(1.0, 0.85, 0.25)),
    stone: makeImageTextured("mat-stone", "/assets/textures/concept/stone-masonry.png", new Color3(0.48, 0.5, 0.46), 1.25, 1.25, false, 0.14),
    houseWall: houseWallVariants[0],
    houseRoof: houseRoofVariants[0],
    houseWallVariants,
    houseRoofVariants,
    houseTrim: makeImageTextured("mat-house-trim", "/assets/textures/concept/trim-wood.png", new Color3(0.72, 0.64, 0.48), 1.1, 1.1, false, 0.07),
    houseDoor: makeImageTextured("mat-house-door", "/assets/textures/concept/weathered-wood.png", new Color3(0.36, 0.24, 0.16), 1.1, 1.1, false, 0.1),
    houseWindow: makeImageTextured("mat-house-window", "/assets/textures/concept/window-glass.png", new Color3(0.36, 0.56, 0.64), 1, 1, false, 0.04),
    houseChimney: makeImageTextured("mat-house-chimney", "/assets/textures/concept/stone-masonry.png", new Color3(0.42, 0.42, 0.38), 1.2, 1.2, false, 0.13),
    houseRoofRidge: makeImageTextured("mat-house-roof-ridge", "/assets/textures/concept/roof-red.png", new Color3(0.42, 0.18, 0.14), 1.25, 1.25, false, 0.12),
    houseFoundationStone: makeImageTextured("mat-house-foundation-stone", "/assets/textures/concept/pebbles.png", new Color3(0.4, 0.42, 0.38), 1.2, 1.2, false, 0.14),
    houseWeathering: makeAtlasTextured("mat-house-wall-weathering", new Color3(0.28, 0.24, 0.18), 2, 0, 0.62, 0.07),
    houseRoofMoss: makeAtlasTextured("mat-house-roof-moss", new Color3(0.2, 0.28, 0.12), 1, 2, 0.72, 0.08),
    houseDoorHardware: makeMatte("mat-house-door-hardware", new Color3(0.12, 0.1, 0.08), 0.01),
    fenceWood: makeImageTextured("mat-fence-wood", "/assets/textures/concept/weathered-wood.png", new Color3(0.42, 0.28, 0.18), 1.4, 1.1, false, 0.09),
    pathDirt,
    treeTrunk: make("mat-tree-trunk", new Color3(0.48, 0.3, 0.18)),
    treeBark: makeImageTextured("mat-tree-bark", "/assets/textures/concept/bark.png", new Color3(0.38, 0.25, 0.15), 1.1, 1.3, false, 0.14),
    treeBarkRidge: makeImageTextured("mat-tree-bark-ridge", "/assets/textures/concept/bark.png", new Color3(0.28, 0.17, 0.1), 1.4, 1.6, false, 0.14),
    treeBarkLight: make("mat-tree-bark-light", new Color3(0.68, 0.45, 0.25)),
    treeTop: make("mat-tree-top", new Color3(0.25, 0.58, 0.3)),
    treeTopDark: make("mat-tree-top-dark", new Color3(0.16, 0.42, 0.22)),
    treeTopLight: make("mat-tree-top-light", new Color3(0.47, 0.72, 0.34)),
    treeLeafMask: makeAlphaTestTextured("mat-tree-leaf-mask", "/assets/vegetation/tree-leaves.png", new Color3(0.42, 0.74, 0.36), 0.38),
    treeLeafShell: makeAlphaTestTextured("mat-tree-leaf-shell", "/assets/vegetation/tree-leaf-shell.png", new Color3(0.5, 0.8, 0.42), 0.4),
    atlasTreeOakLarge,
    atlasTreePineSmall,
    atlasTreeRoundSmall,
    treeLeavesCard: makeImageTextured("mat-tree-leaves-card", "/assets/vegetation/tree-leaves.png", new Color3(0.42, 0.74, 0.36), 1, 1, true),
    bushCard: makeImageTextured("mat-bush-card", "/assets/vegetation/bush.png", new Color3(0.44, 0.74, 0.36), 1, 1, true),
    grassCard: makeImageTextured("mat-grass-card", "/assets/vegetation/grass-card.png", new Color3(0.48, 0.72, 0.34), 1, 1, true),
    groundDetailGrass: makeImageTextured("mat-ground-detail-grass", "/assets/vegetation/grass-card.png", new Color3(0.34, 0.5, 0.24), 1, 1, true),
    wildflowerPurple: makeMatte("mat-wildflower-purple", new Color3(0.52, 0.42, 0.62), 0.025),
    wildflowerYellow: makeMatte("mat-wildflower-yellow", new Color3(0.68, 0.58, 0.22), 0.025),
    pebble: makeImageTextured("mat-pebble", "/assets/textures/concept/pebbles.png", new Color3(0.48, 0.46, 0.4), 1.4, 1.4, false, 0.11),
    stoneCluster: makeImageTextured("mat-stone-cluster", "/assets/textures/concept/stone-masonry.png", new Color3(0.42, 0.44, 0.4), 1.2, 1.2, false, 0.13),
    treeLeafDepth: makeAtlasTextured("mat-tree-leaf-depth", new Color3(0.32, 0.55, 0.26), 3, 1, 0.56, 0.035),
    treeShadow: makeTransparent("mat-tree-shadow", new Color3(0.12, 0.2, 0.12), 0.26),
    contactShadow: makeTransparent("mat-contact-shadow", new Color3(0.04, 0.06, 0.035), 0.2),
  };
}
