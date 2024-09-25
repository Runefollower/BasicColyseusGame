import { PlayerShip } from "./GameEntities";
import { SpaceShipRender } from "./SpaceShipRenderer";

export const projectileTypes = {
  Laser: 1,
  Cannonball: 2,
};

export class SSGameEngineClient {
  // Map of active ships
  playerShips = new Map<string, PlayerShip>();

  // This current player session id
  playerSessionID: string = "";

  // The ship renderer
  ssRenderer: SpaceShipRender;

  // Flags for UI elements
  showPlayerLabels = false;
  showServerMetrics = false;
  showInstructions = false;

  // Dimensions
  displayWidth = 100;
  displayHeight = 100;
  gameAreaWidth = 100;
  gameAreaHeight = 100;

  // Grid properties
  gridSize: number = 100; // Should match server gridSize
  cellSize: number = 100; // Should match server cellSize
  gameGrid: number[][];

  // Tracking visibility
  seenGrid: number[][];
  visibilityMatrix: any[][];

  /*
   * Client-side performance stats
   */
  lastStateUpdate = 0.0;
  lastFrameRender = 0.0;
  framesBetweenState = 0;
  maxFramesBetweenState = 0;
  nextResetMax = 0;

  renderUpdateTimestamps: number[] = [];
  framesPerSecond: number = 0.0;

  serverUpdateTimestamps: number[] = [];
  updatesPerSecond: number = 0.0;

  // Hide invisible parts of the map
  hideInvisible = true;

  constructor() {
    this.ssRenderer = new SpaceShipRender();

    // Initialize seenGrid to track previously seen cells
    this.resetSeenGrid();

    // Initialize performance metrics
    this.lastStateUpdate = performance.now();
    this.framesBetweenState = 0;
  }

  /**
   * Resets the seenGrid to all unseen.
   */
  resetSeenGrid(): void {
    this.seenGrid = Array(this.gridSize)
      .fill(undefined)
      .map(() => Array(this.gridSize).fill(null));
  }

  /**
   * Update the game engine, passed the update delta time (udt),
   * time since last update from the server, and dt (time since last render).
   */
  update(udt: number, dt: number, elapsedTime: number): void {
    this.ssRenderer.update(dt);

    for (const playerShip of this.playerShips.values()) {
      playerShip.update(udt);
    }

    // Track frames without server updates
    this.framesBetweenState++;
    if (
      this.framesBetweenState > this.maxFramesBetweenState ||
      elapsedTime > this.nextResetMax
    ) {
      this.maxFramesBetweenState = this.framesBetweenState;
      this.nextResetMax = elapsedTime + 60000; // Reset every minute
    }
  }

