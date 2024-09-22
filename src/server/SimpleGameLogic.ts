import { type Client } from "colyseus";
import { type GameState, Player, Projectile } from "./GameState";
import { generateLogWithTimestamp } from "./ServerTools";
import { GameGridGenerator } from "./GameGridGenerator";
import { ComputerPlayer } from "./ComputerPlayer";
import { ShipDesigns, ShipDesignsMap, controlTypes } from "./ShipDesigns";
import { projectileTypes } from "./ShipDesignTypes";

// Controls for metrics updates
let nextMinuteUpdate = 0;
let nextLogMetricsUpdate = 0;

const computerPlayerCount = 1;

/**
 * Main class for the game logic
 */
export class SimpleGameLogic {
  gridSize = 100;
  SimpleGameMetrics = {
    gridSize: this.gridSize,
    playAreaWidth: this.gridSize * 100,
    playAreaHeight: this.gridSize * 100,
    cellSize: 100,
    acceleration: 0.01,
    angularAcceleration: 0.005,
    drag: -0.01,
    tankSpeed: 0.1,
    laserSpeed: 0.4,
    fireDelayInterval: 200,
    laserDamage: 25,
    ShipDesigns,
    grid: [
      [0, 0],
      [0, 0],
    ],
    gridDamage: [
      [0, 0],
      [0, 0],
    ],
    visibilityMatrix: [],
  };

  state: GameState;
  gameUpdateTimestamps: number[];
  gridGen = new GameGridGenerator(this.gridSize);
  computerPlayers: ComputerPlayer[];
  private onGridRefresh: (
    gy: number,
    gx: number,
    gridElement: number,
    visibilityMatrix: any
  ) => void;

  constructor(
    state: GameState,
    onGridRefresh: (
      gy: number,
      gx: number,
      gridElement: number,
      visibilityMatrix: any
    ) => void
  ) {
    this.state = state;
    this.gameUpdateTimestamps = [];
    this.computerPlayers = [];
    this.onGridRefresh = onGridRefresh; // Assign the callback for grid restructuring

    /*
    // This would generate a random pattern of walls
    SimpleGameMetrics.grid = this.gridGen.generateRandomGrid();
    */

    // Generate a grid from standard 10 X 10 blocks
    console.log(generateLogWithTimestamp("Generating Grid"));
    this.SimpleGameMetrics.grid = this.gridGen.generateGrid("cave");

    //initialize gridDamage matrix
    this.SimpleGameMetrics.gridDamage = Array(this.gridSize)
      .fill(undefined)
      .map(() => Array(this.gridSize).fill(0));

    for (let gy = 0; gy < this.gridSize; gy++) {
      for (let gx = 0; gx < this.gridSize; gx++) {
        if (this.SimpleGameMetrics.grid[gy][gx] === 0b1111) {
          this.SimpleGameMetrics.gridDamage[gy][gx] = 50;
        }
      }
    }

    //this.gridGen.generateGridFromPredefinedPatterns(false);

    console.log(generateLogWithTimestamp("Calculating Visibility"));
    this.SimpleGameMetrics.visibilityMatrix =
      this.gridGen.generateVisibilityMatrixDiagonalLimited(
        this.SimpleGameMetrics.grid,
        10
      );

    console.log(generateLogWithTimestamp("Add Players"));
    for (let i = 0; i < computerPlayerCount; i++) {
      this.addNewComputerPlayer();
    }
  }

