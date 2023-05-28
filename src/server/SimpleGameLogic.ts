import { type Client } from "colyseus";
import { type GameState, Player, Laser } from "./GameState";
import { generateLogWithTimestamp } from "./ServerTools";
import { GameGridGenerator } from "./GameGridGenerator";
import { ComputerPlayer } from "./ComputerPlayer";

const gridSize = 30;
const SimpleGameMetrics = {
  gridSize,
  playAreaWidth: gridSize * 100,
  playAreaHeight: gridSize * 100,
  cellSize: 100,
  acceleration: 0.01,
  angularAcceleration: 0.005,
  drag: -0.01,
  laserSpeed: 0.4,
  playerRadius: 10,
  fireDelayInterval: 200,
  laserDamage: 25,
  grid: [
    [0, 0],
    [0, 0],
  ],
};

// Controls for metrics updates
let nextMinuteUpdate = 0;
let nextLogMetricsUpdate = 0;

/**
 * Main class for the game logic
 */
export class SimpleGameLogic {
  state: GameState;
  gameUpdateTimestamps: number[];
  gridGen = new GameGridGenerator(SimpleGameMetrics.gridSize);
  computerPlayers: ComputerPlayer[];

  constructor(state: GameState) {
    this.state = state;
    this.gameUpdateTimestamps = [];
    this.computerPlayers = [];

    /*
    // This would generate a random pattern of walls
    SimpleGameMetrics.grid = this.gridGen.generateRandomGrid();
    */

    // Generate a grid from standard 10 X 10 blocks
    SimpleGameMetrics.grid =
      this.gridGen.generateGridFromPredefinedPatterns(false);

    this.addNewComputerPlayer();
  }

  /**
   * Add a new player controled by the computer to the game
   */
  addNewComputerPlayer(): void {
    // Add the computer player
    const computerPlayerPosition = this.generateSpawnPosition();
    const computerSessionID = "PC 01";

    const computerPlayerState = new Player(
      "Computer",
      computerPlayerPosition.x,
      computerPlayerPosition.y
    );
    this.computerPlayers.push(
      new ComputerPlayer(this, computerPlayerState, computerSessionID)
    );

    this.state.players.set(computerSessionID, computerPlayerState);
  }

  /**
   * Returns game metrics, parameters that will not change during the game
   *
   * @returns Game metrics
   */
  getInitializationData(): any {
    return SimpleGameMetrics;
  }

  /**
   * Process client messages such as key movement
   *
   * @param client The client generating input
   * @param input String message from client typically indicating key activity
   */
  handleInput(sessionID: string, input: string): void {
    if (this.state.players.has(sessionID)) {
      const player = this.state.players.get(sessionID);

      switch (input) {
        case "w-down":
          player.accel = SimpleGameMetrics.acceleration;
          break;
        case "s-down":
          player.accel = -1 * SimpleGameMetrics.acceleration;
          break;
        case "a-down":
          player.vr = -1 * SimpleGameMetrics.angularAcceleration;
          break;
        case "d-down":
          player.vr = SimpleGameMetrics.angularAcceleration;
          break;
        case "a-up":
        case "d-up":
          player.vr = 0;
          break;
        case "w-up":
        case "s-up":
          player.accel = 0;
          break;
        case "fire-down":
          player.firing = true;
          break;
        case "fire-up":
          player.firing = false;
          break;
      }
    }
  }

  /**
   * Add a new player into the game.  Called when they join for the first time
   *
   * @param client The client object for this player
   * @param username The name selected by the player
   */
  addPlayer(client: Client, username: string): void {
    const pos = this.generateSpawnPosition();

    this.state.players.set(
      client.sessionId,
      new Player(username, pos.x, pos.y)
    );
  }

  /**
   * Generate a spawn location for the player ensuring that
   * the player is not in a locked in block
   *
   * @returns The new position for the player
   */
  generateSpawnPosition(): { x: number; y: number } {
    let spawnPosition = {
      x: Math.floor(Math.random() * SimpleGameMetrics.playAreaWidth),
      y: Math.floor(Math.random() * SimpleGameMetrics.playAreaHeight),
    };

    // Check if the spawn position is within a walled cell
    while (this.isInWalledCell(spawnPosition.x, spawnPosition.y)) {
      console.log("hit a block");
      spawnPosition = {
        x: Math.floor(Math.random() * SimpleGameMetrics.playAreaWidth),
        y: Math.floor(Math.random() * SimpleGameMetrics.playAreaHeight),
      };
    }

    return spawnPosition;
  }

  /**
   * Checks if a given point in game coordinates is located within a cell that has all four walls.
   *
   * @param x - The x-coordinate of the point in game coordinates.
   * @param y - The y-coordinate of the point in game coordinates.
   * @returns True if the point is within a cell with all four walls, false otherwise.
   */
  isInWalledCell(x: number, y: number): boolean {
    const gridX = Math.floor(x / SimpleGameMetrics.cellSize);
    const gridY = Math.floor(y / SimpleGameMetrics.cellSize);

    // Check if the cell at (gridX, gridY) has all walls
    return SimpleGameMetrics.grid[gridY][gridX] === 0b1111;
  }

