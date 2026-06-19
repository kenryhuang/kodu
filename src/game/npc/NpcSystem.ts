import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import type { CartoonMaterials } from "../world/createMaterials";

export type Npc = {
  readonly mesh: Mesh;
  readonly radius: number;
  velocity: Vector3;
  health: number;
  hitTimer: number;
};

export class NpcSystem {
  readonly npcs: Npc[] = [];

  constructor(private readonly scene: Scene, private readonly materials: CartoonMaterials) {
    [
      new Vector3(-2.4, 0.52, 2.0),
      new Vector3(2.2, 0.52, 1.4),
      new Vector3(3.6, 0.52, -2.1),
    ].forEach((position, index) => this.spawn(`npc-${index + 1}`, position));
  }

  update(deltaSeconds: number): void {
    for (const npc of this.npcs) {
      npc.mesh.position.addInPlace(npc.velocity.scale(deltaSeconds));
      npc.velocity.scaleInPlace(Math.pow(0.08, deltaSeconds));
      npc.hitTimer = Math.max(0, npc.hitTimer - deltaSeconds);
      const material = npc.mesh.material;
      if (material && "diffuseColor" in material) {
        material.diffuseColor = npc.hitTimer > 0 ? new Color3(1, 0.85, 0.45) : this.materials.npc.diffuseColor;
      }
    }
  }

  applyHit(npc: Npc, direction: Vector3, damage: number, knockback: number): void {
    npc.health -= damage;
    npc.hitTimer = 0.12;
    npc.velocity.addInPlace(direction.scale(knockback));
    if (npc.health <= 0) {
      npc.mesh.dispose();
      const index = this.npcs.indexOf(npc);
      if (index >= 0) this.npcs.splice(index, 1);
    }
  }

  dispose(): void {
    this.npcs.forEach((npc) => npc.mesh.dispose());
    this.npcs.length = 0;
  }

  private spawn(name: string, position: Vector3): void {
    const mesh = MeshBuilder.CreateCapsule(name, { height: 0.95, radius: 0.32, tessellation: 8 }, this.scene);
    mesh.position = position.clone();
    mesh.material = this.materials.npc.clone(`${name}-mat`);
    this.npcs.push({ mesh, radius: 0.42, velocity: Vector3.Zero(), health: 3, hitTimer: 0 });
  }
}
