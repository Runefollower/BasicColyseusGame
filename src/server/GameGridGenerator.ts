/**
 * Game Grid Generator
 * Encapsulates tools to generate the grid for the game. The grid
 * is a square N x N grid, each cell representing a material.
 * 0 represents free space, 1 represents "rock". More materials can be added later.
 */

export class GameGridGenerator {
  // Define materials
  static MATERIAL = {
    FREE: 0,
    ROCK: 1,
    // Future materials can be added here
  };

  gridSize: number = 30;

  // Parameters for procedural cave generation
  fillProbability: number; // Probability to start a cell as rock
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
    // Initialize grid with rock
    let grid: number[][] = Array(this.gridSize)
      .fill(undefined)
      .map(() => Array(this.gridSize).fill(GameGridGenerator.MATERIAL.ROCK));

    // Step 1: Randomly carve out initial free spaces
    for (let y = 1; y < this.gridSize - 1; y++) {
      for (let x = 1; x < this.gridSize - 1; x++) {
        if (Math.random() < this.fillProbability) {
          grid[y][x] = GameGridGenerator.MATERIAL.FREE; // Free cell
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

    // Populate outer walls as rock
    this.populateOuterWalls(grid);

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
        let rockCount = 0;
        // Check all 8 neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dy === 0 && dx === 0) continue;
            if (grid[y + dy][x + dx] === GameGridGenerator.MATERIAL.ROCK) {
              rockCount++;
            }
          }
        }

        if (rockCount > 4) {
          newGrid[y][x] = GameGridGenerator.MATERIAL.ROCK;
        } else if (rockCount < 3) {
          newGrid[y][x] = GameGridGenerator.MATERIAL.FREE;
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
    // Ensure that there are no single-cell-wide passages
    for (let y = 1; y < this.gridSize - 1; y++) {
      for (let x = 1; x < this.gridSize - 1; x++) {
        if (grid[y][x] === GameGridGenerator.MATERIAL.FREE) {
          let freeNeighbors = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dy === 0 && dx === 0) continue;
              if (grid[y + dy][x + dx] === GameGridGenerator.MATERIAL.FREE) {
                freeNeighbors++;
              }
            }
          }
          if (freeNeighbors < minWidth) {
            grid[y][x] = GameGridGenerator.MATERIAL.ROCK;
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
        if (!visited[y][x] && grid[y][x] === GameGridGenerator.MATERIAL.FREE) {
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
                grid[ny][nx] === GameGridGenerator.MATERIAL.FREE
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
        // Convert excess cells to rock
        for (let j = maxSize; j < region.length; j++) {
          const [x, y] = region[j];
          grid[y][x] = GameGridGenerator.MATERIAL.ROCK;
        }
      }
    }

    return grid;
  }

  private ensureConnectivity(grid: number[][]): number[][] {
    const visited = Array(this.gridSize)
      .fill(false)
      .map(() => Array(this.gridSize).fill(false));

    // Step 1: Find a starting free cell
    let startFound = false;
    let startX = 1;
    let startY = 1;

    for (let y = 1; y < this.gridSize - 1 && !startFound; y++) {
      for (let x = 1; x < this.gridSize - 1 && !startFound; x++) {
        if (grid[y][x] === GameGridGenerator.MATERIAL.FREE) {
          startX = x;
          startY = y;
          startFound = true;
        }
      }
    }

    if (!startFound) {
      // No free cells found; return the grid as is
      return grid;
    }

    // Step 2: BFS to mark all connected free cells
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    visited[startY][startX] = true;

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
          grid[ny][nx] === GameGridGenerator.MATERIAL.FREE &&
          !visited[ny][nx]
        ) {
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }

    // Step 3: Connect disconnected regions
    for (let y = 1; y < this.gridSize - 1; y++) {
      for (let x = 1; x < this.gridSize - 1; x++) {
        if (grid[y][x] === GameGridGenerator.MATERIAL.FREE && !visited[y][x]) {
          // Find a path from this cell to the main connected region
          const path = this.findPath(grid, x, y, visited);
          if (path.length > 0) {
            // Carve the path by setting cells to free
            for (const { x: px, y: py } of path) {
              grid[py][px] = GameGridGenerator.MATERIAL.FREE;
              visited[py][px] = true;
            }
          }
        }
      }
    }

    return grid;
  }

  /**
   * Finds a path from a disconnected cell to the nearest connected region,
   * allowing carving through rocks.
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

      // If this cell is part of the main connected region, return the path
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

    // No path found
    return [];
  }

  /**
   * Creates a randomly generated game grid using either random or cave generation
   *
   * @param type The type of generation: 'random' or 'cave' or 'preDefinedPattern'
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
    // Initialize the grid as free space
    const grid: number[][] = Array(this.gridSize)
      .fill(undefined)
      .map(() => Array(this.gridSize).fill(GameGridGenerator.MATERIAL.FREE));

    // Randomly generate rock cells
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        // For cells not on the boundary
        if (x > 0 && x < this.gridSize - 1 && y > 0 && y < this.gridSize - 1) {
          if (Math.random() < 0.15) {
            grid[y][x] = GameGridGenerator.MATERIAL.ROCK;
          }
        }

        // For cells on the boundary, set as rock
        if (
          x === 0 ||
          x === this.gridSize - 1 ||
          y === 0 ||
          y === this.gridSize - 1
        ) {
          grid[y][x] = GameGridGenerator.MATERIAL.ROCK;
        }
      }
    }

    return grid;
  }

  /**
   * Generate a grid that is selected from the predefined patterns
   *
   * @param useImpossibleGrids Used for testing, uses grids that are mostly full
   * @returns The new grid
   */
  generateGridFromPredefinedPatterns(useImpossibleGrids: boolean): number[][] {
    // Create a grid
    let sampleArray = GameGridGenerator.predefined10x10Grids;

    if (useImpossibleGrids)
      sampleArray = GameGridGenerator.predefined10x10ImpossibleGrids;

    const grid = Array(this.gridSize)
      .fill(0)
      .map(() => Array(this.gridSize).fill(GameGridGenerator.MATERIAL.FREE));

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
    return grid;
  }

