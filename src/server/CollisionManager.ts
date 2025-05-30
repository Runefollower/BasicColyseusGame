import { GameGridGenerator } from "./GameGridGenerator";
import { GameConfig } from "./config";
import { GridManager } from "./GridManager";

/**
 * Manages rock collisions and visibility updates in the game world.
 */
export class CollisionManager {
  constructor(
    private gridManager: GridManager,
    private config: GameConfig
  ) {}

  /**
   * Checks and resolves collisions between entities and rock cells.
   */
  checkForRockCollision(
    x: number,
    y: number,
    newX: number,
    newY: number,
    vx: number,
    vy: number,
    radius: number,
    damage: number
  ): { newX: number; newY: number; vx: number; vy: number; hit: boolean } {
    const result = { newX, newY, vx, vy, hit: false };
    const minX = newX - radius;
    const maxX = newX + radius;
    const minY = newY - radius;
    const maxY = newY + radius;

    const startGridX = Math.floor(minX / this.config.cellSize);
    const endGridX = Math.floor(maxX / this.config.cellSize);
    const startGridY = Math.floor(minY / this.config.cellSize);
    const endGridY = Math.floor(maxY / this.config.cellSize);

    for (let gy = startGridY; gy <= endGridY; gy++) {
      for (let gx = startGridX; gx <= endGridX; gx++) {
        if (
          gy < 0 || gy >= this.gridManager.grid.length ||
          gx < 0 || gx >= this.gridManager.grid[0].length
        ) { continue; }
        if (this.gridManager.grid[gy][gx] !== GameGridGenerator.MATERIAL.ROCK) { continue; }

        const cellCenterX = gx * this.config.cellSize + this.config.cellSize / 2;
        const cellCenterY = gy * this.config.cellSize + this.config.cellSize / 2;
        const closestX = this.clamp(newX, cellCenterX - this.config.cellSize / 2, cellCenterX + this.config.cellSize / 2);
        const closestY = this.clamp(newY, cellCenterY - this.config.cellSize / 2, cellCenterY + this.config.cellSize / 2);
        const dx = newX - closestX;
        const dy = newY - closestY;
        const distSq = dx * dx + dy * dy;
        const collisionDist = radius;
        if (distSq < collisionDist * collisionDist) {
          result.hit = true;
          const dist = Math.sqrt(distSq) || 1;
          const nx = dx / dist;
          const ny = dy / dist;
          const penetration = collisionDist - dist;
          result.newX += nx * penetration;
          result.newY += ny * penetration;
          const dot = result.vx * nx + result.vy * ny;
          if (dot < 0) {
            result.vx -= dot * nx;
            result.vy -= dot * ny;
          }
          this.gridManager.gridDamage[gy][gx] -= damage;
          if (this.gridManager.gridDamage[gy][gx] <= 0) {
            this.gridManager.grid[gy][gx] = GameGridGenerator.MATERIAL.FREE;
            this.gridManager.recalculateVisibility(gy, gx);
          }
        }
      }
    }
    return result;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

}