import type { SimpleGameLogic } from "./SimpleGameLogic";
import { Player, Projectile } from "./GameState";
import { ShipDesignsMap } from "./ShipDesigns";
import { generateLogWithTimestamp } from "./ServerTools";
import { GameConfig } from "./config";
import { CollisionManager } from "./CollisionManager";

/**
 * Manages projectile movement, collisions with rocks and players,
 * applies damage, respawns and scoring, and filters active projectiles.
 */
export class ProjectileManager {
  constructor(
    private logic: SimpleGameLogic,
    private config: GameConfig,
    private collisionManager: CollisionManager
  ) {}

  /**
   * Update all projectiles for the game cycle and apply hits.
   * @returns filtered list of active projectiles
   */
  updateAll(
    deltaTime: number,
    elapsedTime: number,
    projectiles: Projectile[],
    players: Map<string, Player>
  ): Projectile[] {
    const alive: Projectile[] = [];
    const boundary = this.config.gridSize * this.config.cellSize;

    // Move and collide with rocks
    for (const proj of projectiles) {
      const newX = proj.x + proj.vx * deltaTime;
      const newY = proj.y + proj.vy * deltaTime;
      proj.remainingTime -= deltaTime;

      const collision = this.collisionManager.checkForRockCollision(
        proj.x,
        proj.y,
        newX,
        newY,
        proj.vx,
        proj.vy,
        1,
        this.config.projectiles.laserDamage
      );

      proj.x = newX;
      proj.y = newY;
      const inBounds = proj.x >= 0 && proj.x <= boundary && proj.y >= 0 && proj.y <= boundary;
      if (proj.remainingTime > 0 && !collision.hit && inBounds) {
        alive.push(proj);
      }
    }

    // Check for hits on players
    for (const proj of alive.slice()) {
      for (const player of players.values()) {
        const playerType = ShipDesignsMap.get(player.shipType);
        if (!playerType) { continue; }

        const dx = proj.x - player.x;
        const dy = proj.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= playerType.collisionRadius) {
          const attacker = players.get(proj.ownerSessionId);
          if (attacker && attacker !== player) {
            player.health -= this.config.projectiles.laserDamage;
            alive.splice(alive.indexOf(proj), 1);

            if (player.health <= 0) {
              attacker.score += 1;
              const pos = this.logic.generateSpawnPosition();
              player.x = pos.x;
              player.y = pos.y;
              player.vx = 0;
              player.vy = 0;
              player.direction = Math.random() * 2 * Math.PI;
              player.health = player.maxHealth;
              console.log(
                generateLogWithTimestamp(
                  `PlayerHit ${attacker.username} killed ${player.username}, ${attacker.username} score: ${attacker.score}`
                )
              );
            } else {
              console.log(
                generateLogWithTimestamp(
                  `PlayerHit ${attacker.username} hit ${player.username}`
                )
              );
            }
            break;
          }
        }
      }
    }

    return alive;
  }
}