  /**
   * Ensures all outer cells are set as rock
   *
   * @param grid The grid to populate outer walls
   */
  populateOuterWalls(grid: number[][]): void {
    for (let x = 0; x < grid.length; x++) {
      grid[0][x] = GameGridGenerator.MATERIAL.ROCK; // Top
      grid[grid.length - 1][x] = GameGridGenerator.MATERIAL.ROCK; // Bottom
    }

    for (let y = 0; y < grid.length; y++) {
      grid[y][0] = GameGridGenerator.MATERIAL.ROCK; // Left
      grid[y][grid.length - 1] = GameGridGenerator.MATERIAL.ROCK; // Right
    }
  }

  /**
   * Generates a visibility matrix considering diagonal vision, representing
   * the set of visible grid cells from each cell in the grid.
   *
   * @param grid The game grid, represented as a 2D array. Each cell contains a material.
   * @returns A 2D array of Sets, where each Set contains grid coordinates {x: number, y: number} of visible cells from the corresponding cell.
   */
  generateVisibilityMatrixDiagonal(grid: number[][]): any[][] {
    const visibilityMatrix: any[][] = Array(this.gridSize)
      .fill(undefined)
      .map(() =>
        Array(this.gridSize)
          .fill(undefined)
          .map(() => new Set<string>())
      );

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
            for (const point of bresenhamLine(x0, y0, x1, y1)) {
              if (point.x === x0 && point.y === y0) continue;
              if (grid[point.y][point.x] === GameGridGenerator.MATERIAL.ROCK) {
                visible = false;
                break;
              }
            }
            if (visible) {
              visibilityMatrix[y0][x0].add(`${x1},${y1}`);
            }
          }
        }
      }
    }

    return visibilityMatrix;
  }

  /**
   * Generates a limited visibility matrix considering diagonal vision and maximum distance
   *
   * @param grid The game grid, represented as a 2D array. Each cell contains a material.
   * @param maxDistance The maximum distance for visibility
   * @returns A 2D array of Sets, where each Set contains grid coordinates {x: number, y: number} of visible cells from the corresponding cell.
   */
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

    /*
      const visibilityMatrix: any[][] = Array(this.gridSize)
      .fill(undefined)
      .map(() =>
        Array(this.gridSize)
          .fill(undefined)
          .map(() => new Set<string>())
      );*/

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

    /*

    for (let y0 = 0; y0 < this.gridSize; y0++) {
      for (let x0 = 0; x0 < this.gridSize; x0++) {
        for (let y1 = 0; y1 < this.gridSize; y1++) {
          for (let x1 = 0; x1 < this.gridSize; x1++) {
            // Calculate Euclidean distance
            const dx = x1 - x0;
            const dy = y1 - y0;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > maxDistance) {
              continue; // Skip visibility calculation for this pair
            }

            let visible = true;
            for (const point of bresenhamLine(x0, y0, x1, y1)) {
              if (point.x === x0 && point.y === y0) continue;
              if (grid[point.y][point.x] === GameGridGenerator.MATERIAL.ROCK) {
                visible = false;
                break;
              }
            }
            if (visible) {
              visibilityMatrix[y0][x0].add(`${x1},${y1}`);
            }
          }
        }
      }
    } */

    return visibilityMatrix;
  }

  /**
   * Generates visibility from a single point, considering diagonal vision and maximum distance
   *
   * @param gy Grid y-coordinate of the point
   * @param gx Grid x-coordinate of the point
   * @param grid The game grid, represented as a 2D array. Each cell contains a material.
   * @param maxDistance The maximum distance for visibility
   * @returns A Set containing grid coordinates "x,y" of visible cells from the given point.
   */
  generateVisibilityMatrixDiagonalLimitedPoint(
    gy: number,
    gx: number,
    grid: number[][],
    maxDistance: number
  ): any {
    const visibilitySet: any[] = Array();

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
        const dx = x1 - gx;
        const dy = y1 - gy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > maxDistance) {
          continue; // Skip visibility calculation for this pair
        }

        let visible = true;
        let hitSolidWall = false;
        let wallDepth = 0;
        for (const point of bresenhamLine(gx, gy, x1, y1)) {
          if (point.x === gx && point.y === gy) continue;
          if (grid[point.y][point.x] === GameGridGenerator.MATERIAL.ROCK) {
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
          visibilitySet.push({ x: x1, y: y1 });
        }
      }
    }

    return visibilitySet;
  }

  /**
   * Defining standard patterns that can be selected to
   * build a full grid. 1 represents a rock block, 0 represents free space.
   */
  static predefined10x10Grids = [
    [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 1, 1, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
    [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
      [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
      [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  ];

  // Creating these for testing spawn logic
  // The grids are mostly inaccessible
  static predefined10x10ImpossibleGrids = [
    [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 0, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 0, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  ];
}
