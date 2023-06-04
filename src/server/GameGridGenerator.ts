/**
 * Game Grid Generator
 * Encapsulating tools to generate the grid for the game.  The grid
 * is a square N X N grid, each box being default 100px.  The sides
 * each box may be impassable representing walls.  This is represented
 * by a 4 digit binary number at each grid node with 0 representing no
 * wall and 1 representing a wall
 */

export class GameGridGenerator {
  // Now you can use bitwise OR to set wall values
  // Define some constants for readability
  wallMask = {
    T: 0b0001,
    R: 0b0010,
    B: 0b0100,
    L: 0b1000,
  };

  gridSize: number = 30;

  constructor(gridSize: number) {
    this.gridSize = gridSize;
  }

  /**
   * Creates a randomly generated game grid
   *
   * @returns A randomly generated game grid
   */
  generateRandomGrid(): number[][] {
    // Initialize the grid as an empty grid (no walls)
    const grid: number[][] = Array(this.gridSize)
      .fill(undefined)
      .map(() => Array(this.gridSize).fill(0b0000)); // binary for no walls

    // Randomly generate walls
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        // For cells not on the boundary
        if (x > 0 && x < this.gridSize - 1 && y > 0 && y < this.gridSize - 1) {
          // Randomly decide if there should be a wall on the right
          if (Math.random() < 0.15) {
            grid[y][x] |= this.wallMask.R;
            grid[y][x + 1] |= this.wallMask.L;
          }
          // Randomly decide if there should be a wall on the bottom
          if (Math.random() < 0.15) {
            grid[y][x] |= this.wallMask.B;
            grid[y + 1][x] |= this.wallMask.T;
          }
        }

        // For cells on the boundary
        if (x === 0) {
          grid[y][x] |= this.wallMask.L;
        }
        if (x === this.gridSize - 1) {
          grid[y][x] |= this.wallMask.R;
        }
        if (y === 0) {
          grid[y][x] |= this.wallMask.T;
        }
        if (y === this.gridSize - 1) {
          grid[y][x] |= this.wallMask.B;
        }
      }
    }

    return this.removeLockedWalls(grid);
  }

  /**
   * Scans a grid and unblocks any fully enclosed regions
   *
   * @param grid The grid we are checking for locked regions
   * @returns The modified grid with locked regions removed
   */
  removeLockedWalls(grid: number[][]): number[][] {
    // Create a grid to track visited cells
    const visited = Array(this.gridSize)
      .fill(false)
      .map(() => Array(this.gridSize).fill(false));

    // Recursive function to perform the depth-first search
    function dfs(x: number, y: number, gridSize: number, wm: any): void {
      // Return if the cell is out of bounds or already visited
      if (
        x < 0 ||
        y < 0 ||
        x >= gridSize ||
        y >= gridSize ||
        visited[y][x] === true
      ) {
        return;
      }

      // Mark the cell as visited
      visited[y][x] = true;

      // Visit all adjacent cells
      if ((grid[y][x] & wm.T) === 0) {
        dfs(x, y - 1, gridSize, wm);
      }
      if ((grid[y][x] & wm.R) === 0) {
        dfs(x + 1, y, gridSize, wm);
      }
      if ((grid[y][x] & wm.B) === 0) {
        dfs(x, y + 1, gridSize, wm);
      }
      if ((grid[y][x] & wm.L) === 0) {
        dfs(x - 1, y, gridSize, wm);
      }
    }

    // Start the search from the top-left cell (or any cell on the boundary)
    dfs(0, 0, this.gridSize, this.wallMask);

    // Check for cells that weren't visited and remove a wall to make them reachable
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        if (visited[y][x] === false) {
          // Remove a wall. In this case, we'll remove the top wall, but you can choose any wall depending on your needs
          grid[y][x] &= ~this.wallMask.T;
          // If not in the top row, add a corresponding opening in the cell above
          if (y > 0) {
            grid[y - 1][x] &= ~this.wallMask.B;
          }
        }
      }
    }
    return grid;
  }

  /**
   * Generate a grid that is selected from the pre defined patterns
   *
   * @param useImpossibleGrids Used for testing, uses grids that are mostly full
   * @returns The new grid
   */
  generateGridFromPredefinedPatterns(useImpossibleGrids: boolean): number[][] {
    // Create a grid
    let sampleArray = preDefined10x10Grids;

    if (useImpossibleGrids) sampleArray = preDefined10x10ImpossibleGrids;

    const grid = Array(this.gridSize)
      .fill(0)
      .map(() => Array(this.gridSize).fill(0));

    // Size of the pre-defined patterns
    const patternSize = 10;

    // Ensure gridSize is a multiple of patternSize
    if (this.gridSize % patternSize !== 0) {
      throw new Error("Grid size must be a multiple of " + String(patternSize));
    }

    // For each pattern-sized block in the grid
    for (let gridY = 0; gridY < this.gridSize; gridY += patternSize) {
      for (let gridX = 0; gridX < this.gridSize; gridX += patternSize) {
        // Select a random pre-defined pattern
        const pattern =
          sampleArray[Math.floor(Math.random() * sampleArray.length)];

        // Copy the pattern into the grid
        for (let patternY = 0; patternY < patternSize; patternY++) {
          for (let patternX = 0; patternX < patternSize; patternX++) {
            grid[gridY + patternY][gridX + patternX] =
              pattern[patternY][patternX];
          }
        }
      }
    }

    this.populateOuterWalls(grid);
    this.matchWalls(grid);
    return grid;
  }

  /**
   * This will ensure all outside walls are populated
   *
   * @param grid The grid now with all exterior walls populated
   */
  populateOuterWalls(grid: number[][]): void {
    // Set top and bottom walls
    for (let x = 0; x < grid.length; x++) {
      // Top walls (set the first bit)
      grid[0][x] |= this.wallMask.T;
      // Bottom walls (set the third bit)
      grid[grid.length - 1][x] |= this.wallMask.B;
    }

    // Set left and right walls
    for (let y = 0; y < grid.length; y++) {
      // Left walls (set the fourth bit)
      grid[y][0] |= this.wallMask.L;
      // Right walls (set the second bit)
      grid[y][grid.length - 1] |= this.wallMask.R;
    }
  }

  /**
   * Ensure that all walls are matched.  So if there is a wall on the left, the
   * grid on the left should have a matching wall on the right
   *
   * @param grid The grid we are checking
   */
  matchWalls(grid: number[][]): void {
    // Traverse all cells in the grid
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        // Check right neighbor, if exists
        if (x < grid[y].length - 1) {
          // If current cell has a right wall, ensure the neighbor has a left wall
          if (grid[y][x] & this.wallMask.R) {
            grid[y][x + 1] |= this.wallMask.L;
          }
          // If neighbor has a left wall, ensure the current cell has a right wall
          if (grid[y][x + 1] & this.wallMask.L) {
            grid[y][x] |= this.wallMask.R;
          }
        }

        // Check bottom neighbor, if exists
        if (y < grid.length - 1) {
          // If current cell has a bottom wall, ensure the neighbor has a top wall
          if (grid[y][x] & this.wallMask.B) {
            grid[y + 1][x] |= this.wallMask.T;
          }
          // If neighbor has a top wall, ensure the current cell has a bottom wall
          if (grid[y + 1][x] & this.wallMask.T) {
            grid[y][x] |= this.wallMask.B;
          }
        }
      }
    }
  }

  /**
   * Generates a visibility matrix considering diagonal vision, which represents the set of visible grid cells from each cell in the grid.
   * It accounts for obstacles/walls represented by the bitmask values in wallMask for each cell.
   *
   * @param {number[][]} grid The game grid, represented as a 2D array. Each cell contains a binary representation of the walls.
   * @param {object} wm The wallMask object, containing binary representations for top (T), right (R), bottom (B), and left (L) walls.
   * @returns {Set[][]} A 2D array of Sets, where each Set contains grid coordinates {x: number, y: number} of visible cells from the corresponding cell.
   * If the cell at coordinates (y, x) has walls, those are considered as obstacles for visibility.
   * For each pair of cells, it uses the Bresenham's line algorithm to get the coordinates of cells that form a straight line between the pair,
   * and checks if there is a wall between them. If there is a wall, the second cell is not visible from the first one.
   * Diagonal vision is allowed, i.e., a cell can "see" another cell diagonally if there is no obstacle in the line of sight.
   */
  generateVisibilityMatrixDiagonal(grid: number[][]): any[][] {
    const visibilityMatrix: any[][] = Array(this.gridSize)
      .fill(undefined)
      .map(() =>
        Array(this.gridSize)
          .fill(undefined)
          .map(() => [])
      );

    const wallMasks = [
      this.wallMask.T,
      this.wallMask.R,
      this.wallMask.B,
      this.wallMask.L,
    ];
    const solidGrid = 0b1111;

    // Bresenham's line algorithm
    function* bresenhamLine(
      x0: number,
      y0: number,
      x1: number,
      y1: number
    ): IterableIterator<{ x: number; y: number }> {
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;

      while (true) {
        yield { x: x0, y: y0 };

        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x0 += sx;
        }
        if (e2 < dx) {
          err += dx;
          y0 += sy;
        }
      }
    }

    for (let y0 = 0; y0 < this.gridSize; y0++) {
      for (let x0 = 0; x0 < this.gridSize; x0++) {
        for (let y1 = 0; y1 < this.gridSize; y1++) {
          for (let x1 = 0; x1 < this.gridSize; x1++) {
            let visible = true;
            let hitSolidWall = false;
            for (const point of bresenhamLine(x0, y0, x1, y1)) {
              if (point.x === x0 && point.y === y0) continue;
              if (
                point.x === x1 &&
                point.y === y1 &&
                grid[point.y][point.x] === solidGrid
              )
                continue;
              /*
              for (const mask of wallMasks) {
                if (grid[point.y][point.x] & mask) {
                  visible = false;
                  break;
                }
              }
              */
              if (grid[point.y][point.x] === solidGrid) {
                hitSolidWall = true;
              } else if (hitSolidWall) {
                visible = false;
                break;
              }
              if (!visible) break;
            }
            if (visible) {
              visibilityMatrix[y0][x0].push({ x: x1, y: y1 });
            }
          }
        }
      }
    }

    return visibilityMatrix;
  }
}