  /**
   * Draw the game state onto the canvas.
   *
   * @param ctx Canvas rendering context
   * @param udt Update delta time
   * @param elapsedTime Elapsed time since game start
   * @param roomState Current state from the server
   */
  draw(
    ctx: CanvasRenderingContext2D,
    udt: number,
    elapsedTime: number,
    roomState: any
  ): void {
    if (!this.visibilityMatrix) return;
    if (!this.gameGrid) return; // Ensure the grid is available

    let gridPos = { x: 0, y: 0 };
    ctx.save();

    const thisPlayer = this.playerShips.get(this.playerSessionID);
    if (thisPlayer) {
      ctx.translate(
        this.displayWidth / 2 - thisPlayer.rx,
        this.displayHeight / 2 - thisPlayer.ry
      );
      gridPos = this.gridPosForPoint({ x: thisPlayer.x, y: thisPlayer.y });
    } else {
      ctx.translate(
        (this.displayWidth - this.gameAreaWidth) / 2,
        (this.displayHeight - this.gameAreaHeight) / 2
      );
      gridPos = this.gridPosForPoint({
        x: (this.displayWidth - this.gameAreaWidth) / 2,
        y: (this.displayHeight - this.gameAreaHeight) / 2,
      });
    }

    const visibilitySet = new Set<string>();
    this.visibilityMatrix[gridPos.y][gridPos.x].forEach((pt: any) => {
      visibilitySet.add(`${pt.x},${pt.y}`);
    });

    // Render background
    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.fillRect(0, 0, this.gameAreaWidth, this.gameAreaHeight);

    // Draw the grid based on visibility
    this.drawGrid(ctx, visibilitySet);

    // Update FPS
    this.renderUpdateTimestamps.push(elapsedTime);
    if (this.renderUpdateTimestamps.length > 50) {
      const firstTimestamp = this.renderUpdateTimestamps.shift();
      if (firstTimestamp !== undefined) {
        const secondsPassed = (elapsedTime - firstTimestamp) / 1000;
        this.framesPerSecond = 50 / secondsPassed;
      }
    }

    // Draw all player ships
    for (const playerShip of this.playerShips.values()) {
      const color =
        playerShip.sessionId === this.playerSessionID ? "blue" : "red";

      // Determine visibility
      let isVisible = true;
      if (playerShip.sessionId !== this.playerSessionID) {
        isVisible = this.canSeePoint(visibilitySet, {
          x: playerShip.x,
          y: playerShip.y,
        });
      }

      if (isVisible) {
        this.ssRenderer.render(
          playerShip.rx,
          playerShip.ry,
          playerShip.vx,
          playerShip.vy,
          playerShip.direction,
          color,
          playerShip.accel,
          ctx,
          playerShip.name,
          this.showPlayerLabels,
          true,
          playerShip.health,
          playerShip.maxHealth,
          playerShip.shipType
        );
      }
    }

    // Draw all projectiles
    roomState.projectiles.forEach((projectile: any) => {
      const lx: number = projectile.x;
      const ly: number = projectile.y;
      const lvx: number = projectile.vx;
      const lvy: number = projectile.vy;

      if (
        this.canSeePoint(visibilitySet, {
          x: lx,
          y: ly,
        })
      ) {
        if (projectile.projectileType === projectileTypes.Laser) {
          this.ssRenderer.renderLaser(
            lx + lvx * udt,
            ly + lvy * udt,
            projectile.direction,
            ctx
          );
        } else if (projectile.projectileType === projectileTypes.Cannonball) {
          this.ssRenderer.renderCannonball(lx + lvx * udt, ly + lvy * udt, ctx);
        }
      }
    });

    ctx.restore();

    // Render UI elements
    this.renderScores(ctx, roomState);

    if (this.showServerMetrics) {
      this.renderServerMetrics(ctx, roomState);
    }

    if (this.showInstructions) {
      this.renderInstructions(ctx);
    }
  }

  /**
   * Determines if a point is visible based on the visibility set.
   *
   * @param visibilitySet Set of visible cell keys (e.g., "x,y")
   * @param pt Point to check
   * @returns True if visible, false otherwise
   */
  canSeePoint(
    visibilitySet: Set<string>,
    pt: { x: number; y: number }
  ): boolean {
    const gridPos = this.gridPosForPoint(pt);
    return visibilitySet.has(`${gridPos.x},${gridPos.y}`);
  }

  /**
   * Draws the grid on the canvas based on visibility.
   *
   * @param context Canvas rendering context
   * @param visibilitySet Set of visible cell keys
   */
  drawGrid(
    context: CanvasRenderingContext2D,
    visibilitySet: Set<string>
  ): void {
    for (let y = 0; y < this.gameGrid.length; y++) {
      for (let x = 0; x < this.gameGrid[y].length; x++) {
        const cellKey = `${x},${y}`;
        const isVisible = visibilitySet.has(cellKey);
        const hasBeenSeen = this.seenGrid[y][x] !== null;

        const currentCell = this.gameGrid[y][x];
        const lastSeenCell = this.seenGrid[y][x];

        // Update seenGrid if the cell is currently visible
        if (isVisible) {
          this.seenGrid[y][x] = currentCell;
        }

        // Determine which cell state to render
        const cellToRender = isVisible ? currentCell : lastSeenCell;

        if (cellToRender === null) {
          // Render as unexplored
          this.drawUnexplored(context, x, y);
          continue;
        }

        // Determine rendering style based on material and visibility
        if (cellToRender === 1) {
          // Rock cell
          context.fillStyle = isVisible
            ? "rgb(160, 160, 160)" // Visible rock
            : "rgb(200, 200, 200)"; // Previously seen rock
        } else {
          // Free space
          context.fillStyle = isVisible
            ? "rgb(255, 255, 255)" // Visible free space
            : "rgb(240, 240, 240)"; // Previously seen free space
        }

        const xPos = x * this.cellSize;
        const yPos = y * this.cellSize;

        // Draw the cell background
        context.fillRect(xPos, yPos, this.cellSize, this.cellSize);

        // Optionally, draw outlines for better visibility
        if (isVisible) {
          context.strokeStyle = "black";
          context.lineWidth = 1;
          context.strokeRect(xPos, yPos, this.cellSize, this.cellSize);
        } else {
          context.strokeStyle = "grey";
          context.lineWidth = 1;
          context.strokeRect(xPos, yPos, this.cellSize, this.cellSize);
        }
      }
    }
  }

