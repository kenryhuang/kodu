import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
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

type HouseFace = "front" | "left" | "right";

type HouseWindow = {
  readonly id: string;
  readonly face: HouseFace;
  readonly along: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
};

type HouseStyle = {
  readonly wallVariant: number;
  readonly roofVariant: number;
  readonly doorX: number;
  readonly doorWidth: number;
  readonly windows: HouseWindow[];
  readonly chimneyX: number;
  readonly chimneyZ: number;
  readonly roofTileRows: number;
};

function toHouseWorld(center: Vector3, yaw: number, localX: number, y: number, localZ: number): Vector3 {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return new Vector3(
    center.x + localX * cos + localZ * sin,
    y,
    center.z - localX * sin + localZ * cos,
  );
}

function addDetailBox(
  name: string,
  center: Vector3,
  yaw: number,
  localX: number,
  y: number,
  localZ: number,
  width: number,
  height: number,
  depth: number,
  material: StandardMaterial,
  scene: Scene,
  rotationY = yaw,
): void {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position = toHouseWorld(center, yaw, localX, y, localZ);
  mesh.rotation.y = rotationY;
  mesh.material = material;
}

function addFaceDetail(
  name: string,
  face: HouseFace,
  center: Vector3,
  halfExtents: Vector3,
  yaw: number,
  along: number,
  bottom: number,
  width: number,
  height: number,
  depth: number,
  material: StandardMaterial,
  scene: Scene,
): void {
  let localX = along;
  let localZ = -halfExtents.z - depth * 0.5 - 0.01;
  let rotationY = yaw;

  if (face === "left") {
    localX = -halfExtents.x - depth * 0.5 - 0.01;
    localZ = along;
    rotationY = yaw + Math.PI / 2;
  } else if (face === "right") {
    localX = halfExtents.x + depth * 0.5 + 0.01;
    localZ = along;
    rotationY = yaw + Math.PI / 2;
  }

  addDetailBox(
    name,
    center,
    yaw,
    localX,
    center.y - halfExtents.y + bottom + height * 0.5,
    localZ,
    width,
    height,
    depth,
    material,
    scene,
    rotationY,
  );
}

function addWindow(
  name: string,
  window: HouseWindow,
  center: Vector3,
  halfExtents: Vector3,
  yaw: number,
  scene: Scene,
  materials: CartoonMaterials,
): void {
  const frame = 0.055;
  addFaceDetail(`${name}-window-${window.id}`, window.face, center, halfExtents, yaw, window.along, window.bottom, window.width, window.height, 0.045, materials.houseWindow, scene);
  addFaceDetail(`${name}-window-frame-${window.id}-top`, window.face, center, halfExtents, yaw, window.along, window.bottom + window.height, window.width + frame * 2, frame, 0.06, materials.houseTrim, scene);
  addFaceDetail(`${name}-window-frame-${window.id}-bottom`, window.face, center, halfExtents, yaw, window.along, window.bottom - frame, window.width + frame * 2, frame, 0.06, materials.houseTrim, scene);
  addFaceDetail(`${name}-window-frame-${window.id}-left`, window.face, center, halfExtents, yaw, window.along - window.width * 0.5 - frame * 0.5, window.bottom, frame, window.height, 0.06, materials.houseTrim, scene);
  addFaceDetail(`${name}-window-frame-${window.id}-right`, window.face, center, halfExtents, yaw, window.along + window.width * 0.5 + frame * 0.5, window.bottom, frame, window.height, 0.06, materials.houseTrim, scene);
}