  /**
   * Removes a client from the game
   *
   * @param client Client to be removed from the game
   */
  removePlayer(client: Client): void {
    this.state.players.delete(client.sessionId);
  }

  /**
   * Update the state of the game for the next game cycle.
   *
   * @param deltaTime Time since the last game update in millis
   * @param elapsedTime Time since game start in millis
   */
  update(deltaTime: number, elapsedTime: number): void {
    // update the computer managed players
    this.computerPlayers.forEach((computerPlayer) => {
      computerPlayer.update(deltaTime, elapsedTime);
    });

    this.state.players.forEach((player, sessionId) => {
      // Compute proposed new position
      const newVx =
        player.vx +
        Math.cos(player.direction) * player.accel +
        SimpleGameMetrics.drag * player.vx;
      const newVy =
        player.vy +
        Math.sin(player.direction) * player.accel +
        SimpleGameMetrics.drag * player.vy;
      const newX = player.x + newVx * deltaTime;
      const newY = player.y + newVy * deltaTime;

      // Check for wall collisions
      const playerCollisionCorrection = this.checkForWallCollision(
        player.x,
        player.y,
        newX,
        newY,
        newVx,
        newVy,
        SimpleGameMetrics.playerRadius
      );

      // Update player position and velocity
      player.vx = playerCollisionCorrection.vx;
      player.vy = playerCollisionCorrection.vy;
      player.x = playerCollisionCorrection.newX;
      player.y = playerCollisionCorrection.newY;

      player.direction += player.vr * deltaTime;

      // wrap the player position if somehow we escaped
      if (player.x > SimpleGameMetrics.playAreaWidth) {
        player.x = 0;
      } else if (player.x < 0) {
        player.x = SimpleGameMetrics.playAreaWidth;
      }

      if (player.y > SimpleGameMetrics.playAreaHeight) {
        player.y = 0;
      } else if (player.y < 0) {
        player.y = SimpleGameMetrics.playAreaHeight;
      }

      player.direction = (player.direction + 2 * Math.PI) % (2 * Math.PI);

      // if the player is in firing mode, see if we can generate a new fire event
      if (
        player.firing &&
        elapsedTime - player.lastFired >= SimpleGameMetrics.fireDelayInterval
      ) {
        this.state.lasers.push(
          new Laser(
            player.x +
              Math.cos(player.direction) * SimpleGameMetrics.playerRadius,
            player.y +
              Math.sin(player.direction) * SimpleGameMetrics.playerRadius,
            Math.cos(player.direction) * SimpleGameMetrics.laserSpeed +
              player.vx,
            Math.sin(player.direction) * SimpleGameMetrics.laserSpeed +
              player.vy,
            player.direction,
            sessionId
          )
        );
        player.lastFired = elapsedTime;
      }
    }); // end the player loop

    // Update laser positions and reduce remaining time
    // remove if the time limit is hit or it hit a wall
    this.state.lasers = this.state.lasers.filter((laser) => {
      const newX = laser.x + laser.vx * deltaTime;
      const newY = laser.y + laser.vy * deltaTime;
      laser.remainingTime -= deltaTime;

      // Check for wall collisions
      const laserCollision = this.checkForWallCollision(
        laser.x,
        laser.y,
        newX,
        newY,
        laser.vx,
        laser.vy,
        1
      );

      laser.x = newX;
      laser.y = newY;

      // Keep the laser only if the remaining time is greater than zero
      return laser.remainingTime > 0 && !laserCollision.hit;
    });

    // Check for collisions between lasers and ships
    for (const laser of this.state.lasers) {
      for (const player of this.state.players.values()) {
        const dx = laser.x - player.x;
        const dy = laser.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= SimpleGameMetrics.playerRadius) {
          // Laser hit a ship
          const attacker = this.state.players.get(laser.ownerSessionId);

          // check that you did not shoot yourself
          if (
            attacker !== null &&
            attacker !== undefined &&
            attacker !== player
          ) {
            // apply damage
            player.health -= SimpleGameMetrics.laserDamage;

            // Remove the laser
            this.state.lasers.splice(this.state.lasers.indexOf(laser), 1);

            // Was this a kill?
            if (player.health <= 0) {
              attacker.score += 1;

              // Respawn the hit player in a random location
              const pos = this.generateSpawnPosition();
              player.x = pos.x;
              player.y = pos.y;
              player.vx = 0.0;
              player.vy = 0.0;
              player.direction = Math.random() * 2 * Math.PI;
              player.health = player.maxHealth;

              console.log(
                generateLogWithTimestamp(
                  "PlayerHit " +
                    String(attacker.username) +
                    " killed " +
                    String(player.username) +
                    ", " +
                    String(attacker.username) +
                    " score:" +
                    String(attacker.score)
                )
              );
            } else {
              console.log(
                generateLogWithTimestamp(
                  "PlayerHit " +
                    String(attacker.username) +
                    " hit " +
                    String(player.username)
                )
              );
            }

            break;
          }
        }
      }
    }

