import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import type { DioramaMap, Obstacle } from "../types";
import type { CartoonMaterials } from "./createMaterials";

function makeObstacle(name: string, center: Vector3, halfExtents: Vector3, scene: Scene, materials: CartoonMaterials): Obstacle {
  const mesh = MeshBuilder.CreateBox(name, {
    width: halfExtents.x * 2,
    height: halfExtents.y * 2,
    depth: halfExtents.z * 2,
  }, scene);
  mesh.position.copyFrom(center);
  mesh.material = materials.stone;
  return { name, center, halfExtents, mesh };
}

function addTree(name: string, position: Vector3, scene: Scene, materials: CartoonMaterials): void {
  const trunk = MeshBuilder.CreateCylinder(`${name}-trunk`, { height: 0.75, diameter: 0.22, tessellation: 8 }, scene);
  trunk.position = position.add(new Vector3(0, 0.38, 0));
  trunk.material = materials.treeTrunk;

  const top = MeshBuilder.CreateSphere(`${name}-top`, { diameter: 0.9, segments: 12 }, scene);
  top.position = position.add(new Vector3(0, 0.95, 0));
  top.scaling.y = 0.82;
  top.material = materials.treeTop;
}

export function createDioramaMap(scene: Scene, materials: CartoonMaterials): DioramaMap {
  const ground = MeshBuilder.CreateBox("map-grass-platform", { width: 14, height: 0.45, depth: 10 }, scene);
  ground.position.y = -0.25;
  ground.material = materials.grass;

  const edge = MeshBuilder.CreateBox("map-dark-edge", { width: 14.4, height: 0.42, depth: 10.4 }, scene);
  edge.position.y = -0.52;
  edge.material = materials.edge;

  const obstacles = [
    makeObstacle("rock-west", new Vector3(-3.1, 0.28, -1.4), new Vector3(0.7, 0.35, 0.55), scene, materials),
    makeObstacle("rock-east", new Vector3(3.2, 0.28, 1.2), new Vector3(0.65, 0.35, 0.55), scene, materials),
  ];

  addTree("tree-north-west", new Vector3(-4.8, 0, 2.7), scene, materials);
  addTree("tree-south-east", new Vector3(4.9, 0, -2.8), scene, materials);

  return {
    bounds: { minX: -6.4, maxX: 6.4, minZ: -4.4, maxZ: 4.4 },
    obstacles,
  };
}