  /**
   * Add a new player controled by the computer to the game
   */
  addNewComputerPlayer(): void {
    // Add the computer player
    const computerPlayerPosition = this.generateSpawnPosition();
    const computerSessionID = "PC " + String(this.computerPlayers.length);

    const computerPlayerState = new Player(
      "Computer " + String(this.computerPlayers.length),
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
    return this.SimpleGameMetrics;
  }

  /**
   * Process client event messages
   *
   * @param sessionID Session id of the client sending the message
   * @param input String message from client typically indicating key activity
   */
  handleInput(sessionID: string, input: string): void {
    if (this.state.players.has(sessionID)) {
      const player = this.state.players.get(sessionID);

      const playerType = ShipDesignsMap.get(player.shipType);
      if (playerType === undefined) {
        console.error(
          generateLogWithTimestamp(
            "Player " +
              sessionID +
              " name: " +
              player.username +
              " had unknown type " +
              player.shipType
          )
        );
        return;
      }

      switch (input) {
        case "fire-down":
          player.firing = true;
          break;
        case "fire-up":
          player.firing = false;
          break;
        case "change-type":
          if (player.shipType === "SpaceShip") {
            player.shipType = "Tank";
            player.vx = 0;
            player.vy = 0;
            player.accel = 0;
          } else if (player.shipType === "Tank") {
            player.shipType = "SpaceShip";
            player.vx = 0;
            player.vy = 0;
            player.accel = 0;
          }
          break;
      }
    }
  }

  /**
   * Handle proportional movement messages from the client for
   * left and right direction
   *
   * @param sessionID Session id of the client sending the message
   * @param direction Left or right values from -1 to 1
   * @returns
   */
  handleTurn(sessionID: string, direction: number): void {
    if (this.state.players.has(sessionID)) {
      const player = this.state.players.get(sessionID);

      const playerType = ShipDesignsMap.get(player.shipType);
      if (playerType === undefined) {
        console.error(
          generateLogWithTimestamp(
            "Player " +
              sessionID +
              " name: " +
              player.username +
              " had unknown type " +
              player.shipType
          )
        );
        return;
      }

      // Check for valid input values.  Must be between -1 and 1
      if (direction < -1) direction = -1;
      if (direction > 1) direction = 1;

      if (playerType.controlType === controlTypes.rocketShip) {
        player.vr = direction * this.SimpleGameMetrics.angularAcceleration;
      } else if (playerType.controlType === controlTypes.tank) {
        player.vx = direction * this.SimpleGameMetrics.tankSpeed;
      }
    }
  }

  /**
   * Handle proportional forward back messages from the client
   *
   * @param sessionID Session id of the client
   * @param accel Forward back signal from -1 to 1
   * @returns
   */
  handleAccel(sessionID: string, accel: number): void {
    if (this.state.players.has(sessionID)) {
      const player = this.state.players.get(sessionID);

      const playerType = ShipDesignsMap.get(player.shipType);
      if (playerType === undefined) {
        console.error(
          generateLogWithTimestamp(
            "Player " +
              sessionID +
              " name: " +
              player.username +
              " had unknown type " +
              player.shipType
          )
        );
        return;
      }

      // Check for valid input values.  Must be between -1 and 1
      if (accel < -1) accel = -1;
      if (accel > 1) accel = 1;

      // adjust based on control type
      if (playerType.controlType === controlTypes.rocketShip && accel < 0) {
        accel = 0;
      }

      if (playerType.controlType === controlTypes.rocketShip) {
        player.accel = accel * this.SimpleGameMetrics.acceleration;
      } else if (playerType.controlType === controlTypes.tank) {
        player.vy = -1 * accel * this.SimpleGameMetrics.tankSpeed;
      }
    }
  }

  /**
   * Mouse direction events, used in tank mode to point
   * towards the mouse
   *
   * @param sessionID Session id of the client
   * @param direction Direction from player to mouse
   */
  mouseDirection(sessionID: string, direction: number): void {
    if (this.state.players.has(sessionID)) {
      const player = this.state.players.get(sessionID);

      const playerType = ShipDesignsMap.get(player.shipType);
      if (
        playerType !== undefined &&
        playerType.controlType === controlTypes.tank
      ) {
        player.direction = direction;
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

    const newPlayer = new Player(username, pos.x, pos.y);
    newPlayer.shipType = "SpaceShip";

    this.state.players.set(client.sessionId, newPlayer);
  }

  /**
   * Generate a spawn location for the player ensuring that
   * the player is not in a locked in block
   *
   * @returns The new position for the player
   */
  generateSpawnPosition(): { x: number; y: number } {
    let spawnPosition = {
      x: Math.floor(Math.random() * this.SimpleGameMetrics.playAreaWidth),
      y: Math.floor(Math.random() * this.SimpleGameMetrics.playAreaHeight),
    };

    // Check if the spawn position is within a walled cell
    while (this.isInWalledCell(spawnPosition.x, spawnPosition.y)) {
      console.log("hit a block");
      spawnPosition = {
        x: Math.floor(Math.random() * this.SimpleGameMetrics.playAreaWidth),
        y: Math.floor(Math.random() * this.SimpleGameMetrics.playAreaHeight),
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
    const gridX = Math.floor(x / this.SimpleGameMetrics.cellSize);
    const gridY = Math.floor(y / this.SimpleGameMetrics.cellSize);

    // Check if the cell at (gridX, gridY) has all walls
    return this.SimpleGameMetrics.grid[gridY][gridX] === 0b1111;
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
   * Update the player for the game loop including position and wall collisions
   *
   * @param deltaTime
   * @param elapsedTime
   * @param player
   * @param sessionId
   */
  updatePlayer(
    deltaTime: number,
    elapsedTime: number,
    player: Player,
    sessionId: string
  ): void {
    const playerType = ShipDesignsMap.get(player.shipType);
    if (playerType === undefined) {
      console.error(
        generateLogWithTimestamp(
          "Unknown ship type: " + player.shipType + " for " + player.username
        )
      );
    } else {
      // Player Radius is defined in type
      const playerRadius = playerType.collisionRadius;

      // Tank control types have no drag
      let drag = this.SimpleGameMetrics.drag;
      if (playerType.controlType === controlTypes.tank) drag = 0;

      // Compute proposed new position
      const newVx =
        player.vx +
        Math.cos(player.direction) * player.accel +
        drag * player.vx;
      const newVy =
        player.vy +
        Math.sin(player.direction) * player.accel +
        drag * player.vy;
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
        playerRadius,
        1
      );

      // Update player position and velocity
      player.vx = playerCollisionCorrection.vx;
      player.vy = playerCollisionCorrection.vy;
      player.x = playerCollisionCorrection.newX;
      player.y = playerCollisionCorrection.newY;

      player.direction += player.vr * deltaTime;

      // wrap the player position if somehow we escaped
      if (player.x > this.SimpleGameMetrics.playAreaWidth) {
        player.x = 0;
      } else if (player.x < 0) {
        player.x = this.SimpleGameMetrics.playAreaWidth;
      }

      if (player.y > this.SimpleGameMetrics.playAreaHeight) {
        player.y = 0;
      } else if (player.y < 0) {
        player.y = this.SimpleGameMetrics.playAreaHeight;
      }

      player.direction = (player.direction + 2 * Math.PI) % (2 * Math.PI);

      // if the player is in firing mode, see if we can generate a new fire event
      if (
        player.firing &&
        elapsedTime - player.lastFired >= playerType.fireDelayInterval
      ) {
        if (playerType.firesLasers) {
          this.state.projectiles.push(
            new Projectile(
              player.x + Math.cos(player.direction) * playerRadius,
              player.y + Math.sin(player.direction) * playerRadius,
              Math.cos(player.direction) * this.SimpleGameMetrics.laserSpeed +
                player.vx,
              Math.sin(player.direction) * this.SimpleGameMetrics.laserSpeed +
                player.vy,
              player.direction,
              sessionId,
              projectileTypes.Laser
            )
          );
        } else if (playerType.firesCannonballs) {
          this.state.projectiles.push(
            new Projectile(
              player.x + Math.cos(player.direction) * playerRadius,
              player.y + Math.sin(player.direction) * playerRadius,
              Math.cos(player.direction) * this.SimpleGameMetrics.laserSpeed +
                player.vx,
              Math.sin(player.direction) * this.SimpleGameMetrics.laserSpeed +
                player.vy,
              player.direction,
              sessionId,
              projectileTypes.Cannonball
            )
          );
        }
        player.lastFired = elapsedTime;
      }

      if (this.isInWalledCell(player.x, player.y)) {
        // Not sure why this is happening...  you die and reset
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
            "Player " + player.username + " punched into a wall"
          )
        );
      }
    }
  }

  /**
   * Check to see if the player and laser collided
   *
   * @param player
   * @param laser
   * @returns
   */
  laserHit(player: Player, laser: Projectile): boolean {
    const playerType = ShipDesignsMap.get(player.shipType);
    if (playerType === undefined) {
      console.error(
        generateLogWithTimestamp(
          "Unknown ship type: " + player.shipType + " for " + player.username
        )
      );
      return false;
    }

    const playerRadius = playerType.collisionRadius;
    const dx = laser.x - player.x;
    const dy = laser.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= playerRadius;
  }

  /**
   * Update the position of the laser and check for time or out
   * of bounds conditions when it should be removed
   *
   * @param deltaTime
   * @param elapsedTime
   * @param laser
   * @returns
   */
  updateAndTimeLaser(
    deltaTime: number,
    elapsedTime: number,
    laser: Projectile
  ): boolean {
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
      1,
      10
    );

    laser.x = newX;
    laser.y = newY;

    const inBounds =
      laser.x >= 0 &&
      laser.x <= this.SimpleGameMetrics.playAreaWidth &&
      laser.y >= 0 &&
      laser.y <= this.SimpleGameMetrics.playAreaHeight;

    // Keep the laser only if the remaining time is greater than zero
    return laser.remainingTime > 0 && !laserCollision.hit && inBounds;
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
      this.updatePlayer(deltaTime, elapsedTime, player, sessionId);
    }); // end the player loop

    // Update laser positions and reduce remaining time
    // remove if the time limit is hit or it hit a wall
    this.state.projectiles = this.state.projectiles.filter((laser) => {
      return this.updateAndTimeLaser(deltaTime, elapsedTime, laser);
    });

    // Check for collisions between lasers and ships
    for (const laser of this.state.projectiles) {
      for (const player of this.state.players.values()) {
        if (this.laserHit(player, laser)) {
          // Laser hit a ship
          const attacker = this.state.players.get(laser.ownerSessionId);

          // check that you did not shoot yourself
          if (
            attacker !== null &&
            attacker !== undefined &&
            attacker !== player
          ) {
            // apply damage
            player.health -= this.SimpleGameMetrics.laserDamage;

            // Remove the laser
            this.state.projectiles.splice(
              this.state.projectiles.indexOf(laser),
              1
            );

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
   * @param damage Damage done to wall
   * @returns New entity position and velocity and indication of collision
   */
  checkForWallCollision(
    x: number,
    y: number,
    newX: number,
    newY: number,
    vx: number,
    vy: number,
    radius: number,
    damage: number
  ): { newX: number; newY: number; vx: number; vy: number; hit: boolean } {
    let newVal = {
      newX,
      newY,
      vx,
      vy,
      hit: false,
    };

    // Find the grid cell that we are currently in
    let gridXY = this.gridPosForPoint({ x, y });
    const gridCellA = this.SimpleGameMetrics.grid[gridXY.y][gridXY.x];
    newVal = this.checkGridWallCollision(
      gridCellA,
      gridXY,
      newVal,
      radius,
      damage
    );

    if (!newVal.hit) {
      // check the grid we are moving into
      gridXY = this.gridPosForPoint({ x, y });
      const gridCellB = this.SimpleGameMetrics.grid[gridXY.y][gridXY.x];

      if (gridCellA !== gridCellB) {
        newVal = this.checkGridWallCollision(
          gridCellB,
          gridXY,
          newVal,
          radius,
          damage
        );

        if (newVal.hit) {
          console.log(
            generateLogWithTimestamp(
              "Hit found on the second grid..............."
            )
          );
        }
      }
    }
    return newVal;
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
      Math.min(
        this.SimpleGameMetrics.gridSize - 1,
        Math.floor(pt.x / this.SimpleGameMetrics.cellSize)
      )
    );
    returnPos.y = Math.max(
      0,
      Math.min(
        this.SimpleGameMetrics.gridSize - 1,
        Math.floor(pt.y / this.SimpleGameMetrics.cellSize)
      )
    );

    return returnPos;
  }

  /**
   * Checks for collisions with a specific grid location walls
   *
   * @param gridCell The bitmask value for this cell indicating walls or not on the four sides
   * @param gridPos The x y position of this grid
   * @param newVal Holds the position before and after game cycle update
   * @param radius Collision radius for this entity
   * @returns
   */
  checkGridWallCollision(
    gridCell: number,
    gridPos: { x: number; y: number },
    newVal: {
      newX: number;
      newY: number;
      vx: number;
      vy: number;
      hit: boolean;
    },
    radius: number,
    damage: number
  ): { newX: number; newY: number; vx: number; vy: number; hit: boolean } {
    let hy = 0;
    let hx = 0;

    // Check for collisions with the left and right
    const newXinCell =
      newVal.newX - gridPos.x * this.SimpleGameMetrics.cellSize;
    if (
      (gridCell & this.gridGen.wallMask.R) !== 0 &&
      newXinCell + radius > this.SimpleGameMetrics.cellSize
    ) {
      // Collided with right wall
      newVal.hit = true;
      hy = gridPos.y;
      hx = gridPos.x + 1;

      newVal.vx = 0; // Stop horizontal movement
      newVal.newX =
        gridPos.x * this.SimpleGameMetrics.cellSize +
        this.SimpleGameMetrics.cellSize -
        radius; // Move to the left of the wall
    } else if (
      (gridCell & this.gridGen.wallMask.L) !== 0 &&
      newXinCell - radius < 0
    ) {
      // Collided with left wall
      newVal.hit = true;
      hy = gridPos.y;
      hx = gridPos.x - 1;

      newVal.vx = 0; // Stop horizontal movement
      newVal.newX = gridPos.x * this.SimpleGameMetrics.cellSize + radius; // Move to the right of the wall
    }

    // Check for collisions with the top and bottom
    const newYinCell =
      newVal.newY - gridPos.y * this.SimpleGameMetrics.cellSize;
    if (
      (gridCell & this.gridGen.wallMask.B) !== 0 &&
      newYinCell + radius > this.SimpleGameMetrics.cellSize
    ) {
      // Collided with bottom wall
      newVal.hit = true;
      hy = gridPos.y + 1;
      hx = gridPos.x;

      newVal.vy = 0; // Stop vertical movement
      newVal.newY =
        gridPos.y * this.SimpleGameMetrics.cellSize +
        this.SimpleGameMetrics.cellSize -
        radius; // Move above the wall
    } else if (
      (gridCell & this.gridGen.wallMask.T) !== 0 &&
      newYinCell - radius < 0
    ) {
      // Collided with top wall
      newVal.hit = true;
      hy = gridPos.y - 1;
      hx = gridPos.x;

      newVal.vy = 0; // Stop vertical movement
      newVal.newY = gridPos.y * this.SimpleGameMetrics.cellSize + radius; // Move below the wall
    }

    //A wall was hit, update the damage on the wall and if it falls to zero
    //remove it from the grid
    if (newVal.hit) {
      console.log("Damage " + this.SimpleGameMetrics.gridDamage[hy][hx]);
      this.SimpleGameMetrics.gridDamage[hy][hx] -= damage;

      if (this.SimpleGameMetrics.gridDamage[hy][hx] <= 0) {
        //Grid square is destroyed

        console.log("before " + this.SimpleGameMetrics.grid[hy][hx]);

        // reset this and prior position to empty
        this.SimpleGameMetrics.grid[gridPos.y][gridPos.x] = 0b0000;
        this.SimpleGameMetrics.grid[hy][hx] = 0b0000;
        console.log("after " + this.SimpleGameMetrics.grid[hy][hx]);

        for (let patchY = hy - 2; patchY < hy + 2; patchY++) {
          for (let patchX = hx - 2; patchX < hx + 2; patchX++) {
            if (
              patchY < 0 ||
              patchY >= this.SimpleGameMetrics.gridSize ||
              patchX < 0 ||
              patchX >= this.SimpleGameMetrics.gridSize
            )
              continue;

            this.gridGen.matchWallsPoint(
              this.SimpleGameMetrics.grid,
              patchY,
              patchX
            );
          }
          console.log("after " + this.SimpleGameMetrics.grid[hy][hx]);
        }

        this.notifyClientsGridUpdate(hy, hx);
      }
    }

    return newVal;
  }

  /**
   * Notify clients of updates to the grid aound a point
   *
   * @param gy  Position updated in grid
   * @param gx  Position updated in grid
   */
  notifyClientsGridUpdate(gy: number, gx: number) {
    if (this.onGridRefresh) {
      for (let patchY = gy - 2; patchY < gy + 2; patchY++) {
        for (let patchX = gx - 2; patchX < gx + 2; patchX++) {
          if (
            patchY < 0 ||
            patchY >= this.SimpleGameMetrics.gridSize ||
            patchX < 0 ||
            patchX >= this.SimpleGameMetrics.gridSize
          )
            continue;

          // Invoke the callback to notify clients
          this.onGridRefresh(
            patchY,
            patchX,
            this.SimpleGameMetrics.grid[patchY][patchX],
            this.SimpleGameMetrics.visibilityMatrix[patchY][patchX]
          );
        }
      }
    }
  }

  /**
   * Update diagnostic metrics for this server
   *
   * @param elapsedTime Time since start of game
   */
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