/**
 * Defining standard patterns that can be selected to
 * build a full grid.  X here represents a block
 * with walls on all four sides
 */
const X = 0b1111;
const preDefined10x10Grids = [
  [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, X, X, X, 0, X, X, X, X, 0],
    [0, X, 0, 0, 0, 0, 0, 0, X, 0],
    [0, X, 0, 0, 0, 0, 0, 0, X, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, X, 0],
    [0, X, 0, 0, 0, 0, 0, 0, X, 0],
    [0, X, 0, 0, 0, 0, 0, 0, X, 0],
    [0, X, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, X, X, 0, X, X, X, X, X, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, X, X, 0, 0, 0, 0, X, X, 0],
    [0, X, X, 0, 0, 0, 0, X, X, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, X, X, 0, 0, 0, 0, X, X, 0],
    [0, X, X, 0, 0, 0, 0, X, X, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
];

// createing these for testing spawn logic
// the grids are mostly in accessable
const preDefined10x10ImpossibleGrids = [
  [
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, 0, 0, X, X, X],
    [X, X, X, X, X, 0, 0, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
  ],
  [
    [X, X, X, X, X, X, X, X, X, X],
    [X, 0, 0, X, X, X, X, X, X, X],
    [X, 0, 0, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
    [X, X, X, X, X, X, X, X, X, X],
  ],
];