function addHouseDetails(
  name: string,
  center: Vector3,
  halfExtents: Vector3,
  yaw: number,
  style: HouseStyle,
  scene: Scene,
  materials: CartoonMaterials,
): void {
  addFaceDetail(`${name}-door-trim`, "front", center, halfExtents, yaw, style.doorX, 0.02, style.doorWidth + 0.12, 0.86, 0.055, materials.houseTrim, scene);
  addFaceDetail(`${name}-door`, "front", center, halfExtents, yaw, style.doorX, 0.02, style.doorWidth, 0.76, 0.07, materials.houseDoor, scene);
  addFaceDetail(`${name}-door-knob`, "front", center, halfExtents, yaw, style.doorX + style.doorWidth * 0.28, 0.34, 0.055, 0.055, 0.085, materials.projectile, scene);

  for (const window of style.windows) {
    addWindow(name, window, center, halfExtents, yaw, scene, materials);
  }

  addDetailBox(`${name}-roof-overhang-front`, center, yaw, 0, center.y + halfExtents.y + 0.04, -halfExtents.z - 0.16, halfExtents.x * 2.35, 0.1, 0.18, materials.houseTrim, scene);
  addDetailBox(`${name}-roof-overhang-back`, center, yaw, 0, center.y + halfExtents.y + 0.04, halfExtents.z + 0.16, halfExtents.x * 2.35, 0.1, 0.18, materials.houseTrim, scene);
  addDetailBox(`${name}-roof-overhang-left`, center, yaw, -halfExtents.x - 0.14, center.y + halfExtents.y + 0.04, 0, halfExtents.z * 2.2, 0.1, 0.16, materials.houseTrim, scene, yaw + Math.PI / 2);
  addDetailBox(`${name}-roof-overhang-right`, center, yaw, halfExtents.x + 0.14, center.y + halfExtents.y + 0.04, 0, halfExtents.z * 2.2, 0.1, 0.16, materials.houseTrim, scene, yaw + Math.PI / 2);

  for (let row = 0; row < style.roofTileRows; row += 1) {
    const y = center.y + halfExtents.y + 0.22 + row * 0.1;
    const z = 0.2 + row * 0.08;
    const width = halfExtents.x * 2.15 - row * 0.08;
    addDetailBox(`${name}-roof-tile-front-${row}`, center, yaw, 0, y, -z, width, 0.035, 0.05, materials.houseRoofRidge, scene);
    addDetailBox(`${name}-roof-tile-back-${row}`, center, yaw, 0, y, z, width, 0.035, 0.05, materials.houseRoofRidge, scene);
  }

  addDetailBox(`${name}-roof-ridge`, center, yaw, 0, center.y + halfExtents.y + 0.64, 0, halfExtents.z * 2 + 0.34, 0.07, 0.08, materials.houseRoofRidge, scene, yaw + Math.PI / 2);
  addDetailBox(`${name}-chimney`, center, yaw, style.chimneyX, center.y + halfExtents.y + 0.62, style.chimneyZ, 0.24, 0.52, 0.24, materials.houseChimney, scene);
  addDetailBox(`${name}-chimney-cap`, center, yaw, style.chimneyX, center.y + halfExtents.y + 0.91, style.chimneyZ, 0.34, 0.08, 0.34, materials.houseChimney, scene);
}