    // Remove lasers that are out of bounds
    this.state.lasers = this.state.lasers.filter((laser) => {
      return (
        laser.x >= 0 &&
        laser.x <= SimpleGameMetrics.playAreaWidth &&
        laser.y >= 0 &&
        laser.y <= SimpleGameMetrics.playAreaHeight
      );
    });

    this.updateMetrics(elapsedTime);
  }

  /**
   * Checks to see if there is a collision with a wall.  If there
   * is it will return a new position relative to the wall and reduce
   * the velocity in that direction to zero.
   *
   * @param x Initial x position of entity
   * @param y Initial y position of entity
   * @param newX New proposed x position
   * @param newY New proposed y position
   * @param vx New proposed x velocity
   * @param vy New proposed y velocity
   * @param radius Collision radius
   * @returns New entity position and velocity and indication of collision
   */
  checkForWallCollision(
    x: number,
    y: number,
    newX: number,
    newY: number,
    vx: number,
    vy: number,
    radius: number
  ): { newX: number; newY: number; vx: number; vy: number; hit: boolean } {
    const newVal = {
      newX,
      newY,
      vx,
      vy,
      hit: false,
    };
    // Find the grid cell that we are currently in
    const gridX = Math.max(
      0,
      Math.min(
        SimpleGameMetrics.gridSize - 1,
        Math.floor(x / SimpleGameMetrics.cellSize)
      )
    );
    const gridY = Math.max(
      0,
      Math.min(
        SimpleGameMetrics.gridSize - 1,
        Math.floor(y / SimpleGameMetrics.cellSize)
      )
    );
    const gridCell = SimpleGameMetrics.grid[gridY][gridX];

    // Check for collisions with the left and right
    const newXinCell = newX - gridX * SimpleGameMetrics.cellSize;
    if (
      (gridCell & this.gridGen.wallMask.R) !== 0 &&
      newXinCell + radius > SimpleGameMetrics.cellSize
    ) {
      // Collided with right wall
      newVal.hit = true;
      newVal.vx = 0; // Stop horizontal movement
      newVal.newX =
        gridX * SimpleGameMetrics.cellSize +
        SimpleGameMetrics.cellSize -
        radius; // Move to the left of the wall
    } else if (
      (gridCell & this.gridGen.wallMask.L) !== 0 &&
      newXinCell - radius < 0
    ) {
      // Collided with left wall
      newVal.hit = true;
      newVal.vx = 0; // Stop horizontal movement
      newVal.newX = gridX * SimpleGameMetrics.cellSize + radius; // Move to the right of the wall
    }

    // Check for collisions with the top and bottom
    const newYinCell = newY - gridY * SimpleGameMetrics.cellSize;
    if (
      (gridCell & this.gridGen.wallMask.B) !== 0 &&
      newYinCell + radius > SimpleGameMetrics.cellSize
    ) {
      // Collided with bottom wall
      newVal.hit = true;
      newVal.vy = 0; // Stop vertical movement
      newVal.newY =
        gridY * SimpleGameMetrics.cellSize +
        SimpleGameMetrics.cellSize -
        radius; // Move above the wall
    } else if (
      (gridCell & this.gridGen.wallMask.T) !== 0 &&
      newYinCell - radius < 0
    ) {
      // Collided with top wall
      newVal.hit = true;
      newVal.vy = 0; // Stop vertical movement
      newVal.newY = gridY * SimpleGameMetrics.cellSize + radius; // Move below the wall
    }

    return newVal;
  }

  updateMetrics(elapsedTime: number): void {
    // Update client count
    this.state.currentClientsCount = this.state.players.size;
    this.state.maxClientsCountLastMinute = Math.max(
      this.state.currentClientsCount,
      this.state.maxClientsCountLastMinute
    );

    // Update game cycles count
    this.gameUpdateTimestamps.push(elapsedTime);
    if (this.gameUpdateTimestamps.length > 50) {
      const firstTimestamp = this.gameUpdateTimestamps.shift();
      const secondsPassed = (elapsedTime - firstTimestamp) / 1000;
      this.state.gameUpdateCyclesPerSecond = 50 / secondsPassed;
    }

    // Update highest score
    this.state.players.forEach((player, sessionId) => {
      if (player.score > this.state.highestScore) {
        this.state.highestScore = player.score;
        this.state.highestScorePlayer = player.username;
      }
    });

    // Reset max clients count every minute
    if (elapsedTime > nextMinuteUpdate) {
      this.state.maxClientsCountLastMinute = this.state.currentClientsCount;
      nextMinuteUpdate = elapsedTime + 60000;
    }

    if (elapsedTime > nextLogMetricsUpdate && this.state.players.size > 0) {
      nextLogMetricsUpdate = elapsedTime + 60000;

      console.log(
        generateLogWithTimestamp(
          `Clients Count: ${this.state.currentClientsCount}, Max Clients: ${
            this.state.maxClientsCountLastMinute
          }, UPS: ${this.state.gameUpdateCyclesPerSecond.toFixed(
            2
          )}, High Score: ${this.state.highestScorePlayer} ${
            this.state.highestScore
          }`
        )
      );
    }
  }
}
