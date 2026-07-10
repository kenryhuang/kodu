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

function makeRockObstacle(name: string, center: Vector3, halfExtents: Vector3, scene: Scene, materials: CartoonMaterials, seed: number): Obstacle {
  const hx = halfExtents.x;
  const hy = halfExtents.y;
  const hz = halfExtents.z;
  const wobble = (index: number, amount: number) => Math.sin(seed * 12.9898 + index * 78.233) * amount;
  const positions = [
    -hx * (0.92 + wobble(1, 0.08)), -hy, -hz * (0.86 + wobble(2, 0.09)),
    hx * (0.82 + wobble(3, 0.08)), -hy * 0.9, -hz * (0.94 + wobble(4, 0.08)),
    hx * (0.98 + wobble(5, 0.06)), -hy, hz * (0.82 + wobble(6, 0.08)),
    -hx * (0.84 + wobble(7, 0.08)), -hy * 0.86, hz * (0.96 + wobble(8, 0.06)),
    -hx * (0.68 + wobble(9, 0.08)), hy * (0.76 + wobble(10, 0.04)), -hz * (0.62 + wobble(11, 0.08)),
    hx * (0.58 + wobble(12, 0.08)), hy * (0.92 + wobble(13, 0.04)), -hz * (0.7 + wobble(14, 0.08)),
    hx * (0.72 + wobble(15, 0.06)), hy * (0.7 + wobble(16, 0.06)), hz * (0.58 + wobble(17, 0.08)),
    -hx * (0.62 + wobble(18, 0.08)), hy * (0.84 + wobble(19, 0.05)), hz * (0.66 + wobble(20, 0.08)),
    wobble(21, hx * 0.12), hy * 1.08, wobble(22, hz * 0.12),
  ];
  const indices = [
    0, 1, 2, 0, 2, 3,
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0,
    4, 8, 5,
    5, 8, 6,
    6, 8, 7,
    7, 8, 4,
  ];
  for (let index = 0; index < indices.length; index += 3) {
    const swap = indices[index + 1];
    indices[index + 1] = indices[index + 2];
    indices[index + 2] = swap;
  }
  const uvs: number[] = [];
  for (let index = 0; index < positions.length; index += 3) {
    uvs.push(
      0.5 + positions[index] / (hx * 2.25) + seed * 0.07,
      0.5 + positions[index + 2] / (hz * 2.25) + seed * 0.05,
    );
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
  mesh.position.copyFrom(center);
  mesh.material = materials.stone;
  mesh.convertToFlatShadedMesh();
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

function addLeafSprig(
  prefix: string,
  position: Vector3,
  width: number,
  height: number,
  yaw: number,
  material: StandardMaterial,
  scene: Scene,
  pitch = 0,
): void {
  addVegetationCard(`${prefix}-front`, position, width, height, yaw, material, scene, pitch);
  addVegetationCard(
    `${prefix}-side`,
    position.add(new Vector3(0, height * 0.04, 0)),
    width * 0.86,
    height * 0.92,
    yaw + Math.PI / 2,
    material,
    scene,
    -pitch * 0.75,
  );
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

function addHouseFoundationStones(
  name: string,
  center: Vector3,
  halfExtents: Vector3,
  yaw: number,
  scene: Scene,
  materials: CartoonMaterials,
): void {
  const addCourse = (face: HouseFace, count: number, span: number): void => {
    for (let index = 0; index < count; index += 1) {
      const normalized = (index + 0.5) / count - 0.5;
      const width = (span / count) * (0.78 + (index % 2) * 0.08);
      const height = 0.14 + (index % 3) * 0.018;
      addFaceDetail(
        `house-foundation-stone-${name}-${face}-${index}`,
        face,
        center,
        halfExtents,
        yaw,
        normalized * span,
        0.02,
        width,
        height,
        0.075,
        materials.houseFoundationStone,
        scene,
      );
    }
  };

  addCourse("front", 5, halfExtents.x * 1.82);
  addCourse("left", 4, halfExtents.z * 1.72);
  addCourse("right", 4, halfExtents.z * 1.72);
}

function addHouseWallWeathering(
  name: string,
  center: Vector3,
  halfExtents: Vector3,
  yaw: number,
  scene: Scene,
  materials: CartoonMaterials,
): void {
  const panels = [
    ["front", -0.44, 1.48, 0.34, 0.18],
    ["front", 0.46, 0.18, 0.42, 0.12],
    ["left", -0.18, 1.38, 0.3, 0.18],
    ["right", 0.22, 0.2, 0.36, 0.14],
  ] as const;

  panels.forEach(([face, along, bottom, width, height], index) => {
    addFaceDetail(
      `house-wall-weathering-${name}-${index}`,
      face,
      center,
      halfExtents,
      yaw,
      along,
      bottom,
      width,
      height,
      0.035,
      materials.houseWeathering,
      scene,
    );
  });
}

function addHouseRoofMaterialDetails(
  name: string,
  center: Vector3,
  halfExtents: Vector3,
  yaw: number,
  style: HouseStyle,
  scene: Scene,
  materials: CartoonMaterials,
): void {
  const battenRows = Math.max(3, style.roofTileRows);
  for (let row = 0; row < battenRows; row += 1) {
    const y = center.y + halfExtents.y + 0.3 + row * 0.105;
    const z = 0.3 + row * 0.065;
    const width = halfExtents.x * 2.25 - row * 0.055;
    addDetailBox(`house-roof-batten-${name}-front-${row}`, center, yaw, 0, y, -z, width, 0.03, 0.035, materials.houseTrim, scene);
    addDetailBox(`house-roof-batten-${name}-back-${row}`, center, yaw, 0, y, z, width, 0.03, 0.035, materials.houseTrim, scene);
  }

  for (let index = 0; index < 2; index += 1) {
    const side = index === 0 ? -1 : 1;
    addDetailBox(
      `house-roof-moss-${name}-${index}`,
      center,
      yaw,
      -halfExtents.x * 0.28 + index * halfExtents.x * 0.45,
      center.y + halfExtents.y + 0.38 + index * 0.08,
      side * (halfExtents.z * 0.34 + 0.04),
      halfExtents.x * 0.72,
      0.028,
      0.052,
      materials.houseRoofMoss,
      scene,
    );
  }
}

function addHouseDoorHardware(
  name: string,
  center: Vector3,
  halfExtents: Vector3,
  yaw: number,
  style: HouseStyle,
  scene: Scene,
  materials: CartoonMaterials,
): void {
  const hingeX = style.doorX - style.doorWidth * 0.42;
  addFaceDetail(`house-door-hardware-${name}-hinge-low`, "front", center, halfExtents, yaw, hingeX, 0.18, 0.04, 0.13, 0.09, materials.houseDoorHardware, scene);
  addFaceDetail(`house-door-hardware-${name}-hinge-high`, "front", center, halfExtents, yaw, hingeX, 0.57, 0.04, 0.13, 0.09, materials.houseDoorHardware, scene);
  addFaceDetail(`house-door-hardware-${name}-latch`, "front", center, halfExtents, yaw, style.doorX + style.doorWidth * 0.24, 0.39, 0.16, 0.035, 0.092, materials.houseDoorHardware, scene);
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

  for (let index = 0; index < 3; index += 1) {
    const ridgeYaw = yaw + index * Math.PI * 0.66 + 0.14;
    const offset = new Vector3(
      Math.cos(ridgeYaw) * 0.13 * scale,
      0,
      Math.sin(ridgeYaw) * 0.13 * scale,
    );
    const ridgeStart = trunkStart.add(offset).add(new Vector3(0, 0.08 * scale, 0));
    const ridgeEnd = trunkTop.add(offset.scale(0.46)).add(new Vector3(lean.x * 0.12, -0.08 * scale, lean.z * 0.12));
    addAngledCylinder(
      `tree-bark-ridge-${name}-${index}`,
      ridgeStart,
      ridgeEnd,
      0.035 * scale,
      0.018 * scale,
      materials.treeBarkRidge,
      scene,
      5,
    );
  }

  for (let index = 0; index < 4; index += 1) {
    const rootYaw = yaw + index * Math.PI * 0.5 + (index % 2 === 0 ? 0.18 : -0.12);
    const center = position.add(new Vector3(Math.cos(rootYaw) * 0.2 * scale, 0.08 * scale, Math.sin(rootYaw) * 0.2 * scale));
    addSimpleBox(`${name}-root-${index}`, center, 0.48 * scale, 0.08 * scale, 0.13 * scale, rootYaw, materials.treeBark, scene, index % 2 === 0 ? 0.04 : -0.04);
  }

  for (let index = 0; index < 2; index += 1) {
    const clutterYaw = yaw + index * Math.PI * 0.85 + 0.3;
    const clutterHeight = (0.42 + index * 0.08) * scale;
    addCrossCards(
      `tree-base-clutter-${name}-${index}`,
      position.add(new Vector3(Math.cos(clutterYaw) * 0.34 * scale, clutterHeight * 0.5 + 0.05 * scale, Math.sin(clutterYaw) * 0.34 * scale)),
      0.34 * scale,
      clutterHeight,
      clutterYaw,
      materials.groundDetailGrass,
      scene,
    );
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
    const lobeLeanX = lean.x * 0.35 / scale;
    const lobeLeanZ = lean.z * 0.35 / scale;
    const sprigs = [
      { id: "core", x: 0, y: 0.02, z: 0, w: 0.44, h: 0.42, yawOffset: 0, material: materials.treeLeafMask, pitch: -0.08 },
      { id: "upper", x: -0.16, y: 0.15, z: 0.07, w: 0.34, h: 0.36, yawOffset: 0.74, material: materials.treeLeafShell, pitch: 0.08 },
      { id: "outer", x: 0.18, y: -0.03, z: -0.12, w: 0.36, h: 0.34, yawOffset: -0.56, material: materials.treeLeafMask, pitch: 0.12 },
      { id: "lower", x: -0.04, y: -0.16, z: 0.16, w: 0.32, h: 0.32, yawOffset: 1.38, material: materials.treeLeafShell, pitch: -0.16 },
    ] as const;

    sprigs.forEach((sprig, sprigIndex) => {
      const spreadYaw = yaw + index * 0.7 + sprigIndex * 1.25;
      const world = toTreeWorld(
        position,
        yaw,
        (lobe.x + lobeLeanX + sprig.x * lobe.sx) * scale,
        (lobe.y + sprig.y * lobe.sy) * scale,
        (lobe.z + lobeLeanZ + sprig.z * lobe.sz) * scale,
      );
      addLeafSprig(
        `tree-leaf-sprig-${name}-${lobe.id}-${sprig.id}`,
        world,
        lobe.sx * sprig.w * scale,
        lobe.sy * sprig.h * scale,
        spreadYaw + sprig.yawOffset,
        sprig.material,
        scene,
        sprig.pitch,
      );
    });
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

function makeSoftPatchPoints(width: number, depth: number, variant: number, pointCount: number): PatchPoint[] {
  const points: PatchPoint[] = [];
  for (let index = 0; index < pointCount; index += 1) {
    const angle = (index / pointCount) * Math.PI * 2;
    const slowWave = Math.sin(angle * 2.6 + variant * 1.7) * 0.055;
    const fineWave = Math.sin(angle * 5.2 + variant * 0.9) * 0.035;
    const radius = 0.47 + slowWave + fineWave;
    points.push([
      Math.cos(angle) * width * radius,
      Math.sin(angle) * depth * radius,
    ]);
  }
  return points;
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
  softPointCount = 0,
): void {
  const points = softPointCount > 0
    ? makeSoftPatchPoints(width, depth, variant, softPointCount)
    : makeOrganicPatchPoints(width, depth, variant);
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
    [-12.2, -5.4], [-9.4, -2.1], [-7.6, 4.1], [-4.4, 5.8],
    [-2.8, -8.1], [1.2, -6.2], [4.1, -4.6], [8.6, -1.4],
    [10.3, 3.4], [12.0, 5.8],
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

function addConceptGroundDetails(scene: Scene, materials: CartoonMaterials): void {
  const clumpSeeds = [
    [-13.0, -7.2], [-11.3, -3.9], [-9.8, 3.4], [-7.6, 5.7], [-5.4, -6.8],
    [-3.2, 4.9], [-1.9, -8.3], [1.6, 5.9], [3.6, -5.5], [6.4, 6.6],
    [8.3, -7.0], [10.8, 2.8], [13.2, -0.8], [14.1, 6.0],
  ] as const;
  clumpSeeds.forEach(([x, z], index) => {
    const height = 0.38 + (index % 4) * 0.06;
    addCrossCards(
      `ground-detail-clump-${index}`,
      new Vector3(x, terrainVisualHeightAt(x, z) + height * 0.5 + 0.04, z),
      0.36 + (index % 3) * 0.08,
      height,
      index * 0.61,
      materials.groundDetailGrass,
      scene,
    );
  });

  const flowerSeeds = [
    [-13.4, -2.9], [-12.1, 4.5], [-9.8, -6.4], [-8.2, 2.4], [-6.8, 6.2],
    [-4.4, -5.2], [-2.6, 5.8], [1.0, 4.6], [2.7, -5.9], [5.9, -4.2],
    [7.4, 3.5], [10.6, 2.7], [13.5, 4.0], [14.2, -5.0], [-14.0, 1.0],
  ] as const;
  flowerSeeds.forEach(([x, z], index) => {
    const flower = MeshBuilder.CreateSphere(`wildflower-card-${index}`, {
      diameter: 0.09 + (index % 3) * 0.018,
      segments: 5,
    }, scene);
    flower.position = new Vector3(x, terrainVisualHeightAt(x, z) + 0.12, z);
    flower.scaling.y = 0.42;
    flower.material = index % 3 === 0 ? materials.wildflowerYellow : materials.wildflowerPurple;
  });

  const pebbleSeeds = [
    [-14.1, -5.4], [-12.5, 3.1], [-10.6, 5.8], [-8.4, -7.2], [-7.0, 0.6],
    [-4.1, -4.4], [-2.1, 3.8], [0.7, -7.7], [3.8, -5.5], [5.1, 5.7],
    [8.2, 4.4], [9.7, -6.2], [12.4, -3.2], [-13.0, 7.1], [14.5, -0.9],
  ] as const;
  pebbleSeeds.forEach(([x, z], index) => {
    const pebble = MeshBuilder.CreateSphere(`pebble-detail-${index}`, {
      diameter: 0.18 + (index % 4) * 0.035,
      segments: 5,
    }, scene);
    pebble.position = new Vector3(x, terrainVisualHeightAt(x, z) + 0.06, z);
    pebble.scaling.y = 0.42 + (index % 3) * 0.08;
    pebble.rotation.y = index * 0.53;
    pebble.material = materials.pebble;
    pebble.convertToFlatShadedMesh();
  });
}

function addStoneClusterPieces(scene: Scene, materials: CartoonMaterials): void {
  const pieces = [
    [-3.92, -1.82, 0.26, 0.42, 0.32, -0.2],
    [-3.64, -0.72, 0.18, 0.36, 0.28, 0.5],
    [-2.42, -1.96, 0.22, 0.34, 0.3, 1.1],
    [-2.16, -0.9, 0.16, 0.28, 0.24, -0.7],
    [-3.18, -2.28, 0.2, 0.32, 0.24, 0.8],
    [-4.18, -1.1, 0.17, 0.3, 0.22, 1.7],
    [2.38, 0.58, 0.2, 0.34, 0.26, -0.3],
    [3.92, 0.78, 0.24, 0.38, 0.3, 0.6],
    [2.74, 1.96, 0.18, 0.32, 0.25, 1.2],
    [3.66, 1.86, 0.16, 0.3, 0.22, -1.1],
    [2.2, 1.32, 0.15, 0.26, 0.2, 2.0],
    [4.18, 1.42, 0.19, 0.31, 0.23, -2.3],
  ] as const;

  pieces.forEach(([x, z, diameter, scaleX, scaleZ, yaw], index) => {
    const scaleY = 0.38 + (index % 3) * 0.07;
    const piece = MeshBuilder.CreateSphere(`stone-cluster-piece-${index}`, {
      diameter,
      segments: 5,
    }, scene);
    piece.position = new Vector3(x, terrainVisualHeightAt(x, z) + diameter * scaleY * 0.52, z);
    piece.scaling = new Vector3(scaleX, scaleY, scaleZ);
    piece.rotation.y = yaw;
    piece.material = materials.stoneCluster;
    piece.convertToFlatShadedMesh();
  });
}

function addFenceSegment(name: string, position: Vector3, length: number, rotationY: number, scene: Scene, materials: CartoonMaterials): void {
  const rail = MeshBuilder.CreateBox(name, { width: length, height: 0.16, depth: 0.08 }, scene);
  rail.position = position;
  rail.rotation.y = rotationY;
  rail.material = materials.fenceWood;
}

function addAtlasTreeCards(scene: Scene, materials: CartoonMaterials): void {
  const cameraFacingYaw = -0.76;
  const trees = [
    {
      id: "oak-large",
      x: -5.8,
      z: -2.9,
      width: 2.35,
      height: 2.5,
      material: materials.atlasTreeOakLarge,
    },
    {
      id: "pine-small",
      x: 5.9,
      z: 3.4,
      width: 1.05,
      height: 1.45,
      material: materials.atlasTreePineSmall,
    },
    {
      id: "round-small",
      x: 7.2,
      z: -2.7,
      width: 1.18,
      height: 1.4,
      material: materials.atlasTreeRoundSmall,
    },
  ] as const;

  for (const tree of trees) {
    addVegetationCard(
      `atlas-tree-card-${tree.id}`,
      new Vector3(tree.x, terrainVisualHeightAt(tree.x, tree.z) + tree.height * 0.5 + 0.03, tree.z),
      tree.width,
      tree.height,
      cameraFacingYaw,
      tree.material,
      scene,
    );
  }
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
  addAtlasTreeCards(scene, materials);

  return {
    bounds: { minX: -17.2, maxX: 17.2, minZ: -13.2, maxZ: 13.2 },
    obstacles: [],
  };
}
