import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { CartoonMaterials } from "../world/createMaterials";
import type { DioramaMap } from "../types";
import type { InputManager } from "../input/InputManager";
import { clamp, normalizeHorizontal } from "../utils/math";

export type FireRequest = {
  readonly origin: Vector3;
  readonly direction: Vector3;
};

export class PlayerController {
  readonly mesh;
  readonly radius = 0.42;
  health = 5;
  private facing = new Vector3(1, 0, 0);
  private fireCooldown = 0;
  private readonly baseCenterHeight = 0.62;
  private readonly maxJumpHeight = 1.8;
  private readonly jumpVelocity = 5.6;
  private readonly gravity = 13;
  private verticalVelocity = 0;
  private grounded = true;
  private currentSurfaceHeight = 0;
  private jumpStartSurfaceHeight = 0;
  private lastFootHeight = 0;

  constructor(scene: Scene, materials: CartoonMaterials, private readonly map: DioramaMap) {
    this.mesh = MeshBuilder.CreateCapsule("player", { height: 1.15, radius: 0.34, tessellation: 10 }, scene);
    this.mesh.position.set(0, this.baseCenterHeight, 0);
    this.mesh.material = materials.player;
  }

  update(deltaSeconds: number, input: InputManager): FireRequest | undefined {
    this.lastFootHeight = this.footHeight;

    const move = normalizeHorizontal(new Vector3(input.moveX, 0, input.moveZ));
    if (move.lengthSquared() > 0) {
      this.facing.copyFrom(move);
      const speed = 4.2;
      this.mesh.position.x += move.x * speed * deltaSeconds;
      this.mesh.position.z += move.z * speed * deltaSeconds;
      this.clampToBounds();
    }

    if (input.consumeJump() && this.grounded) {
      this.jumpStartSurfaceHeight = this.currentSurfaceHeight;
      this.verticalVelocity = this.jumpVelocity;
      this.grounded = false;
    }

    if (!this.grounded || this.verticalVelocity !== 0) {
      this.verticalVelocity -= this.gravity * deltaSeconds;
      this.mesh.position.y += this.verticalVelocity * deltaSeconds;

      const floorCenterY = this.baseCenterHeight;
      if (this.mesh.position.y <= floorCenterY && this.verticalVelocity <= 0) {
        this.landOnSurface(0);
      }
    }

    const aimDirection = input.getPointerAimDirection(this.mesh.position);
    if (aimDirection) {
      this.facing.copyFrom(aimDirection);
    }

    if (move.lengthSquared() > 0 || aimDirection) {
      this.mesh.rotation.y = Math.atan2(this.facing.x, this.facing.z);
    }

    this.fireCooldown = Math.max(0, this.fireCooldown - deltaSeconds);
    if (input.consumeFire() && this.fireCooldown <= 0) {
      this.fireCooldown = 0.28;
      const direction = aimDirection ?? this.facing.clone();
      this.facing.copyFrom(direction);
      this.mesh.rotation.y = Math.atan2(this.facing.x, this.facing.z);
      return {
        origin: this.mesh.position.add(new Vector3(this.facing.x * 0.55, 0.15, this.facing.z * 0.55)),
        direction,
      };
    }
    return undefined;
  }

  get position(): Vector3 {
    return this.mesh.position;
  }

  get isGrounded(): boolean {
    return this.grounded;
  }

  get isGroundedOnFloor(): boolean {
    return this.grounded && this.currentSurfaceHeight <= 0.0001;
  }

  get isDescending(): boolean {
    return this.verticalVelocity <= 0;
  }

  get footHeight(): number {
    return this.mesh.position.y - this.baseCenterHeight;
  }

  get previousFootHeight(): number {
    return this.lastFootHeight;
  }

  get surfaceHeight(): number {
    return this.currentSurfaceHeight;
  }

  canLandOnSurface(surfaceHeight: number): boolean {
    return surfaceHeight <= this.jumpStartSurfaceHeight + this.maxJumpHeight + 0.0001;
  }

  landOnSurface(surfaceHeight: number): void {
    this.currentSurfaceHeight = surfaceHeight;
    this.mesh.position.y = surfaceHeight + this.baseCenterHeight;
    this.verticalVelocity = 0;
    this.grounded = true;
  }

  startFalling(): void {
    if (!this.grounded) return;
    this.jumpStartSurfaceHeight = this.currentSurfaceHeight;
    this.grounded = false;
    this.verticalVelocity = 0;
  }

  clampToBounds(): void {
    const minX = this.map.bounds.minX + this.radius;
    const maxX = this.map.bounds.maxX - this.radius;
    const minZ = this.map.bounds.minZ + this.radius;
    const maxZ = this.map.bounds.maxZ - this.radius;
    this.mesh.position.x = clamp(this.mesh.position.x, minX, maxX);
    this.mesh.position.z = clamp(this.mesh.position.z, minZ, maxZ);
  }
}