  /**
   * Draws an unexplored cell.
   *
   * @param context The canvas rendering context.
   * @param x The cell's x-coordinate.
   * @param y The cell's y-coordinate.
   */
  drawUnexplored(
    context: CanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    const xPos = x * this.cellSize;
    const yPos = y * this.cellSize;

    context.fillStyle = "rgb(50, 50, 50)"; // Dark grey for unexplored
    context.fillRect(xPos, yPos, this.cellSize, this.cellSize);

    // Optionally, draw a fog or pattern
    context.strokeStyle = "rgb(80, 80, 80)";
    context.lineWidth = 1;
    context.strokeRect(xPos, yPos, this.cellSize, this.cellSize);
  }

  /**
   * Returns the grid position when passed a coordinate.
   *
   * @param pt The x y point to be tested.
   * @returns The grid position of that point.
   */
  gridPosForPoint(pt: { x: number; y: number }): { x: number; y: number } {
    const returnPos = { x: 0, y: 0 };

    // Find the grid cell that we are currently in
    returnPos.x = Math.max(
      0,
      Math.min(this.gridSize - 1, Math.floor(pt.x / this.cellSize))
    );
    returnPos.y = Math.max(
      0,
      Math.min(this.gridSize - 1, Math.floor(pt.y / this.cellSize))
    );

    return returnPos;
  }

  /**
   * Renders the score, lists players in order of current score
   * and renders a simple graphic of the player ship.
   *
   * @param ctx Drawing context to render scores to.
   * @param roomState Current room state with players and scores.
   */
  renderScores(ctx: CanvasRenderingContext2D, roomState: any): void {
    const sortedPlayers = this.getSortedPlayers(roomState);
    ctx.fillStyle = "black";
    ctx.font = "16px Courier";
    ctx.textAlign = "right";

    let maxWidth = 0;
    (sortedPlayers as Array<[string, any]>).forEach(([id, player], index) => {
      const playerLabel = String(player.username) + ": " + String(player.score);
      const textWidth = ctx.measureText(playerLabel).width;
      if (textWidth > maxWidth) {
        maxWidth = textWidth;
      }
    });

    // Include some padding between the spaceship and the text
    const padding = 30;

    // Using sortedPlayers array for ordering
    (sortedPlayers as Array<[string, any]>).forEach(([id, player], index) => {
      const playerLabel = String(player.username) + ": " + String(player.score);

      ctx.fillStyle = "rgba(10, 10, 10, 1)";
      ctx.fillText(playerLabel, this.displayWidth - 10, 20 + index * 20);

      // Render a small spaceship to the left of the player name, shifted by maxWidth
      this.ssRenderer.render(
        this.displayWidth - maxWidth - padding - 10, // Shifted x-position
        12 + index * 20, // Same y-position as the text
        0, // Static vx
        0, // Static vy
        player.direction, // Same orientation
        id === this.playerSessionID ? "blue" : "red", // Same color
        player.accel, // No acceleration
        ctx,
        "",
        false,
        false,
        1,
        1,
        player.shipType
      );
    });
  }

  /**
   * Renders server metrics on the canvas.
   *
   * @param ctx Drawing context to render metrics to.
   * @param roomState Current room state with metrics.
   */
  renderServerMetrics(ctx: CanvasRenderingContext2D, roomState: any): void {
    const fontSize = 14;
    ctx.font = `${fontSize}px Courier`;
    ctx.fillStyle = "blue";
    ctx.textAlign = "left";

    const metrics = [
      "Clients Count....: " + String(roomState.currentClientsCount),
      "Max Clients......: " + String(roomState.maxClientsCountLastMinute),
      "High Score Player: " + String(roomState.highestScorePlayer),
      "High Score.......: " + String(roomState.highestScore),
      "Max fr per update: " + String(this.maxFramesBetweenState),
      "Server LPS.......: " +
        String(roomState.gameUpdateCyclesPerSecond.toFixed(2)),
      "Server UPS.......: " + String(this.updatesPerSecond.toFixed(2)),
      "FPS..............: " + String(this.framesPerSecond.toFixed(2)),
    ];

    const xOffset = 20; // Adjust as needed
    const yOffset = 150; // Adjust as needed

    for (let i = 0; i < metrics.length; i++) {
      ctx.fillText(metrics[i], xOffset, yOffset + i * fontSize);
    }
  }

