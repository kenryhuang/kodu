import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
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

type PatchPoint = readonly [number, number];

type RoadRoutePoint = {
  readonly x: number;
  readonly z: number;
  readonly width: number;
};

type TreeStyle = {
  readonly scale: number;
  readonly yaw: number;
  readonly shape: "round" | "tall" | "wide";
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

function addSimpleBox(
  name: string,
  position: Vector3,
  width: number,
  height: number,
  depth: number,
  rotationY: number,
  material: StandardMaterial,
  scene: Scene,
  rotationZ = 0,
): void {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position = position;
  mesh.rotation.y = rotationY;
  mesh.rotation.z = rotationZ;
  mesh.material = material;
}

function addVegetationCard(
  name: string,
  position: Vector3,
  width: number,
  height: number,
  yaw: number,
  material: StandardMaterial,
  scene: Scene,
  pitch = 0,
): void {
  const card = MeshBuilder.CreatePlane(name, { width, height, sideOrientation: Mesh.DOUBLESIDE }, scene);
  card.position = position;
  card.rotation.x = pitch;
  card.rotation.y = yaw;
  card.material = material;
}

function addCrossCards(
  prefix: string,
  position: Vector3,
  width: number,
  height: number,
  yaw: number,
  material: StandardMaterial,
  scene: Scene,
): void {
  addVegetationCard(`${prefix}-0`, position, width, height, yaw, material, scene);
  addVegetationCard(`${prefix}-1`, position, width * 0.94, height * 0.98, yaw + Math.PI / 2, material, scene);
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

function addTree(
  name: string,
  position: Vector3,
  scene: Scene,
  materials: CartoonMaterials,
  style: Partial<TreeStyle> = {},
): void {
  const scale = style.scale ?? 1;
  const yaw = style.yaw ?? 0;
  const shape = style.shape ?? "round";
  const shapeScale = {
    round: { x: 1, y: 1, z: 1 },
    tall: { x: 0.82, y: 1.22, z: 0.86 },
    wide: { x: 1.24, y: 0.9, z: 1.12 },
  }[shape];

  const shadow = MeshBuilder.CreateCylinder(`${name}-shadow`, { height: 0.018, diameter: 1.45 * scale, tessellation: 18 }, scene);
  shadow.position = position.add(new Vector3(0, 0.014, 0));
  shadow.scaling.z = 0.58;
  shadow.rotation.y = yaw;
  shadow.material = materials.treeShadow;

  const trunkBase = MeshBuilder.CreateCylinder(`${name}-trunk-base`, {
    height: 0.62 * scale,
    diameterBottom: 0.3 * scale,
    diameterTop: 0.21 * scale,
    tessellation: 8,
  }, scene);
  trunkBase.position = position.add(new Vector3(0, 0.32 * scale, 0));
  trunkBase.rotation.z = 0.04 * Math.sin(yaw);
  trunkBase.material = materials.treeTrunk;

  const trunkUpper = MeshBuilder.CreateCylinder(`${name}-trunk-upper`, {
    height: 0.42 * scale,
    diameterBottom: 0.21 * scale,
    diameterTop: 0.15 * scale,
    tessellation: 8,
  }, scene);
  trunkUpper.position = position.add(new Vector3(0.04 * scale * Math.cos(yaw), 0.8 * scale, -0.04 * scale * Math.sin(yaw)));
  trunkUpper.rotation.z = 0.08 * Math.cos(yaw);
  trunkUpper.material = materials.treeTrunk;

  addDetailBox(`${name}-bark-highlight`, position, yaw, -0.065 * scale, 0.52 * scale, -0.13 * scale, 0.04 * scale, 0.52 * scale, 0.032 * scale, materials.treeBarkLight, scene);

  for (let index = 0; index < 4; index += 1) {
    const rootYaw = yaw + index * Math.PI * 0.5 + (index % 2 === 0 ? 0.18 : -0.12);
    const center = position.add(new Vector3(Math.cos(rootYaw) * 0.2 * scale, 0.08 * scale, Math.sin(rootYaw) * 0.2 * scale));
    addSimpleBox(`${name}-root-${index}`, center, 0.48 * scale, 0.08 * scale, 0.13 * scale, rootYaw, materials.treeTrunk, scene, index % 2 === 0 ? 0.04 : -0.04);
  }

  for (let index = 0; index < 3; index += 1) {
    const branchYaw = yaw + index * Math.PI * 0.68 + 0.28;
    const branchY = (0.78 + index * 0.12) * scale;
    const center = position.add(new Vector3(Math.cos(branchYaw) * 0.21 * scale, branchY, Math.sin(branchYaw) * 0.21 * scale));
    addSimpleBox(`${name}-branch-${index}`, center, (0.5 - index * 0.05) * scale, 0.08 * scale, 0.1 * scale, branchYaw, materials.treeTrunk, scene, index % 2 === 0 ? 0.12 : -0.1);
  }

  const leafClusters = [
    { id: "center", x: 0, y: 1.26, z: 0, w: 1.2, h: 1.05, yawOffset: 0 },
    { id: "front", x: 0.12, y: 1.12, z: -0.34, w: 0.96, h: 0.86, yawOffset: 0.62 },
    { id: "back", x: -0.1, y: 1.18, z: 0.34, w: 0.98, h: 0.88, yawOffset: -0.48 },
    { id: "left", x: -0.4, y: 1.16, z: 0.02, w: 0.92, h: 0.84, yawOffset: 1.18 },
    { id: "right", x: 0.42, y: 1.2, z: 0.08, w: 0.9, h: 0.82, yawOffset: -1.05 },
  ];

  for (const cluster of leafClusters) {
    const world = toHouseWorld(
      position,
      yaw,
      cluster.x * scale * shapeScale.x,
      cluster.y * scale * shapeScale.y,
      cluster.z * scale * shapeScale.z,
    );
    addCrossCards(
      `${name}-leaf-card-${cluster.id}`,
      world,
      cluster.w * scale * shapeScale.x,
      cluster.h * scale * shapeScale.y,
      yaw + cluster.yawOffset,
      materials.treeLeavesCard,
      scene,
    );
  }
}

const organicPatchTemplates: PatchPoint[][] = [
  [
    [-0.48, -0.46],
    [-0.18, -0.55],
    [0.18, -0.5],
    [0.5, -0.36],
    [0.55, -0.05],
    [0.45, 0.38],
    [0.1, 0.54],
    [-0.28, 0.48],
    [-0.55, 0.2],
    [-0.5, -0.2],
  ],
  [
    [-0.42, -0.52],
    [-0.08, -0.48],
    [0.24, -0.56],
    [0.52, -0.32],
    [0.46, -0.02],
    [0.56, 0.28],
    [0.22, 0.5],
    [-0.12, 0.55],
    [-0.5, 0.34],
    [-0.56, 0.02],
    [-0.48, -0.32],
  ],
  [
    [-0.54, -0.36],
    [-0.28, -0.52],
    [0.08, -0.48],
    [0.38, -0.54],
    [0.55, -0.2],
    [0.5, 0.16],
    [0.34, 0.5],
    [-0.06, 0.52],
    [-0.38, 0.44],
    [-0.55, 0.12],
  ],
];

function makeOrganicPatchPoints(width: number, depth: number, variant: number): PatchPoint[] {
  const template = organicPatchTemplates[variant % organicPatchTemplates.length];
  return template.map(([x, z]) => [x * width, z * depth]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function terrainVisualHeightAt(x: number, z: number): number {
  const nx = x / 18;
  const nz = z / 14;
  const radius = Math.sqrt(nx * nx + nz * nz);
  const roadNorth = Math.abs(nx + nz * 0.12) < 0.08 && nz < 0.62;
  const roadEast = Math.abs(nz - 0.16) < 0.08 && nx > -0.1;
  const roadSouthWest = Math.abs(nz - nx * 0.36) < 0.09 && nx < 0.15 && nz > -0.78;
  let value = 34 + clamp(radius - 0.35, 0, 1) * 110;
  if (roadNorth || roadEast || roadSouthWest) value = Math.min(value, 72);
  const shade = clamp(value, 20, 180);
  return -0.12 + (shade / 255) * 1.02;
}

function roadJitter(index: number, side: number): number {
  return Math.sin(index * 12.9898 + side * 78.233) * 0.11 + Math.sin(index * 4.17 + side * 1.9) * 0.05;
}

function sampleRoute(route: RoadRoutePoint[], stepsPerSegment: number): RoadRoutePoint[] {
  const samples: RoadRoutePoint[] = [];
  for (let segment = 0; segment < route.length - 1; segment += 1) {
    const a = route[segment];
    const b = route[segment + 1];
    for (let step = 0; step < stepsPerSegment; step += 1) {
      const t = step / stepsPerSegment;
      const eased = t * t * (3 - t * 2);
      samples.push({
        x: a.x + (b.x - a.x) * eased,
        z: a.z + (b.z - a.z) * eased,
        width: a.width + (b.width - a.width) * eased,
      });
    }
  }
  samples.push(route[route.length - 1]);
  return samples;
}

function addRoadRibbon(name: string, route: RoadRoutePoint[], scene: Scene, material: StandardMaterial): Mesh {
  const samples = sampleRoute(route, 8);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let traveled = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const current = samples[index];
    const previous = samples[Math.max(0, index - 1)];
    const next = samples[Math.min(samples.length - 1, index + 1)];
    if (index > 0) {
      const dx = current.x - previous.x;
      const dz = current.z - previous.z;
      traveled += Math.sqrt(dx * dx + dz * dz);
    }

    const tangentX = next.x - previous.x;
    const tangentZ = next.z - previous.z;
    const length = Math.max(0.001, Math.sqrt(tangentX * tangentX + tangentZ * tangentZ));
    const normalX = -tangentZ / length;
    const normalZ = tangentX / length;
    const leftWidth = current.width * 0.5 + roadJitter(index, -1);
    const rightWidth = current.width * 0.5 + roadJitter(index, 1);
    const leftX = current.x + normalX * leftWidth;
    const leftZ = current.z + normalZ * leftWidth;
    const rightX = current.x - normalX * rightWidth;
    const rightZ = current.z - normalZ * rightWidth;
    positions.push(leftX, terrainVisualHeightAt(leftX, leftZ) + 0.055, leftZ);
    positions.push(rightX, terrainVisualHeightAt(rightX, rightZ) + 0.055, rightZ);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, traveled / 5, 1, traveled / 5);
  }

  for (let index = 0; index < samples.length - 1; index += 1) {
    const left = index * 2;
    indices.push(left, left + 2, left + 1, left + 1, left + 2, left + 3);
  }

  const mesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.uvs = uvs;
  vertexData.applyToMesh(mesh);
  mesh.material = material;
  return mesh;
}

function addTerrainPatch(
  name: string,
  position: Vector3,
  width: number,
  depth: number,
  rotationY: number,
  scene: Scene,
  material: StandardMaterial,
  variant = 0,
): void {
  const points = makeOrganicPatchPoints(width, depth, variant);
  const mesh = new Mesh(name, scene);
  const positions = [0, 0, 0];
  const normals = [0, 1, 0];
  const uvs = [0.5, 0.5];
  const xs = points.map(([x]) => x);
  const zs = points.map(([, z]) => z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  for (const [x, z] of points) {
    positions.push(x, 0, z);
    normals.push(0, 1, 0);
    uvs.push((x - minX) / (maxX - minX), (z - minZ) / (maxZ - minZ));
  }

  const indices: number[] = [];
  for (let index = 1; index <= points.length; index += 1) {
    const next = index === points.length ? 1 : index + 1;
    indices.push(0, next, index);
  }

  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.uvs = uvs;
  vertexData.applyToMesh(mesh);
  mesh.position = position;
  mesh.rotation.y = rotationY;
  mesh.material = material;
}

function addGroundVegetation(scene: Scene, materials: CartoonMaterials): void {
  const bushes = [
    ["west-a", -7.2, -0.8, 0.75, 0.58, 0.3],
    ["west-b", -8.9, 1.7, 0.68, 0.52, -0.4],
    ["grove-a", 2.0, -4.65, 0.72, 0.55, 1.2],
    ["grove-b", 6.7, 4.2, 0.78, 0.58, -1.1],
  ] as const;
  for (const [id, x, z, width, height, yaw] of bushes) {
    addCrossCards(
      `bush-card-${id}`,
      new Vector3(x, terrainVisualHeightAt(x, z) + height * 0.5 + 0.04, z),
      width,
      height,
      yaw,
      materials.bushCard,
      scene,
    );
  }

  const grasses = [
    [-10.8, -4.8], [-9.6, -2.6], [-7.6, 3.3], [-5.9, 5.2],
    [-2.7, -7.4], [0.8, -6.1], [2.9, -5.5], [4.2, -4.4],
    [6.4, -3.4], [8.8, -1.2], [9.6, 2.9], [11.4, 5.1],
  ] as const;
  grasses.forEach(([x, z], index) => {
    const height = 0.66 + (index % 2) * 0.1;
    addCrossCards(
      `grass-card-meadow-${index}`,
      new Vector3(x, terrainVisualHeightAt(x, z) + height * 0.5 + 0.035, z),
      0.54 + (index % 3) * 0.08,
      height,
      index * 0.47,
      materials.grassCard,
      scene,
    );
  });
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

  addTerrainPatch("terrain-patch-sand-south-east", new Vector3(8.5, 0.035, -6.4), 7.2, 4.8, -0.15, scene, materials.terrainSand, 0);
  addTerrainPatch("terrain-patch-sand-village-grove", new Vector3(4.7, 0.041, -2.65), 4.3, 2.6, -0.28, scene, materials.terrainSand, 1);
  addRoadRibbon("terrain-road-main", [
    { x: -17.4, z: -11.4, width: 1.28 },
    { x: -11.2, z: -6.6, width: 1.42 },
    { x: -5.6, z: -2.8, width: 1.18 },
    { x: -0.8, z: 0.35, width: 1.52 },
    { x: 4.8, z: 2.0, width: 1.34 },
    { x: 10.2, z: 5.8, width: 1.18 },
    { x: 17.4, z: 10.6, width: 1.42 },
  ], scene, materials.terrainRoad);
  addRoadRibbon("terrain-road-spur-north-house", [
    { x: -0.8, z: 0.35, width: 0.72 },
    { x: -1.05, z: 1.8, width: 0.82 },
    { x: -1.2, z: 2.75, width: 0.68 },
  ], scene, materials.pathDirt);
  addRoadRibbon("terrain-road-spur-east-house", [
    { x: 4.8, z: 2.0, width: 0.76 },
    { x: 5.2, z: 2.15, width: 0.62 },
  ], scene, materials.pathDirt);
  addRoadRibbon("terrain-road-spur-south-west-house", [
    { x: -5.6, z: -2.8, width: 0.82 },
    { x: -4.95, z: -3.05, width: 0.66 },
  ], scene, materials.pathDirt);

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

  addTree("tree-north-west", new Vector3(-4.8, 0, 2.7), scene, materials, { scale: 1.05, yaw: 0.35, shape: "wide" });
  addTree("tree-south-east", new Vector3(6.55, 0, -2.1), scene, materials, { scale: 0.95, yaw: -0.6, shape: "round" });
  addTree("tree-village-grove-a", new Vector3(2.4, 0, -3.95), scene, materials, { scale: 0.82, yaw: 1.25, shape: "tall" });
  addTree("tree-village-grove-b", new Vector3(7.4, 0, 4.9), scene, materials, { scale: 1.1, yaw: -1.05, shape: "round" });
  addTree("tree-west-meadow", new Vector3(-8.35, 0, 0.85), scene, materials, { scale: 0.88, yaw: 2.1, shape: "tall" });
  addTree("tree-south-meadow", new Vector3(-1.7, 0, -6.4), scene, materials, { scale: 1.18, yaw: 0.75, shape: "wide" });
  addGroundVegetation(scene, materials);

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
