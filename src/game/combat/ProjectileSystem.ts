import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import type { CartoonMaterials } from "../world/createMaterials";
import { normalizeHorizontal } from "../utils/math";

export type Projectile = {
  readonly mesh: Mesh;
  readonly radius: number;
  readonly direction: Vector3;
  life: number;
};

export class ProjectileSystem {
  readonly projectiles: Projectile[] = [];

  constructor(private readonly scene: Scene, private readonly materials: CartoonMaterials) {}

  spawn(origin: Vector3, direction: Vector3): void {
    const mesh = MeshBuilder.CreateSphere("projectile", { diameter: 0.28, segments: 10 }, this.scene);
    mesh.position = origin.clone();
    mesh.material = this.materials.projectile;
    this.projectiles.push({
      mesh,
      radius: 0.18,
      direction: normalizeHorizontal(direction),
      life: 1.4,
    });
  }

  update(deltaSeconds: number): void {
    const speed = 7.5;
    for (const projectile of [...this.projectiles]) {
      projectile.mesh.position.addInPlace(projectile.direction.scale(speed * deltaSeconds));
      projectile.life -= deltaSeconds;
      if (projectile.life <= 0) this.remove(projectile);
    }
  }

  remove(projectile: Projectile): void {
    projectile.mesh.dispose();
    const index = this.projectiles.indexOf(projectile);
    if (index >= 0) this.projectiles.splice(index, 1);
  }

  dispose(): void {
    this.projectiles.forEach((projectile) => projectile.mesh.dispose());
    this.projectiles.length = 0;
  }
}
