import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
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

  return {
    grass: make("mat-grass", new Color3(0.42, 0.72, 0.36)),
    edge: make("mat-edge", new Color3(0.34, 0.52, 0.29)),
    player: make("mat-player", new Color3(0.18, 0.42, 0.92)),
    npc: make("mat-npc", new Color3(0.9, 0.26, 0.18)),
    projectile: make("mat-projectile", new Color3(1.0, 0.85, 0.25)),
    stone: make("mat-stone", new Color3(0.56, 0.62, 0.6)),
    treeTrunk: make("mat-tree-trunk", new Color3(0.48, 0.3, 0.18)),
    treeTop: make("mat-tree-top", new Color3(0.25, 0.58, 0.3)),
  };
}
