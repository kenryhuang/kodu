import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type Obstacle = {
  readonly name: string;
  readonly center: Vector3;
  readonly halfExtents: Vector3;
  readonly mesh: Mesh;
};

export type DioramaMap = {
  readonly bounds: {
    readonly minX: number;
    readonly maxX: number;
    readonly minZ: number;
    readonly maxZ: number;
  };
  readonly obstacles: Obstacle[];
};

export type DebugStats = {
  npcCount: number;
  projectileCount: number;
  playerHealth: number;
  playerState: string;
};
