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

  // New parameters for procedural cave generation
  fillProbability: number; // Probability to start a cell as open
  smoothingIterations: number;
  minOpeningWidth: number;
  maxCaveSize: number;

  constructor(
    gridSize: number,
    fillProbability: number = 0.45,
    smoothingIterations: number = 4,
    minOpeningWidth: number = 2,
    maxCaveSize: number = 500
  ) {
    this.gridSize = gridSize;
    this.fillProbability = fillProbability;
    this.smoothingIterations = smoothingIterations;
    this.minOpeningWidth = minOpeningWidth;
    this.maxCaveSize = maxCaveSize;
  }

  /**
   * Generates a procedurally generated cave-like grid
   *
   * @returns A procedurally generated cave grid
   */
  generateCaveGrid(): number[][] {
    // Initialize grid with walls
    let grid: number[][] = Array(this.gridSize)
      .fill(undefined)
      .map(() => Array(this.gridSize).fill(0b1111)); // Start with all walls

    // Step 1: Randomly carve out initial open spaces
    for (let y = 1; y < this.gridSize - 1; y++) {
      for (let x = 1; x < this.gridSize - 1; x++) {
        if (Math.random() < this.fillProbability) {
          grid[y][x] = 0b0000; // Open cell
        }
      }
    }

    // Step 2: Apply Cellular Automata smoothing
    for (let i = 0; i < this.smoothingIterations; i++) {
      grid = this.smoothGrid(grid);
    }

    // Step 3: Ensure minimal opening width
    grid = this.ensureMinOpeningWidth(grid, this.minOpeningWidth);

    // Step 4: Limit cave region sizes
    grid = this.limitCaveSize(grid, this.maxCaveSize);

    // Step 5: Ensure all cave regions are connected
    grid = this.ensureConnectivity(grid);

    // Populate outer walls
    this.populateOuterWalls(grid);

    // Match walls between adjacent cells
    this.matchWalls(grid);

    return grid;
  }

  /**
   * Applies Cellular Automata rules to smooth the grid
   *
   * @param grid The current grid
   * @returns The smoothed grid
   */
  private smoothGrid(grid: number[][]): number[][] {
    const newGrid = grid.map((row) => row.slice());

    for (let y = 1; y < this.gridSize - 1; y++) {
      for (let x = 1; x < this.gridSize - 1; x++) {
        let walls = 0;
        // Check all 8 neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dy === 0 && dx === 0) continue;
            walls += grid[y + dy][x + dx] === 0b1111 ? 1 : 0;
          }
        }

        if (walls > 4) {
          newGrid[y][x] = 0b1111; // Wall
        } else if (walls < 3) {
          newGrid[y][x] = 0b0000; // Open
        }
        // Otherwise, keep the current state
      }
    }

    return newGrid;
  }

  /**
   * Ensures that all openings in the cave meet the minimal opening width
   *
   * @param grid The current grid
   * @param minWidth The minimal width for openings
   * @returns The modified grid
   */
  private ensureMinOpeningWidth(
    grid: number[][],
    minWidth: number
  ): number[][] {
    // This function can be implemented based on specific requirements.
    // For simplicity, we'll ensure that there are no single-cell-wide passages.

    for (let y = 1; y < this.gridSize - 1; y++) {
      for (let x = 1; x < this.gridSize - 1; x++) {
        if (grid[y][x] === 0b0000) {
          // Check surrounding cells to ensure minimal width
          let openNeighbors = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dy === 0 && dx === 0) continue;
              if (grid[y + dy][x + dx] === 0b0000) {
                openNeighbors++;
              }
            }
          }
          if (openNeighbors < minWidth) {
            // Convert to wall if not enough open neighbors
            grid[y][x] = 0b1111;
          }
        }
      }
    }

    return grid;
  }

  /**
   * Limits the size of cave regions to a maximum size
   *
   * @param grid The current grid
   * @param maxSize The maximum allowed size for a cave region
   * @returns The modified grid
   */
  private limitCaveSize(grid: number[][], maxSize: number): number[][] {
    const visited = Array(this.gridSize)
      .fill(false)
      .map(() => Array(this.gridSize).fill(false));

    const regions: number[][][] = [];

    // Flood fill to identify regions
    for (let y = 1; y < this.gridSize - 1; y++) {
      for (let x = 1; x < this.gridSize - 1; x++) {
        if (!visited[y][x] && grid[y][x] === 0b0000) {
          const region: number[][] = [];
          const queue: Array<{ x: number; y: number }> = [{ x, y }];
          visited[y][x] = true;

          while (queue.length > 0) {
            const { x: cx, y: cy } = queue.pop()!;
            region.push([cx, cy]);

            // Check 4-directionally
            const directions = [
              { dx: 0, dy: -1 },
              { dx: 1, dy: 0 },
              { dx: 0, dy: 1 },
              { dx: -1, dy: 0 },
            ];

            for (const { dx, dy } of directions) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (
                nx > 0 &&
                nx < this.gridSize - 1 &&
                ny > 0 &&
                ny < this.gridSize - 1 &&
                !visited[ny][nx] &&
                grid[ny][nx] === 0b0000
              ) {
                visited[ny][nx] = true;
                queue.push({ x: nx, y: ny });
              }
            }
          }

          regions.push(region);
        }
      }
    }

    // Sort regions by size descending
    regions.sort((a, b) => b.length - a.length);

    // Keep the largest regions within the maxSize
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      if (region.length > maxSize) {
        // Convert excess cells to walls
        for (let j = maxSize; j < region.length; j++) {
          const [x, y] = region[j];
          grid[y][x] = 0b1111;
        }
      }
    }

    return grid;
  }

  /**
   * Ensures that all cave regions are connected
   *
   * @param grid The current grid
   * @returns The modified grid with all regions connected
   */
  private ensureConnectivity(grid: number[][]): number[][] {
    const visited = Array(this.gridSize)
      .fill(false)
      .map(() => Array(this.gridSize).fill(false));

    const queue: Array<{ x: number; y: number }> = [{ x: 1, y: 1 }];
    visited[1][1] = true;

    while (queue.length > 0) {
      const { x, y } = queue.pop()!;

      // Check 4-directionally
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ];

      for (const { dx, dy } of directions) {
        const nx = x + dx;
        const ny = y + dy;

        if (
          nx > 0 &&
          nx < this.gridSize - 1 &&
          ny > 0 &&
          ny < this.gridSize - 1 &&
          grid[ny][nx] === 0b0000 &&
          !visited[ny][nx]
        ) {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }

    // Find disconnected regions and connect them
    for (let y = 1; y < this.gridSize - 1; y++) {
      for (let x = 1; x < this.gridSize - 1; x++) {
        if (grid[y][x] === 0b0000 && !visited[y][x]) {
          // Find the nearest connected cell
          const path = this.findPath(grid, x, y, visited);
          if (path.length > 0) {
            // Carve the path
            for (const { x: px, y: py } of path) {
              grid[py][px] = 0b0000;
              visited[py][px] = true;
            }
          }
        }
      }
    }

    return grid;
  }

  /**
   * Finds a path from a disconnected cell to the nearest connected region
   *
   * @param grid The grid
   * @param startX The starting x coordinate
   * @param startY The starting y coordinate
   * @param visited The visited matrix from the main connected region
   * @returns An array of points representing the path
   */
  private findPath(
    grid: number[][],
    startX: number,
    startY: number,
    visited: boolean[][]
  ): Array<{ x: number; y: number }> {
    const queue: Array<{
      x: number;
      y: number;
      path: Array<{ x: number; y: number }>;
    }> = [{ x: startX, y: startY, path: [] }];
    const localVisited = Array(this.gridSize)
      .fill(false)
      .map(() => Array(this.gridSize).fill(false));
    localVisited[startY][startX] = true;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const { x, y, path } = current;

      // Check if this cell is connected to the main region
      if (visited[y][x]) {
        return path;
      }

      // Explore neighbors
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
      ];

      for (const { dx, dy } of directions) {
        const nx = x + dx;
        const ny = y + dy;

        if (
          nx > 0 &&
          nx < this.gridSize - 1 &&
          ny > 0 &&
          ny < this.gridSize - 1 &&
          !localVisited[ny][nx]
        ) {
          localVisited[ny][nx] = true;
          queue.push({
            x: nx,
            y: ny,
            path: [...path, { x: nx, y: ny }],
          });
        }
      }
    }

    return [];
  }

  /**
   * Creates a randomly generated game grid using either random or cave generation
   *
   * @param type The type of generation: 'random', 'preDefinedPatterns' or 'cave'
   * @returns A randomly generated game grid
   */
  generateGrid(
    type: "random" | "cave" | "preDefinedPattern" = "random"
  ): number[][] {
    if (type === "cave") {
      return this.generateCaveGrid();
    } else if (type === "random") {
      return this.generateRandomGrid();
    } else {
      return this.generateGridFromPredefinedPatterns(false);
    }
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
        this.matchWallsPoint(grid, y, x);
      }
    }
  }

  matchWallsPoint(grid: number[][], gy: number, gx: number): void {
    // Check right neighbor, if exists
    if (gx < grid[gy].length - 1) {
      // If current cell has a right wall, ensure the neighbor has a left wall
      if (grid[gy][gx] & this.wallMask.R) {
        grid[gy][gx + 1] |= this.wallMask.L;
      }
      // If neighbor has a left wall, ensure the current cell has a right wall
      if (grid[gy][gx + 1] & this.wallMask.L) {
        grid[gy][gx] |= this.wallMask.R;
      }
    }

    // Check bottom neighbor, if exists
    if (gy < grid.length - 1) {
      // If current cell has a bottom wall, ensure the neighbor has a top wall
      if (grid[gy][gx] & this.wallMask.B) {
        grid[gy + 1][gx] |= this.wallMask.T;
      }
      // If neighbor has a top wall, ensure the current cell has a bottom wall
      if (grid[gy + 1][gx] & this.wallMask.T) {
        grid[gy][gx] |= this.wallMask.B;
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

  generateVisibilityMatrixDiagonalLimited(
    grid: number[][],
    maxDistance: number
  ): any[][] {
    const visibilityMatrix: any[][] = Array(this.gridSize)
      .fill(undefined)
      .map(() =>
        Array(this.gridSize)
          .fill(undefined)
          .map(() => [])
      );

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
        visibilityMatrix[y0][x0] =
          this.generateVisibilityMatrixDiagonalLimitedPoint(
            y0,
            x0,
            grid,
            maxDistance
          );
      }
    }

    return visibilityMatrix;
  }

  generateVisibilityMatrixDiagonalLimitedPoint(
    y0: number,
    x0: number,
    grid: number[][],
    maxDistance: number
  ): any {
    const visibility: any[] = Array();

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

    for (let y1 = 0; y1 < this.gridSize; y1++) {
      for (let x1 = 0; x1 < this.gridSize; x1++) {
        // Calculate Euclidean distance
        const dx = x1 - x0;
        const dy = y1 - y0;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > maxDistance) {
          continue; // Skip visibility calculation for this pair
        }

        // To reduce redundant calculations, ensure (x1, y1) >= (x0, y0)
        /*
            if (y1 < y0 || (y1 === y0 && x1 < x0)) {
              continue;
            }
            */

        let visible = true;
        let hitSolidWall = false;
        let wallDepth = 0;
        for (const point of bresenhamLine(x0, y0, x1, y1)) {
          if (point.x === x0 && point.y === y0) continue;
          if (
            point.x === x1 &&
            point.y === y1 &&
            grid[point.y][point.x] === solidGrid
          ) {
            //We are at the end of the line and this is visible
            continue;
          }

          if (grid[point.y][point.x] === solidGrid) {
            if (hitSolidWall) {
              wallDepth++; //Counting hou many layers we can see into the wall
              if (wallDepth > 4) {
                visible = false;
                break;
              }
            } else {
              //First time we hit the wall, flag as hit and start counting depth
              hitSolidWall = true;
              visible = true;
              wallDepth++;
            }
          } else if (hitSolidWall) {
            //An empty block behind a wall, not visible
            visible = false;
          }
        }
        if (visible) {
          visibility.push({ x: x1, y: y1 });
          //visibilityMatrix[y1][x1].push({ x: x0, y: y0 }); // Mirror visibility
        }
      }
    }

    return visibility;
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
