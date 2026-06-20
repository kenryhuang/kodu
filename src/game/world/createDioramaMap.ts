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

function addHouse(
  name: string,
  center: Vector3,
  halfExtents: Vector3,
  roofYaw: number,
  obstacles: Obstacle[],
  scene: Scene,
  materials: CartoonMaterials,
): void {
  const body = makeObstacle(`${name}-body`, center, halfExtents, scene, materials);
  body.mesh.material = materials.houseWall;
  obstacles.push(body);

  const roof = MeshBuilder.CreateCylinder(`${name}-roof`, {
    height: halfExtents.z * 2 + 0.28,
    diameter: halfExtents.x * 2.7,
    tessellation: 3,
  }, scene);
  roof.position = center.add(new Vector3(0, halfExtents.y + 0.33, 0));
  roof.rotation.x = Math.PI / 2;
  roof.rotation.y = roofYaw;
  roof.scaling.y = 0.55;
  roof.material = materials.houseRoof;
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

function addPathTile(name: string, position: Vector3, width: number, depth: number, rotationY: number, scene: Scene, materials: CartoonMaterials): void {
  const path = MeshBuilder.CreateBox(name, { width, height: 0.04, depth }, scene);
  path.position = position;
  path.rotation.y = rotationY;
  path.material = materials.pathDirt;
}

function addFenceSegment(name: string, position: Vector3, length: number, rotationY: number, scene: Scene, materials: CartoonMaterials): void {
  const rail = MeshBuilder.CreateBox(name, { width: length, height: 0.16, depth: 0.08 }, scene);
  rail.position = position;
  rail.rotation.y = rotationY;
  rail.material = materials.fenceWood;
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

  addHouse("house-north", new Vector3(-1.25, 0.95, 3.3), new Vector3(0.88, 0.95, 0.62), 0, obstacles, scene, materials);
  addHouse("house-south-west", new Vector3(-5.05, 0.95, -3.05), new Vector3(0.74, 0.95, 0.56), Math.PI / 2, obstacles, scene, materials);
  addHouse("house-east", new Vector3(5.0, 0.95, 2.15), new Vector3(0.8, 0.95, 0.58), -Math.PI / 2, obstacles, scene, materials);

  addTree("tree-north-west", new Vector3(-4.8, 0, 2.7), scene, materials);
  addTree("tree-south-east", new Vector3(4.9, 0, -2.8), scene, materials);

  addPathTile("village-path-center", new Vector3(0, 0.02, 0.4), 1.0, 3.4, 0.1, scene, materials);
  addPathTile("village-path-north", new Vector3(-0.75, 0.021, 2.2), 0.85, 2.0, -0.35, scene, materials);
  addPathTile("village-path-east", new Vector3(3.25, 0.022, 1.55), 0.8, 2.8, Math.PI / 2 - 0.2, scene, materials);
  addPathTile("village-path-south-west", new Vector3(-3.6, 0.023, -2.1), 0.78, 2.4, Math.PI / 2 + 0.25, scene, materials);

  addFenceSegment("fence-north-a", new Vector3(-2.35, 0.18, 2.42), 0.9, 0, scene, materials);
  addFenceSegment("fence-north-b", new Vector3(-0.2, 0.18, 2.45), 0.75, 0, scene, materials);
  addFenceSegment("fence-east-a", new Vector3(4.05, 0.18, 1.15), 0.8, Math.PI / 2, scene, materials);
  addFenceSegment("fence-east-b", new Vector3(4.0, 0.18, 3.05), 0.85, Math.PI / 2, scene, materials);
  addFenceSegment("fence-south-west-a", new Vector3(-5.95, 0.18, -2.25), 0.75, Math.PI / 2, scene, materials);
  addFenceSegment("fence-south-west-b", new Vector3(-4.05, 0.18, -3.85), 0.75, 0, scene, materials);

  return {
    bounds: { minX: -6.4, maxX: 6.4, minZ: -4.4, maxZ: 4.4 },
    obstacles,
  };
}
