import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { DioramaMap, Obstacle } from "../types";
import type { PlayerController } from "../player/PlayerController";
import type { NpcSystem } from "../npc/NpcSystem";
import type { ProjectileSystem } from "./ProjectileSystem";
import { clamp, normalizeHorizontal } from "../utils/math";

const collisionEpsilon = 0.0001;

function horizontalDistanceSquared(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function getObstacleBounds(obstacle: Obstacle): { minX: number; maxX: number; minZ: number; maxZ: number } {
  return {
    minX: obstacle.center.x - obstacle.halfExtents.x,
    maxX: obstacle.center.x + obstacle.halfExtents.x,
    minZ: obstacle.center.z - obstacle.halfExtents.z,
    maxZ: obstacle.center.z + obstacle.halfExtents.z,
  };
}

function resolveCircleAgainstObstacle(position: Vector3, radius: number, obstacle: Obstacle): Vector3 | undefined {
  const bounds = getObstacleBounds(obstacle);
  const closestX = clamp(position.x, bounds.minX, bounds.maxX);
  const closestZ = clamp(position.z, bounds.minZ, bounds.maxZ);
  const deltaX = position.x - closestX;
  const deltaZ = position.z - closestZ;
  const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;

  if (distanceSquared >= radius * radius) return undefined;

  if (distanceSquared > collisionEpsilon) {
    const distance = Math.sqrt(distanceSquared);
    const overlap = radius - distance;
    return new Vector3((deltaX / distance) * overlap, 0, (deltaZ / distance) * overlap);
  }

  const candidates = [
    new Vector3((bounds.minX - radius) - position.x, 0, 0),
    new Vector3((bounds.maxX + radius) - position.x, 0, 0),
    new Vector3(0, 0, (bounds.minZ - radius) - position.z),
    new Vector3(0, 0, (bounds.maxZ + radius) - position.z),
  ];

  return candidates.reduce((best, candidate) => (candidate.lengthSquared() < best.lengthSquared() ? candidate : best));
}

export class CollisionSystem {
  resolvePlayerObstacles(player: PlayerController, map: DioramaMap): void {
    for (let pass = 0; pass < 3; pass += 1) {
      let moved = false;
      for (const obstacle of map.obstacles) {
        const pushOut = resolveCircleAgainstObstacle(player.position, player.radius, obstacle);
        if (!pushOut) continue;
        player.position.addInPlace(pushOut);
        moved = true;
      }
      if (!moved) break;
    }
  }

  resolveProjectileHits(projectiles: ProjectileSystem, npcs: NpcSystem): void {
    for (const projectile of [...projectiles.projectiles]) {
      if (projectile.age < 0.35) continue;
      for (const npc of [...npcs.npcs]) {
        const hitDistance = projectile.radius + npc.radius;
        if (horizontalDistanceSquared(projectile.mesh.position, npc.mesh.position) <= hitDistance * hitDistance) {
          const direction = normalizeHorizontal(npc.mesh.position.subtract(projectile.mesh.position));
          npcs.applyHit(npc, direction.lengthSquared() > 0 ? direction : projectile.direction, 1, 4.8);
          projectiles.remove(projectile);
          break;
        }
      }
    }
  }
}
