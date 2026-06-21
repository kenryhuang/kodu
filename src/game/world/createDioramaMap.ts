import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
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

type TreeVariant = "broad" | "tall" | "bent";

type LeafLobe = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
};

type TreeStyle = {
  readonly scale: number;
  readonly yaw: number;
  readonly variant: TreeVariant;
  readonly trunkLean: number;
  readonly canopy: LeafLobe[];
};

const treePresets: Record<TreeVariant, LeafLobe[]> = {
  broad: [
    { id: "core", x: 0.02, y: 1.28, z: 0, sx: 1.24, sy: 0.9, sz: 1.08 },
    { id: "front", x: 0.16, y: 1.12, z: -0.38, sx: 0.92, sy: 0.72, sz: 0.76 },
    { id: "back", x: -0.12, y: 1.18, z: 0.38, sx: 0.9, sy: 0.72, sz: 0.78 },
    { id: "left", x: -0.46, y: 1.16, z: 0.02, sx: 0.82, sy: 0.7, sz: 0.76 },
    { id: "right", x: 0.46, y: 1.2, z: 0.1, sx: 0.82, sy: 0.68, sz: 0.74 },
  ],
  tall: [
    { id: "base", x: 0, y: 1.18, z: 0.02, sx: 0.92, sy: 0.78, sz: 0.82 },
    { id: "mid", x: 0.08, y: 1.48, z: -0.04, sx: 0.82, sy: 0.86, sz: 0.74 },
    { id: "top", x: -0.04, y: 1.82, z: 0.04, sx: 0.68, sy: 0.8, sz: 0.62 },
    { id: "side", x: -0.36, y: 1.38, z: 0.12, sx: 0.66, sy: 0.62, sz: 0.62 },
  ],
  bent: [
    { id: "anchor", x: 0.06, y: 1.14, z: 0, sx: 0.98, sy: 0.76, sz: 0.86 },
    { id: "sweep", x: 0.46, y: 1.34, z: -0.12, sx: 0.92, sy: 0.72, sz: 0.78 },
    { id: "crown", x: 0.68, y: 1.62, z: 0.12, sx: 0.74, sy: 0.7, sz: 0.68 },
    { id: "tail", x: -0.28, y: 1.28, z: 0.24, sx: 0.7, sy: 0.62, sz: 0.64 },
  ],
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

function toTreeWorld(origin: Vector3, yaw: number, localX: number, localY: number, localZ: number): Vector3 {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return new Vector3(
    origin.x + localX * cos + localZ * sin,
    origin.y + localY,
    origin.z - localX * sin + localZ * cos,
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

function addAngledCylinder(
  name: string,
  start: Vector3,
  end: Vector3,
  diameterBottom: number,
  diameterTop: number,
  material: StandardMaterial,
  scene: Scene,
  tessellation = 7,
): void {
  const axis = end.subtract(start);
  const height = axis.length();
  if (height <= 0.001) return;

  const direction = axis.normalize();
  const mesh = MeshBuilder.CreateCylinder(name, {
    height,
    diameterBottom,
    diameterTop,
    tessellation,
  }, scene);
  mesh.position = start.add(end).scale(0.5);
  mesh.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.UpReadOnly, direction, new Quaternion());
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

function addLeafVolume(
  name: string,
  position: Vector3,
  radiusX: number,
  radiusY: number,
  radiusZ: number,
  yaw: number,
  material: StandardMaterial,
  scene: Scene,
  seed: number,
): void {
  const rings = 4;
  const segments = 9;
  const positions: number[] = [0, -radiusY * 0.58, 0];
  const uvs: number[] = [0.5, 1];
  const indices: number[] = [];

  for (let ring = 0; ring < rings; ring += 1) {
    const v = (ring + 1) / (rings + 1);
    const latitude = -Math.PI / 2 + v * Math.PI;
    const ringRadius = Math.cos(latitude);
    const y = Math.sin(latitude) * radiusY * 0.58;
    for (let segment = 0; segment < segments; segment += 1) {
      const theta = (segment / segments) * Math.PI * 2;
      const facet = 1 + Math.sin(theta * 2.7 + seed * 1.9 + ring * 0.8) * 0.075;
      const shoulder = 1 + Math.cos(theta * 1.6 + seed + ring * 0.55) * 0.055;
      positions.push(
        Math.cos(theta) * radiusX * 0.5 * ringRadius * facet,
        y,
        Math.sin(theta) * radiusZ * 0.5 * ringRadius * shoulder,
      );
      uvs.push(segment / segments, v);
    }
  }

  const topIndex = positions.length / 3;
  positions.push(0, radiusY * 0.62, 0);
  uvs.push(0.5, 0);

  for (let segment = 0; segment < segments; segment += 1) {
    const current = 1 + segment;
    const next = 1 + ((segment + 1) % segments);
    indices.push(0, current, next);
  }

  for (let ring = 0; ring < rings - 1; ring += 1) {
    const currentRing = 1 + ring * segments;
    const nextRing = currentRing + segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const current = currentRing + segment;
      const currentNext = currentRing + ((segment + 1) % segments);
      const next = nextRing + segment;
      const nextNext = nextRing + ((segment + 1) % segments);
      indices.push(current, next, currentNext, currentNext, next, nextNext);
    }
  }

  const lastRing = 1 + (rings - 1) * segments;
  for (let segment = 0; segment < segments; segment += 1) {
    const current = lastRing + segment;
    const next = lastRing + ((segment + 1) % segments);
    indices.push(current, topIndex, next);
  }

  const normals = new Array<number>(positions.length).fill(0);
  VertexData.ComputeNormals(positions, indices, normals);

  const mesh = new Mesh(name, scene);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  vertexData.uvs = uvs;
  vertexData.applyToMesh(mesh);
  mesh.position = position;
  mesh.rotation.y = yaw;
  mesh.material = material;
  mesh.convertToFlatShadedMesh();
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
  const variant = style.variant ?? "broad";
  const canopy = style.canopy ?? treePresets[variant];
  const trunkLean = style.trunkLean ?? (variant === "bent" ? 0.34 : variant === "tall" ? 0.16 : 0.2);

  const shadow = MeshBuilder.CreateCylinder(`${name}-shadow`, { height: 0.018, diameter: 1.45 * scale, tessellation: 18 }, scene);
  shadow.position = position.add(new Vector3(0, 0.014, 0));
  shadow.scaling.z = 0.58;
  shadow.rotation.y = yaw;
  shadow.material = materials.treeShadow;

  const lean = new Vector3(
    Math.cos(yaw + 0.35) * trunkLean * scale,
    0,
    Math.sin(yaw + 0.35) * trunkLean * scale,
  );
  const trunkStart = position.add(new Vector3(0, 0.06 * scale, 0));
  const trunkMid = position.add(new Vector3(lean.x * 0.42, 0.72 * scale, lean.z * 0.42));
  const trunkTop = position.add(new Vector3(lean.x, 1.08 * scale, lean.z));

  addAngledCylinder(`${name}-trunk-base`, trunkStart, trunkMid, 0.34 * scale, 0.22 * scale, materials.treeBark, scene, 7);
  addAngledCylinder(`${name}-trunk-upper`, trunkMid, trunkTop, 0.22 * scale, 0.14 * scale, materials.treeBark, scene, 7);

  addSimpleBox(
    `${name}-bark-highlight`,
    position.add(new Vector3(Math.cos(yaw + 2.2) * 0.12 * scale, 0.5 * scale, Math.sin(yaw + 2.2) * 0.12 * scale)),
    0.04 * scale,
    0.46 * scale,
    0.028 * scale,
    yaw + 0.18,
    materials.treeBarkLight,
    scene,
    0.06,
  );

  for (let index = 0; index < 4; index += 1) {
    const rootYaw = yaw + index * Math.PI * 0.5 + (index % 2 === 0 ? 0.18 : -0.12);
    const center = position.add(new Vector3(Math.cos(rootYaw) * 0.2 * scale, 0.08 * scale, Math.sin(rootYaw) * 0.2 * scale));
    addSimpleBox(`${name}-root-${index}`, center, 0.48 * scale, 0.08 * scale, 0.13 * scale, rootYaw, materials.treeBark, scene, index % 2 === 0 ? 0.04 : -0.04);
  }

  for (let index = 0; index < 4; index += 1) {
    const branchYaw = yaw + index * Math.PI * 0.5 + (index % 2 === 0 ? 0.28 : -0.18);
    const branchBaseY = (0.7 + index * 0.1) * scale;
    const branchStart = position.add(new Vector3(
      lean.x * (0.35 + index * 0.1),
      branchBaseY,
      lean.z * (0.35 + index * 0.1),
    ));
    const branchEnd = branchStart.add(new Vector3(
      Math.cos(branchYaw) * (0.48 - index * 0.04) * scale,
      (0.16 + (index % 2) * 0.08) * scale,
      Math.sin(branchYaw) * (0.48 - index * 0.04) * scale,
    ));
    addAngledCylinder(`${name}-branch-${index}`, branchStart, branchEnd, (0.12 - index * 0.012) * scale, (0.055 - index * 0.006) * scale, materials.treeBark, scene, 6);
  }

  canopy.forEach((lobe, index) => {
    const world = toTreeWorld(
      position,
      yaw,
      (lobe.x + lean.x * 0.35 / scale) * scale,
      lobe.y * scale,
      (lobe.z + lean.z * 0.35 / scale) * scale,
    );
    addLeafVolume(
      `${name}-style-${variant}-leaf-volume-${lobe.id}`,
      world,
      lobe.sx * scale,
      lobe.sy * scale,
      lobe.sz * scale,
      yaw + index * 0.23,
      materials.treeLeafMask,
      scene,
      index + scale * 11,
    );
    addVegetationCard(
      `${name}-style-${variant}-leaf-shell-${lobe.id}`,
      world.add(new Vector3(0, 0.02 * scale, 0)),
      lobe.sx * scale * 0.72,
      lobe.sy * scale * 0.82,
      yaw + index * 0.64,
      materials.treeLeafShell,
      scene,
      -0.08 + (index % 2) * 0.16,
    );
  });
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

function terrainPosition(x: number, z: number): Vector3 {
  return new Vector3(x, terrainVisualHeightAt(x, z), z);
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

  addTree("tree-north-west", terrainPosition(-4.8, 2.7), scene, materials, { scale: 1.05, yaw: 0.35, variant: "broad" });
  addTree("tree-south-east", terrainPosition(6.55, -2.1), scene, materials, { scale: 0.95, yaw: -0.6, variant: "bent" });
  addTree("tree-village-grove-a", terrainPosition(2.4, -3.95), scene, materials, { scale: 0.82, yaw: 1.25, variant: "tall" });
  addTree("tree-village-grove-b", terrainPosition(7.4, 4.9), scene, materials, { scale: 1.1, yaw: -1.05, variant: "broad" });
  addTree("tree-west-meadow", terrainPosition(-8.35, 0.85), scene, materials, { scale: 0.88, yaw: 2.1, variant: "tall" });
  addTree("tree-south-meadow", terrainPosition(-1.7, -6.4), scene, materials, { scale: 1.18, yaw: 0.75, variant: "bent" });
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
