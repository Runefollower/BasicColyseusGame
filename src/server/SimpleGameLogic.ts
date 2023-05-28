import { type Client } from "colyseus";
import { type GameState, Player, Laser } from "./GameState";
import { generateLogWithTimestamp } from "./ServerTools";

const gridSize = 3;

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

  // Initialize the grid as an empty grid (no walls)
  grid: Array(gridSize)
    .fill(undefined)
    .map(() => Array(gridSize).fill(0b0000)), // binary for no walls
};

// Now you can use bitwise OR to set wall values
// Define some constants for readability
const T = 0b0001;
const R = 0b0010;
const B = 0b0100;
const L = 0b1000;

// Controls for metrics updates
let nextMinuteUpdate = 0;
let nextLogMetricsUpdate = 0;

export class SimpleGameLogic {
  state: GameState;
  gameUpdateTimestamps: number[];

  constructor(state: GameState) {
    this.state = state;
    this.gameUpdateTimestamps = [];

    this.populateGrid();
    this.removeLockedWalls();
  }

  populateGrid(): void {
    // Initialize the grid as an empty grid (no walls)
    const grid: number[][] = Array(gridSize)
      .fill(undefined)
      .map(() => Array(gridSize).fill(0b0000)); // binary for no walls

    // Randomly generate walls
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        // For cells not on the boundary
        if (x > 0 && x < gridSize - 1 && y > 0 && y < gridSize - 1) {
          // Randomly decide if there should be a wall on the right
          if (Math.random() < 0.15) {
            grid[y][x] |= R;
            grid[y][x + 1] |= L;
          }
          // Randomly decide if there should be a wall on the bottom
          if (Math.random() < 0.15) {
            grid[y][x] |= B;
            grid[y + 1][x] |= T;
          }
        }

        // For cells on the boundary
        if (x === 0) {
          grid[y][x] |= L;
        }
        if (x === gridSize - 1) {
          grid[y][x] |= R;
        }
        if (y === 0) {
          grid[y][x] |= T;
        }
        if (y === gridSize - 1) {
          grid[y][x] |= B;
        }
      }
    }

    SimpleGameMetrics.grid = grid;
  }

  removeLockedWalls(): void {
    // Create a grid to track visited cells
    const visited = Array(gridSize)
      .fill(false)
      .map(() => Array(gridSize).fill(false));

    // Recursive function to perform the depth-first search
    function dfs(x: number, y: number): void {
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
      if ((SimpleGameMetrics.grid[y][x] & T) === 0) {
        dfs(x, y - 1);
      }
      if ((SimpleGameMetrics.grid[y][x] & R) === 0) {
        dfs(x + 1, y);
      }
      if ((SimpleGameMetrics.grid[y][x] & B) === 0) {
        dfs(x, y + 1);
      }
      if ((SimpleGameMetrics.grid[y][x] & L) === 0) {
        dfs(x - 1, y);
      }
    }

    // Start the search from the top-left cell (or any cell on the boundary)
    dfs(0, 0);

    // Check for cells that weren't visited and remove a wall to make them reachable
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (visited[y][x] === false) {
          // Remove a wall. In this case, we'll remove the top wall, but you can choose any wall depending on your needs
          SimpleGameMetrics.grid[y][x] &= ~T;
          // If not in the top row, add a corresponding opening in the cell above
          if (y > 0) {
            SimpleGameMetrics.grid[y - 1][x] &= ~B;
          }
        }
      }
    }
  }

  getInitializationData(): any {
    return SimpleGameMetrics;
  }

  handleInput(client: Client, input: string): void {
    if (this.state.players.has(client.sessionId)) {
      const player = this.state.players.get(client.sessionId);

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

  addPlayer(client: Client, username: string): void {
    this.state.players.set(
      client.sessionId,
      new Player(
        username,
        Math.random() * SimpleGameMetrics.playAreaWidth,
        Math.random() * SimpleGameMetrics.playAreaHeight
      )
    );
  }

  removePlayer(client: Client): void {
    this.state.players.delete(client.sessionId);
  }

  update(deltaTime: number, elapsedTime: number): void {
    this.state.players.forEach((player, sessionId) => {
      // Compute proposed new position
      let newVx =
        player.vx +
        Math.cos(player.direction) * player.accel +
        SimpleGameMetrics.drag * player.vx;
      let newVy =
        player.vy +
        Math.sin(player.direction) * player.accel +
        SimpleGameMetrics.drag * player.vy;
      let newX = player.x + newVx * deltaTime;
      let newY = player.y + newVy * deltaTime;

      // Check if proposed new position would collide with a wall
      const gridX = Math.max(
        0,
        Math.min(
          SimpleGameMetrics.gridSize - 1,
          Math.floor(player.x / SimpleGameMetrics.cellSize)
        )
      );
      const gridY = Math.max(
        0,
        Math.min(
          SimpleGameMetrics.gridSize - 1,
          Math.floor(player.y / SimpleGameMetrics.cellSize)
        )
      );
      const gridCell = SimpleGameMetrics.grid[gridY][gridX];

      if (
        (gridCell & R) !== 0 &&
        newX -
          gridX * SimpleGameMetrics.cellSize +
          SimpleGameMetrics.playerRadius >
          SimpleGameMetrics.cellSize
      ) {
        // Collided with right wall
        newVx = 0; // Stop horizontal movement
        newX =
          gridX * SimpleGameMetrics.cellSize +
          SimpleGameMetrics.cellSize -
          SimpleGameMetrics.playerRadius; // Move to the left of the wall
      } else if (
        (gridCell & L) !== 0 &&
        newX -
          gridX * SimpleGameMetrics.cellSize -
          SimpleGameMetrics.playerRadius <
          0
      ) {
        // Collided with left wall
        newVx = 0; // Stop horizontal movement
        newX =
          gridX * SimpleGameMetrics.cellSize + SimpleGameMetrics.playerRadius; // Move to the right of the wall
      }

      if (
        (gridCell & B) !== 0 &&
        newY -
          gridY * SimpleGameMetrics.cellSize +
          SimpleGameMetrics.playerRadius >
          SimpleGameMetrics.cellSize
      ) {
        // Collided with bottom wall
        newVy = 0; // Stop vertical movement
        newY =
          gridY * SimpleGameMetrics.cellSize +
          SimpleGameMetrics.cellSize -
          SimpleGameMetrics.playerRadius; // Move above the wall
      } else if (
        (gridCell & T) !== 0 &&
        newY -
          gridY * SimpleGameMetrics.cellSize -
          SimpleGameMetrics.playerRadius <
          0
      ) {
        // Collided with top wall
        newVy = 0; // Stop vertical movement
        newY =
          gridY * SimpleGameMetrics.cellSize + SimpleGameMetrics.playerRadius; // Move below the wall
      }

      // Update player position and velocity
      player.vx = newVx;
      player.vy = newVy;
      player.x = newX;
      player.y = newY;

      player.direction += player.vr * deltaTime;

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
    });

    // Update laser positions and reduce remaining time
    this.state.lasers = this.state.lasers.filter((laser) => {
      laser.x += laser.vx * deltaTime;
      laser.y += laser.vy * deltaTime;
      laser.remainingTime -= deltaTime;

      // Keep the laser only if the remaining time is greater than zero
      return laser.remainingTime > 0;
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
              player.x = Math.random() * SimpleGameMetrics.playAreaWidth;
              player.y = Math.random() * SimpleGameMetrics.playAreaHeight;
              player.vx = 0.0;
              player.vy = 0.0;
              player.direction = Math.random() * 2 * Math.PI;
              player.health = player.maxHealth;

              console.log(
                generateLogWithTimestamp(
                  "PlayerHit    " +
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
                  "PlayerHit    " +
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
