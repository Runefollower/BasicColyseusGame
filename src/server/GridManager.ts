import { GameGridGenerator } from "./GameGridGenerator";
import { GameConfig } from "./config";

/**
 * Manages the game grid, including generation, damage tracking, and visibility.
 */
export class GridManager {
  readonly gridSize: number;
  readonly cellSize: number;
  readonly playAreaWidth: number;
  readonly playAreaHeight: number;
  grid: number[][];
  gridDamage: number[][];
  visibilityMatrix: any[][];

  private static readonly INITIAL_ROCK_DAMAGE = 50;

  constructor(
    private gridGen: GameGridGenerator,
    private config: GameConfig,
    private onGridRefresh: (
      gy: number,
      gx: number,
      gridValue: number,
      visibility: any
    ) => void
  ) {
    this.gridSize = this.config.gridSize;
    this.cellSize = this.config.cellSize;
    this.playAreaWidth = this.gridSize * this.cellSize;
    this.playAreaHeight = this.gridSize * this.cellSize;
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.grid = this.gridGen.generateGrid("cave");
    this.gridDamage = Array(this.gridSize)
      .fill(undefined)
      .map(() => Array(this.gridSize).fill(0));
    for (let gy = 0; gy < this.gridSize; gy++) {
      for (let gx = 0; gx < this.gridSize; gx++) {
        if (this.grid[gy][gx] === GameGridGenerator.MATERIAL.ROCK) {
          this.gridDamage[gy][gx] = GridManager.INITIAL_ROCK_DAMAGE;
        }
      }
    }
    this.visibilityMatrix = this.gridGen.generateVisibilityMatrixDiagonalLimited(
      this.grid,
      this.config.visibilityDiagonalLimit
    );
  }

  /**
   * Recalculates visibility for cells affected by rock destruction
   * and notifies clients.
   */
  recalculateVisibility(gy: number, gx: number): void {
    if (gy < 0 || gy >= this.gridSize || gx < 0 || gx >= this.gridSize) {
      return;
    }
    this.visibilityMatrix[gy][gx] =
      this.gridGen.generateVisibilityMatrixDiagonalLimitedPoint(
        gy,
        gx,
        this.grid,
        this.config.visibilityDiagonalLimit
      );
    this.notifyClientsGridUpdate(gy, gx);
  }

  /**
   * Notifies clients of grid and visibility updates around a point.
   */
  private notifyClientsGridUpdate(gy: number, gx: number): void {
    const limit = this.config.visibilityDiagonalLimit;
    for (let y = gy - limit; y <= gy + limit; y++) {
      for (let x = gx - limit; x <= gx + limit; x++) {
        if (
          y < 0 ||
          y >= this.gridSize ||
          x < 0 ||
          x >= this.gridSize
        ) {
          continue;
        }
        this.onGridRefresh(y, x, this.grid[y][x], this.visibilityMatrix[y][x]);
      }
    }
  }

  /**
   * Converts world coordinates to grid cell indices.
   */
  gridPosForPoint(pt: { x: number; y: number }): { x: number; y: number } {
    const x = Math.max(
      0,
      Math.min(this.gridSize - 1, Math.floor(pt.x / this.cellSize))
    );
    const y = Math.max(
      0,
      Math.min(this.gridSize - 1, Math.floor(pt.y / this.cellSize))
    );
    return { x, y };
  }
}