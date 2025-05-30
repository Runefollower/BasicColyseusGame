import { GameGridGenerator } from "./GameGridGenerator";
import { GameConfig } from "./config";
import { GridManager } from "./GridManager";
import * as SAT from "sat";

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
    const cellSize = this.config.cellSize;
    const circle = new SAT.Circle(new SAT.Vector(newX, newY), radius);
    const response = new SAT.Response();

    const startGridX = Math.floor((newX - radius) / cellSize);
    const endGridX = Math.floor((newX + radius) / cellSize);
    const startGridY = Math.floor((newY - radius) / cellSize);
    const endGridY = Math.floor((newY + radius) / cellSize);

    for (let gy = startGridY; gy <= endGridY; gy++) {
      for (let gx = startGridX; gx <= endGridX; gx++) {
        if (gy < 0 || gy >= this.gridManager.grid.length ||
            gx < 0 || gx >= this.gridManager.grid[0].length) {
          continue;
        }
        if (this.gridManager.grid[gy][gx] !== GameGridGenerator.MATERIAL.ROCK) {
          continue;
        }

        const box = new SAT.Box(
          new SAT.Vector(gx * cellSize, gy * cellSize),
          cellSize,
          cellSize
        ).toPolygon();
        response.clear();

        if (SAT.testPolygonCircle(box, circle, response)) {
          result.hit = true;
          result.newX += response.overlapV.x;
          result.newY += response.overlapV.y;

          const normal = response.overlapN;
          const dot = result.vx * normal.x + result.vy * normal.y;
          if (dot < 0) {
            result.vx -= dot * normal.x;
            result.vy -= dot * normal.y;
          }

          this.gridManager.gridDamage[gy][gx] -= damage;
          if (this.gridManager.gridDamage[gy][gx] <= 0) {
            this.gridManager.grid[gy][gx] = GameGridGenerator.MATERIAL.FREE;
            this.gridManager.recalculateVisibility(gy, gx);
          }
          return result;
        }
      }
    }
    return result;
  }

}