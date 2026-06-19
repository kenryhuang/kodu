import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function horizontalLength(vector: Vector3): number {
  return Math.hypot(vector.x, vector.z);
}

export function normalizeHorizontal(vector: Vector3): Vector3 {
  const length = horizontalLength(vector);
  if (length <= 0.0001) return Vector3.Zero();
  return new Vector3(vector.x / length, 0, vector.z / length);
}
