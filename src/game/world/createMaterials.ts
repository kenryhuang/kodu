import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Material } from "@babylonjs/core/Materials/material";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
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

  const makeTextured = (
    name: string,
    fallbackColor: Color3,
    paint: (context: CanvasRenderingContext2D) => void,
  ): StandardMaterial => {
    const material = make(name, fallbackColor);
    const texture = new DynamicTexture(`${name}-texture`, { width: 128, height: 128 }, scene, false, Texture.NEAREST_SAMPLINGMODE);
    const context = texture.getContext() as CanvasRenderingContext2D;
    paint(context);
    texture.update(false);
    material.diffuseTexture = texture;
    material.diffuseColor = new Color3(1, 1, 1);
    return material;
  };

  const makeImageTextured = (
    name: string,
    url: string,
    fallbackColor: Color3,
    tileScale: number,
    vTileScale = tileScale,
    useDiffuseAlpha = false,
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
    if (useDiffuseAlpha) {
      material.useAlphaFromDiffuseTexture = true;
      material.transparencyMode = Material.MATERIAL_ALPHABLEND;
      material.specularColor = new Color3(0, 0, 0);
    }
    return material;
  };

  const makeHouseWall = (name: string, base: string, line: string): StandardMaterial => makeTextured(
    name,
    Color3.FromHexString(base),
    (context) => {
      context.fillStyle = base;
      context.fillRect(0, 0, 128, 128);
      context.strokeStyle = line;
      context.lineWidth = 3;
      for (let y = 18; y < 128; y += 26) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(128, y + (y % 3) * 2);
        context.stroke();
      }
      context.strokeStyle = "rgba(255,255,255,0.26)";
      context.lineWidth = 2;
      for (let x = 12; x < 128; x += 34) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + 8, 128);
        context.stroke();
      }
    },
  );

  const makeHouseRoof = (name: string, base: string, line: string): StandardMaterial => makeTextured(
    name,
    Color3.FromHexString(base),
    (context) => {
      context.fillStyle = base;
      context.fillRect(0, 0, 128, 128);
      context.strokeStyle = line;
      context.lineWidth = 4;
      for (let y = 12; y < 128; y += 18) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(128, y);
        context.stroke();
      }
      context.strokeStyle = "rgba(255,255,255,0.18)";
      context.lineWidth = 2;
      for (let y = 20; y < 128; y += 36) {
        for (let x = -12; x < 128; x += 28) {
          context.strokeRect(x + (y % 3) * 4, y - 8, 18, 12);
        }
      }
    },
  );

  const houseWallVariants = [
    makeHouseWall("mat-house-wall-cream", "#dcb98a", "#c99862"),
    makeHouseWall("mat-house-wall-mint", "#9ccf9a", "#6fae75"),
    makeHouseWall("mat-house-wall-clay", "#d98b68", "#a95c44"),
  ];
  const houseRoofVariants = [
    makeHouseRoof("mat-house-roof-red", "#b7432f", "#7a241a"),
    makeHouseRoof("mat-house-roof-teal", "#2f7c83", "#1f4d54"),
    makeHouseRoof("mat-house-roof-violet", "#69538f", "#3e3158"),
  ];

  return {
    grass: make("mat-grass", new Color3(0.42, 0.72, 0.36)),
    terrainGrass: makeImageTextured("mat-terrain-grass", "/assets/terrain/grass.png", new Color3(0.42, 0.72, 0.36), 5, 4),
    terrainSand: makeImageTextured("mat-terrain-sand", "/assets/terrain/sand.png", new Color3(0.78, 0.64, 0.38), 1, 1, true),
    terrainRoad: makeImageTextured("mat-terrain-road", "/assets/terrain/road.png", new Color3(0.55, 0.4, 0.25), 1, 1, true),
    edge: make("mat-edge", new Color3(0.34, 0.52, 0.29)),
    player: make("mat-player", new Color3(0.18, 0.42, 0.92)),
    npc: make("mat-npc", new Color3(0.9, 0.26, 0.18)),
    projectile: make("mat-projectile", new Color3(1.0, 0.85, 0.25)),
    stone: make("mat-stone", new Color3(0.56, 0.62, 0.6)),
    houseWall: houseWallVariants[0],
    houseRoof: houseRoofVariants[0],
    houseWallVariants,
    houseRoofVariants,
    houseTrim: make("mat-house-trim", new Color3(0.94, 0.84, 0.68)),
    houseDoor: make("mat-house-door", new Color3(0.45, 0.25, 0.14)),
    houseWindow: make("mat-house-window", new Color3(0.48, 0.78, 0.92)),
    houseChimney: make("mat-house-chimney", new Color3(0.5, 0.26, 0.2)),
    houseRoofRidge: make("mat-house-roof-ridge", new Color3(0.32, 0.18, 0.16)),
    fenceWood: make("mat-fence-wood", new Color3(0.57, 0.38, 0.21)),
    pathDirt: makeImageTextured("mat-path-dirt", "/assets/terrain/road.png", new Color3(0.55, 0.4, 0.25), 1, 1, true),
    treeTrunk: make("mat-tree-trunk", new Color3(0.48, 0.3, 0.18)),
    treeBarkLight: make("mat-tree-bark-light", new Color3(0.68, 0.45, 0.25)),
    treeTop: make("mat-tree-top", new Color3(0.25, 0.58, 0.3)),
    treeTopDark: make("mat-tree-top-dark", new Color3(0.16, 0.42, 0.22)),
    treeTopLight: make("mat-tree-top-light", new Color3(0.47, 0.72, 0.34)),
    treeShadow: makeTransparent("mat-tree-shadow", new Color3(0.12, 0.2, 0.12), 0.26),
  };
}
