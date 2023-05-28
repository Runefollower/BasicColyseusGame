import { type Client } from "colyseus";
import { type GameState, Player, Laser } from "./GameState";
import { generateLogWithTimestamp } from "./ServerTools";
import { GameGridGenerator } from "./GameGridGenerator";

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

export class SimpleGameLogic {
  state: GameState;
  gameUpdateTimestamps: number[];
  gridGen = new GameGridGenerator(SimpleGameMetrics.gridSize);

  constructor(state: GameState) {
    this.state = state;
    this.gameUpdateTimestamps = [];

    /*
    // This would generate a random pattern of walls
    SimpleGameMetrics.grid = this.gridGen.generateRandomGrid();
    */

    // Generate a grid from standard 10 X 10 blocks
    SimpleGameMetrics.grid = this.gridGen.generateGridFromPredefinedPatterns();
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
        (gridCell & this.gridGen.wallMask.R) !== 0 &&
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
        (gridCell & this.gridGen.wallMask.L) !== 0 &&
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
        (gridCell & this.gridGen.wallMask.B) !== 0 &&
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
        (gridCell & this.gridGen.wallMask.T) !== 0 &&
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