function addHouse(
  name: string,
  center: Vector3,
  halfExtents: Vector3,
  roofYaw: number,
  style: HouseStyle,
  obstacles: Obstacle[],
  scene: Scene,
  materials: CartoonMaterials,
): void {
  const body = makeObstacle(`${name}-body`, center, halfExtents, scene, materials);
  body.mesh.rotation.y = roofYaw;
  body.mesh.material = materials.houseWallVariants[style.wallVariant];
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
  roof.material = materials.houseRoofVariants[style.roofVariant];

  addHouseDetails(name, center, halfExtents, roofYaw, style, scene, materials);
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

function addTerrainLayer(
  name: string,
  position: Vector3,
  width: number,
  depth: number,
  rotationY: number,
  scene: Scene,
  material: StandardMaterial,
): void {
  const layer = MeshBuilder.CreateGround(name, { width, height: depth }, scene);
  layer.position = position;
  layer.rotation.y = rotationY;
  layer.material = material;
}

function addFenceSegment(name: string, position: Vector3, length: number, rotationY: number, scene: Scene, materials: CartoonMaterials): void {
  const rail = MeshBuilder.CreateBox(name, { width: length, height: 0.16, depth: 0.08 }, scene);
  rail.position = position;
  rail.rotation.y = rotationY;
  rail.material = materials.fenceWood;
}

export function createDioramaMap(scene: Scene, materials: CartoonMaterials): DioramaMap {
  const terrain = MeshBuilder.CreateGroundFromHeightMap("terrain-heightmap-ground", "/assets/terrain/heightmap-valley.png", {
    width: 36,
    height: 28,
    subdivisions: 96,
    minHeight: -0.12,
    maxHeight: 0.9,
  }, scene);
  terrain.material = materials.terrainGrass;

  const edge = MeshBuilder.CreateBox("map-dark-edge", { width: 37, height: 0.42, depth: 29 }, scene);
  edge.position.y = -0.42;
  edge.material = materials.edge;

  addTerrainLayer("terrain-sand-south-east", new Vector3(8.5, 0.035, -6.4), 7.2, 4.8, -0.15, scene, materials.terrainSand);
  addTerrainLayer("terrain-sand-village-grove", new Vector3(4.7, 0.041, -2.65), 4.3, 2.6, -0.28, scene, materials.terrainSand);
  addTerrainLayer("terrain-road-center", new Vector3(0, 0.045, 0.4), 1.25, 8.2, 0.08, scene, materials.terrainRoad);
  addTerrainLayer("terrain-road-north", new Vector3(-1.2, 0.046, 6.8), 1.05, 8.5, -0.28, scene, materials.terrainRoad);
  addTerrainLayer("terrain-road-east", new Vector3(8.2, 0.047, 2.1), 1.05, 11.5, Math.PI / 2 - 0.16, scene, materials.terrainRoad);
  addTerrainLayer("terrain-road-south-west", new Vector3(-7.3, 0.048, -5.2), 1.05, 10.4, Math.PI / 2 + 0.32, scene, materials.terrainRoad);

  const obstacles = [
    makeObstacle("rock-west", new Vector3(-3.1, 0.28, -1.4), new Vector3(0.7, 0.35, 0.55), scene, materials),
    makeObstacle("rock-east", new Vector3(3.2, 0.28, 1.2), new Vector3(0.65, 0.35, 0.55), scene, materials),
  ];

  addHouse("house-north", new Vector3(-1.25, 0.95, 3.3), new Vector3(0.88, 0.95, 0.62), 0, {
    wallVariant: 0,
    roofVariant: 0,
    doorX: 0,
    doorWidth: 0.38,
    chimneyX: 0.44,
    chimneyZ: 0.08,
    roofTileRows: 4,
    windows: [
      { id: "front-left", face: "front", along: -0.48, bottom: 0.58, width: 0.28, height: 0.28 },
      { id: "front-right", face: "front", along: 0.48, bottom: 0.62, width: 0.28, height: 0.28 },
      { id: "right-small", face: "right", along: 0.08, bottom: 0.66, width: 0.24, height: 0.24 },
    ],
  }, obstacles, scene, materials);
  addHouse("house-south-west", new Vector3(-5.05, 0.95, -3.05), new Vector3(0.74, 0.95, 0.56), Math.PI / 2, {
    wallVariant: 1,
    roofVariant: 1,
    doorX: -0.18,
    doorWidth: 0.34,
    chimneyX: -0.34,
    chimneyZ: -0.06,
    roofTileRows: 5,
    windows: [
      { id: "front-tall", face: "front", along: 0.32, bottom: 0.56, width: 0.26, height: 0.36 },
      { id: "left-square", face: "left", along: -0.08, bottom: 0.64, width: 0.24, height: 0.24 },
    ],
  }, obstacles, scene, materials);
  addHouse("house-east", new Vector3(5.0, 0.95, 2.15), new Vector3(0.8, 0.95, 0.58), -Math.PI / 2, {
    wallVariant: 2,
    roofVariant: 2,
    doorX: 0.2,
    doorWidth: 0.36,
    chimneyX: 0.08,
    chimneyZ: 0.22,
    roofTileRows: 4,
    windows: [
      { id: "front-wide", face: "front", along: -0.36, bottom: 0.6, width: 0.36, height: 0.26 },
      { id: "front-attic", face: "front", along: 0.36, bottom: 1.02, width: 0.24, height: 0.22 },
      { id: "right-square", face: "right", along: -0.1, bottom: 0.62, width: 0.24, height: 0.24 },
    ],
  }, obstacles, scene, materials);

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
    bounds: { minX: -17.2, maxX: 17.2, minZ: -13.2, maxZ: 13.2 },
    obstacles,
  };
}
