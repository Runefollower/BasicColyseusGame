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

  // Flag to indicate if the labels for players should be shown
  showPlayerLabels = false;

  // Flag to indicate if the labels for players should be shown
  showServerMetrics = false;

  // Flag to indicate if the instructions should be shown
  showInstructions = false;

  // The dimension of the displayed region
  displayWidth = 100;
  displayHeight = 100;

  // The dimension of the displayed region
  gameAreaWidth = 100;
  gameAreaHeight = 100;
  gridSize: number;
  cellSize: number;
  gameGrid: number[][];

  // seenGrid to track non-visible cells
  seenGrid: number[][];
  visibilityMatrix: any[][];
  TOP = 0b0001;
  RIGHT = 0b0010;
  BOTTOM = 0b0100;
  LEFT = 0b1000;

  /*
   *Client side performance stats
   */
  // To keep track the time of the last server update
  lastStateUpdate = 0.0;

  // To keep track the time of the last frame render
  lastFrameRender = 0.0;

  // For counting the number of frame updates since the
  // last server update
  framesBetweenState = 0;
  maxFramesBetweenState = 0;
  nextResetMax = 0;

  // Will become a queue of last X
  // frame updates to calculate moving
  // average framerate
  renderUpdateTimestamps: number[];
  framesPerSecond: number = 0.0;

  // Will become a queue of last X
  // server updates to calculate moving
  // average server updates per second
  serverUpdateTimestamps: number[];
  updatesPerSecond: number = 0.0;

  // Hide invisble parts of the map
  hideInvisible = true;

  constructor() {
    this.ssRenderer = new SpaceShipRender();

    // Initialize metrics to keep track of the framerate
    // and rate of server updates
    this.lastStateUpdate = performance.now();
    this.framesBetweenState = 0;
    this.renderUpdateTimestamps = [];
    this.serverUpdateTimestamps = [];
  }

  /**
   * Resets the seenGrid to all unseen.
   */
  resetSeenGrid(): void {
    this.seenGrid = Array(this.gridSize)
      .fill(undefined)
      .map(() => Array(this.gridSize).fill(null));
  }

  // Update the game engine, passed the udt or update delta time
  // the time since last update from the sever
  // and dt, time since last render
  update(udt: number, dt: number, elapsedTime: number): void {
    this.ssRenderer.update(dt);

    for (const playerShip of this.playerShips.values()) {
      playerShip.update(udt);
    }

    // Keep track of how many frames have been rendered
    // without a server update, and keep track of the
    // max max frames without update
    this.framesBetweenState++;
    if (
      this.framesBetweenState > this.maxFramesBetweenState ||
      elapsedTime > this.nextResetMax
    ) {
      this.maxFramesBetweenState = this.framesBetweenState;
      this.nextResetMax = elapsedTime + 60000;
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    udt: number,
    elapsedTime: number,
    roomState: any
  ): void {
    if (this.visibilityMatrix === undefined) return;

    let gridPos = { x: 0, y: 0 };
    ctx.save();

    const thisPlayer = this.playerShips.get(this.playerSessionID);
    if (thisPlayer !== null && thisPlayer !== undefined) {
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

    const visibilityArray: Array<{ x: number; y: number }> =
      this.visibilityMatrix[gridPos.y][gridPos.x];

    ctx.fillStyle = "rgb(255 255 255)";
    ctx.fillRect(0, 0, this.gameAreaWidth, this.gameAreaHeight);

    // Check that we have recieved the grid from server before rendering
    if (this.gameGrid !== null && this.gameGrid !== undefined) {
      this.drawGrid(ctx, gridPos);
    }

    this.renderUpdateTimestamps.push(elapsedTime);
    if (this.renderUpdateTimestamps.length > 50) {
      const firstTimestamp = this.renderUpdateTimestamps.shift();
      if (firstTimestamp !== undefined) {
        const secondsPassed = (elapsedTime - firstTimestamp) / 1000;
        this.framesPerSecond = 50 / secondsPassed;
      }
    }

    for (const playerShip of this.playerShips.values()) {
      const color =
        playerShip.sessionId === this.playerSessionID ? "blue" : "red";

      // Can this player be seen
      let isVisible = true;
      if (playerShip.sessionId !== this.playerSessionID) {
        isVisible = this.canSeePoint(visibilityArray, {
          x: playerShip.x,
          y: playerShip.y,
        });
      }

      if (isVisible) {
        this.ssRenderer.render(
          // playerShip.x + playerShip.vx * udt,
          // playerShip.y + playerShip.vy * udt,
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

    roomState.projectiles.forEach((projectile) => {
      const lx: number = projectile.x;
      const ly: number = projectile.y;
      const lvx: number = projectile.vx;
      const lvy: number = projectile.vy;

      if (
        this.canSeePoint(visibilityArray, {
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

    // Rendering game scores.
    this.renderScores(ctx, roomState);

    if (this.showServerMetrics) {
      this.renderServerMetrics(ctx, roomState);
    }

    if (this.showInstructions) {
      this.renderInstructions(ctx);
    }
  }

  canSeePoint(
    visibilityArray: Array<{ x: number; y: number }>,
    pt: { x: number; y: number }
  ): boolean {
    const gridPos = this.gridPosForPoint(pt);

    let isVisible = false;
    for (const visiblePt of visibilityArray) {
      if (visiblePt.x === gridPos.x && visiblePt.y === gridPos.y)
        isVisible = true;
    }

    return isVisible;
  }

  /**
   * Draws the entire grid on the canvas, handling visibility and previously seen cells.
   *
   * @param context The canvas rendering context.
   * @param playerPos The player's current grid position.
   */
  drawGrid(
    context: CanvasRenderingContext2D,
    playerPos: { x: number; y: number }
  ): void {
    context.lineWidth = 4; // Width of the walls

    const visibleCells: Array<{ x: number; y: number }> =
      this.visibilityMatrix[playerPos.y][playerPos.x];

    // Create a Set for faster lookup
    const visibleSet = new Set<string>();
    visibleCells.forEach((cell) => {
      visibleSet.add(`${cell.x},${cell.y}`);
    });

    for (let y = 0; y < this.gameGrid.length; y++) {
      for (let x = 0; x < this.gameGrid[y].length; x++) {
        const cellKey = `${x},${y}`;
        const isVisible = visibleSet.has(cellKey);
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
          // Optionally, skip rendering unseen cells or render them as unexplored
          // Uncomment the next line to skip rendering
          // continue;

          // Or, render as unexplored
          this.drawUnexplored(context, x, y);
          continue;
        }

        // Determine rendering style based on visibility
        if (
          cellToRender & this.LEFT &&
          cellToRender & this.RIGHT &&
          cellToRender & this.TOP &&
          cellToRender & this.BOTTOM
        ) {
          //This is a wall
          if (isVisible) {
            context.fillStyle = "rgb(160,160,160)"; // Visible wall
          } else {
            context.fillStyle = "rgb(200,200,200)"; // Previously seen wall
          }
        } else {
          if (isVisible) {
            context.fillStyle = "rgb(255,255,255)"; // Visible cells
          } else {
            context.fillStyle = "rgb(240,240,240)"; // Previously seen free space
          }
        }

        const xPos = x * this.cellSize;
        const yPos = y * this.cellSize;

        // Draw the cell background
        context.fillRect(xPos, yPos, this.cellSize, this.cellSize);

        // Draw walls based on cellToRender
        this.drawWalls(context, cellToRender, xPos, yPos, isVisible);
      }
    }
  }

  /**
   * Draws the walls for a given cell.
   *
   * @param context The canvas rendering context.
   * @param cell The cell's wall bitmask.
   * @param xPos The x-coordinate on the canvas.
   * @param yPos The y-coordinate on the canvas.
   * @param isVisible Whether the cell is currently visible.
   */
  drawWalls(
    context: CanvasRenderingContext2D,
    cell: number,
    xPos: number,
    yPos: number,
    isVisible: boolean
  ): void {
    // Define wall colors based on visibility
    context.strokeStyle = isVisible ? "black" : "grey"; // Outlines for previously seen

    // Draw top wall
    if ((cell & this.TOP) !== 0) {
      context.beginPath();
      context.moveTo(xPos, yPos);
      context.lineTo(xPos + this.cellSize, yPos);
      context.stroke();
    }

    // Draw right wall
    if ((cell & this.RIGHT) !== 0) {
      context.beginPath();
      context.moveTo(xPos + this.cellSize, yPos);
      context.lineTo(xPos + this.cellSize, yPos + this.cellSize);
      context.stroke();
    }

    // Draw bottom wall
    if ((cell & this.BOTTOM) !== 0) {
      context.beginPath();
      context.moveTo(xPos + this.cellSize, yPos + this.cellSize);
      context.lineTo(xPos, yPos + this.cellSize);
      context.stroke();
    }

    // Draw left wall
    if ((cell & this.LEFT) !== 0) {
      context.beginPath();
      context.moveTo(xPos, yPos + this.cellSize);
      context.lineTo(xPos, yPos);
      context.stroke();
    }

    // Optionally, draw cell outlines for previously seen but not currently visible cells
    if (
      !isVisible &&
      this.seenGrid[yPos / this.cellSize][xPos / this.cellSize] !== null
    ) {
      context.strokeStyle = "grey"; // Outline color for seen cells
      context.lineWidth = 2; // Thinner lines for outlines
      context.strokeRect(xPos, yPos, this.cellSize, this.cellSize);
      context.lineWidth = 4; // Reset to original line width
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

    context.fillStyle = "rgb(50,50,50)"; // Dark grey for unexplored
    context.fillRect(xPos, yPos, this.cellSize, this.cellSize);

    // Optionally, draw a fog or pattern
    context.strokeStyle = "rgb(80,80,80)";
    context.strokeRect(xPos, yPos, this.cellSize, this.cellSize);
  }

  /**
   * Returns the grid position when passed a coordinate
   *
   * @param pt The x y point to be tested
   * @returns The grid position of that point
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
   * @param ctx Drawing context to render scores to
   * @param roomState Current room state with players and scores
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

      // Render a small spaceship to the left of the player name, shift by maxWidth
      this.ssRenderer.render(
        this.displayWidth - maxWidth - padding - 10, // shifted x-position
        12 + index * 20, // same y-position as the text
        0, // static vx
        0, // static vy
        player.direction, // same orientation
        id === this.playerSessionID ? "blue" : "red", // same color
        player.accel, // no acceleration
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

    const xOffset = 20; // Adjust this as needed
    const yOffset = 150; // Adjust this as needed

    for (let i = 0; i < metrics.length; i++) {
      ctx.fillText(metrics[i], xOffset, yOffset + i * fontSize);
    }
  }

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

  getSortedPlayers(roomState: any): unknown[] {
    const playersArray = Array.from(roomState.players.entries());

    // The 'as' structures lets the sort know the unkown passe to sort are arrays of objects from server
    return playersArray.sort(
      (a, b) => (b as any[])[1].score - (a as any[])[1].score
    );
  }

  setSessionID(newSessionID: string): void {
    this.playerSessionID = newSessionID;
  }

  updateFromServer(roomState: any): void {
    // Update state received from the server
    // keeping track of the timestep and resetting the counter to check
    // frames without update
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

    // Create a set of all session IDs in the new state
    // const newStateIDs = new Set(Object.keys(roomState.players));
    const newStateIDs = new Set([...roomState.players.keys()]);

    // Iterate over the existing playerShips map
    for (const [sessionID, playerShip] of this.playerShips) {
      if (newStateIDs.has(sessionID)) {
        // If this player exists in the new state, update its properties
        const playerServerState = roomState.players[sessionID];
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

        // Remove the ID from the newStateIDs set
        newStateIDs.delete(sessionID);
      } else {
        // If this player doesn't exist in the new state, remove it
        this.playerShips.delete(sessionID);
      }
    }

    // Any IDs left over in newStateIDs are new players, so add them to the map
    for (const sessionID of newStateIDs) {
      const playerServerState = roomState.players[sessionID];
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
          playerServerState.name,
          playerServerState.firing,
          playerServerState.lastFired,
          playerServerState.score,
          sessionID
        )
      );
    }
  }
}
