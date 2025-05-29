import { Player, Projectile } from "./GameState";
import { ShipDesignsMap, controlTypes } from "./ShipDesigns";
import { projectileTypes } from "./ShipDesignTypes";
import { GameConfig } from "./config";
import { CollisionManager } from "./CollisionManager";

/**
 * Handles physics updates for players (movement, collisions, and firing).
 */
export class PhysicsEngine {
  constructor(
    private config: GameConfig,
    private collisionManager: CollisionManager
  ) {}

  /**
   * Updates a single player's physics and firing for the game loop.
   */
  updatePlayer(
    sessionId: string,
    player: Player,
    deltaTime: number,
    elapsedTime: number,
    projectiles: Projectile[]
  ): void {
    const playerType = ShipDesignsMap.get(player.shipType);
    if (!playerType) { return; }

    let drag = this.config.physics.drag;
    if (playerType.controlType === controlTypes.tank) {
      drag = 0;
    }

    const newVx =
      player.vx +
      Math.cos(player.direction) * player.accel +
      drag * player.vx;
    const newVy =
      player.vy +
      Math.sin(player.direction) * player.accel +
      drag * player.vy;
    const newX = player.x + newVx * deltaTime;
    const newY = player.y + newVy * deltaTime;

    const correction = this.collisionManager.checkForRockCollision(
      player.x,
      player.y,
      newX,
      newY,
      newVx,
      newVy,
      playerType.collisionRadius,
      1
    );
    player.vx = correction.vx;
    player.vy = correction.vy;
    player.x = correction.newX;
    player.y = correction.newY;

    player.direction += player.vr * deltaTime;

    const boundary = this.config.gridSize * this.config.cellSize;
    if (player.x > boundary) player.x = 0;
    else if (player.x < 0) player.x = boundary;
    if (player.y > boundary) player.y = 0;
    else if (player.y < 0) player.y = boundary;
    player.direction = (player.direction + 2 * Math.PI) % (2 * Math.PI);

    if (
      player.firing &&
      elapsedTime - player.lastFired >= playerType.fireDelayInterval
    ) {
      const projX =
        player.x + Math.cos(player.direction) * playerType.collisionRadius;
      const projY =
        player.y + Math.sin(player.direction) * playerType.collisionRadius;
      const projVx =
        Math.cos(player.direction) * this.config.physics.laserSpeed + player.vx;
      const projVy =
        Math.sin(player.direction) * this.config.physics.laserSpeed + player.vy;

      if (playerType.firesLasers) {
        projectiles.push(
          new Projectile(
            projX,
            projY,
            projVx,
            projVy,
            player.direction,
            sessionId,
            projectileTypes.Laser
          )
        );
      } else if (playerType.firesCannonballs) {
        projectiles.push(
          new Projectile(
            projX,
            projY,
            projVx,
            projVy,
            player.direction,
            sessionId,
            projectileTypes.Cannonball
          )
        );
      }
      player.lastFired = elapsedTime;
    }
  }
}