  /**
   * Renders game instructions on the canvas.
   *
   * @param ctx Drawing context to render instructions to.
   */
  renderInstructions(ctx: CanvasRenderingContext2D): void {
    const fontSize = 14;
    ctx.font = `${fontSize}px Courier`;
    ctx.fillStyle = "blue";
    ctx.textAlign = "left";

    const instructions = [
      "WASD or Arrow keys to move",
      "Space to fire",
      "L to toggle labels",
      "K to toggle metrics",
      "I to toggle these instructions",
      "T to toggle the ship type",
    ];

    const xOffset = 20;
    const yOffset = 300;

    for (let i = 0; i < instructions.length; i++) {
      ctx.fillText(instructions[i], xOffset, yOffset + i * fontSize);
    }
  }

  /**
   * Retrieves and sorts players based on their scores.
   *
   * @param roomState Current room state with players and scores.
   * @returns Sorted array of players.
   */
  getSortedPlayers(roomState: any): unknown[] {
    const playersArray = Array.from(roomState.players.entries());

    // Sort players by score in descending order
    return playersArray.sort(
      (a, b) => (b as any[])[1].score - (a as any[])[1].score
    );
  }

  /**
   * Sets the current player's session ID.
   *
   * @param newSessionID The new session ID.
   */
  setSessionID(newSessionID: string): void {
    this.playerSessionID = newSessionID;
  }

  /**
   * Updates the client-side game state based on the server's room state.
   *
   * @param roomState Current state from the server.
   */
  updateFromServer(roomState: any): void {
    // Update state received from the server
    this.lastStateUpdate = performance.now();
    this.framesBetweenState = 0;

    this.serverUpdateTimestamps.push(this.lastStateUpdate);
    if (this.serverUpdateTimestamps.length > 50) {
      const firstTimestamp = this.serverUpdateTimestamps.shift();
      if (firstTimestamp !== undefined) {
        const secondsPassed = (this.lastStateUpdate - firstTimestamp) / 1000;
        this.updatesPerSecond = 50 / secondsPassed;
      }
    }

    // Update grid and visibility matrix from server
    if (roomState.grid && roomState.visibilityMatrix) {
      this.gameGrid = roomState.grid;
      this.visibilityMatrix = roomState.visibilityMatrix;

      // Optionally, reset seenGrid if needed
      // this.resetSeenGrid();
    }

    // Update player ships
    const newStateIDs = new Set([...roomState.players.keys()]);

    // Update existing player ships
    for (const [sessionID, playerShip] of this.playerShips) {
      if (newStateIDs.has(sessionID)) {
        // Update properties
        const playerServerState = roomState.players.get(sessionID);
        if (playerServerState) {
          playerShip.name = playerServerState.username;
          playerShip.x = playerServerState.x;
          playerShip.y = playerServerState.y;
          playerShip.vx = playerServerState.vx;
          playerShip.vy = playerServerState.vy;
          playerShip.direction = playerServerState.direction;
          playerShip.vr = playerServerState.vr;
          playerShip.accel = playerServerState.accel;
          playerShip.firing = playerServerState.firing;
          playerShip.lastFired = playerServerState.lastFired;
          playerShip.score = playerServerState.score;
          playerShip.health = playerServerState.health;
          playerShip.maxHealth = playerServerState.maxHealth;
          playerShip.shipType = playerServerState.shipType;
        }

        // Remove the ID from the newStateIDs set
        newStateIDs.delete(sessionID);
      } else {
        // Remove player ship if not present in the new state
        this.playerShips.delete(sessionID);
      }
    }

    // Add new player ships
    for (const sessionID of newStateIDs) {
      const playerServerState = roomState.players.get(sessionID);
      if (playerServerState) {
        this.playerShips.set(
          sessionID,
          new PlayerShip(
            playerServerState.x,
            playerServerState.y,
            playerServerState.vx,
            playerServerState.vy,
            playerServerState.direction,
            playerServerState.vr,
            playerServerState.accel,
            playerServerState.username,
            playerServerState.firing,
            playerServerState.lastFired,
            playerServerState.score,
            sessionID
          )
        );
      }
    }
  }
}
