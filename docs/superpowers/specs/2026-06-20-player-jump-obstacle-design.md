# Player Jump To Obstacles Design

## Summary

Add a lightweight jump ability to the current Kodu toy-diorama RPG slice. `Space` becomes jump, and mouse click remains fire. The player can jump in an arc, move horizontally while airborne, land back on the ground, and land on top of map obstacles when descending over them.

## Goals

- Make `Space` trigger jump only.
- Keep mouse click as the only fire input.
- Let the player jump onto existing rock obstacles.
- Preserve the current lightweight custom movement and collision model.
- Keep the implementation testable without adding a physics engine.

## Non-Goals

- No full platforming system.
- No ledge grabbing, wall jumping, slopes, moving platforms, or double jump.
- No new art assets.
- No physics dependency.

## Controls

- `Space`: jump.
- Mouse click: fire projectile.
- WASD and arrow keys: horizontal movement.

Holding `Space` should not repeatedly jump while airborne. A new jump can start only when the player is grounded on the floor or on an obstacle top.

## Movement Model

`PlayerController` owns jump state:

- `verticalVelocity`: current Y velocity.
- `grounded`: whether the player can jump.
- `surfaceHeight`: current support height for the player's feet.

The player keeps the existing horizontal movement and pointer aiming. Jump updates happen in the same `update(deltaSeconds, input)` flow:

1. Consume jump input.
2. If grounded, apply an upward velocity and mark airborne.
3. Apply gravity while airborne.
4. Move the capsule vertically.
5. Let collision resolve support height and landing.

The player mesh remains a capsule. Its resting center height is derived from the player capsule height and the current support surface.

## Obstacle Landing

Existing obstacles are AABB boxes with `center` and `halfExtents`.

The collision system should expose a narrow player vertical resolution method that:

- Computes each obstacle top as `center.y + halfExtents.y`.
- Checks whether the player's horizontal circular footprint overlaps an obstacle top area.
- While descending, snaps the player to the highest valid support under the player.
- Sets `grounded` when landing.
- Lets the player fall if they walk off the top.

Side collision behavior changes by state:

- Grounded on the floor: obstacles continue blocking the player horizontally.
- Airborne or standing on an obstacle: the player may pass over obstacle side walls as long as vertical support rules allow it.
- If the player descends beside an obstacle rather than over its top, they land on the floor.

## HUD And Debug

No HUD changes are required for the first jump slice. If useful during testing, the existing static `Ready` state can remain unchanged.

## Testing

Add Playwright coverage for the behavior users can observe:

- Pressing `Space` raises the player's Y position.
- Pressing `Space` does not create a projectile.
- Mouse click still creates and later removes a projectile.
- The player can jump onto an obstacle and settle at the obstacle top height.

Existing smoke tests should continue to pass.

## Risks And Constraints

- Jumping to obstacle tops is sensitive to camera perspective and obstacle placement, so tests should inspect player position through the exposed `__KODU_APP__` debug handle rather than relying only on screenshots.
- The current map has only two rock obstacles, so the implementation can support box-top landing without introducing a broader platform abstraction.
- Jump constants should be simple local values, not a new tuning system.
