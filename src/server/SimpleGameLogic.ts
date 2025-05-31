import { type Client } from "colyseus";
import { type GameState, Player, type Projectile } from "./GameState";
import { generateLogWithTimestamp } from "./ServerTools";
import { GameGridGenerator } from "./GameGridGenerator";
import { ShipDesigns, ShipDesignsMap, controlTypes } from "./ShipDesigns";
import type { ShipType } from "./ShipDesignTypes";
import { GAME_CONFIG, type GameConfig } from "./config";
import { CollisionManager } from "./CollisionManager";
import { PhysicsEngine } from "./PhysicsEngine";
import { ComputerPlayerManager } from "./ComputerPlayerManager";
import { ProjectileManager } from "./ProjectileManager";
import { MetricsManager } from "./MetricsManager";
import { GridManager } from "./GridManager";

/**
 * Main class for the game logic
 */
export class SimpleGameLogic {
  private config: GameConfig;
  private gridGen!: GameGridGenerator;
  public SimpleGameMetrics!: {
    gridSize: number;
    playAreaWidth: number;
    playAreaHeight: number;
    cellSize: number;
    acceleration: number;
    angularAcceleration: number;
    drag: number;
    tankSpeed: number;
    laserSpeed: number;
    fireDelayInterval: number;
    laserDamage: number;
    ShipDesigns: ShipType[];
    grid: number[][];
    gridDamage: number[][];
    visibilityMatrix: any[][];
  };

  state: GameState;
  private onGridRefresh: (
    gy: number,
    gx: number,
    gridElement: number,
    visibilityMatrix: any
  ) => void;

  private collisionManager!: CollisionManager;
  private physicsEngine!: PhysicsEngine;
  private computerManager!: ComputerPlayerManager;
  private projectileManager!: ProjectileManager;
  private metricsManager!: MetricsManager;
  private gridManager!: GridManager;

  constructor(
    state: GameState,
    onGridRefresh: (
      gy: number,
      gx: number,
      gridElement: number,
      visibilityMatrix: any
    ) => void,
    config: GameConfig = GAME_CONFIG
  ) {
    this.config = config;
    this.onGridRefresh = onGridRefresh;
    this.gridGen = new GameGridGenerator(this.config.gridSize);
    this.gridManager = new GridManager(this.gridGen, this.config, this.onGridRefresh);
    this.state = state;

    // Initialize metrics from configuration
    this.SimpleGameMetrics = {
      gridSize: this.config.gridSize,
      playAreaWidth: this.config.gridSize * this.config.cellSize,
      playAreaHeight: this.config.gridSize * this.config.cellSize,
      cellSize: this.config.cellSize,
      acceleration: this.config.physics.acceleration,
      angularAcceleration: this.config.physics.angularAcceleration,
      drag: this.config.physics.drag,
      tankSpeed: this.config.physics.tankSpeed,
      laserSpeed: this.config.physics.laserSpeed,
      fireDelayInterval: this.config.projectiles.fireDelayInterval,
      laserDamage: this.config.projectiles.laserDamage,
      ShipDesigns,
      grid: [],
      gridDamage: [],
      visibilityMatrix: [],
    };

    // Initialize grid, damage, and visibility via GridManager
    this.SimpleGameMetrics.grid = this.gridManager.grid;
    this.SimpleGameMetrics.gridDamage = this.gridManager.gridDamage;
    this.SimpleGameMetrics.visibilityMatrix = this.gridManager.visibilityMatrix;

    // Initialize computer players, physics, collision, projectiles & metrics
    this.computerManager = new ComputerPlayerManager(this, this.state, this.config);
    this.collisionManager = new CollisionManager(this.gridManager, this.config);
    this.physicsEngine = new PhysicsEngine(this.config, this.collisionManager);
    this.projectileManager = new ProjectileManager(this, this.config, this.collisionManager);
    this.metricsManager = new MetricsManager(this.state, this.config);
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

      // Check for valid input values. Must be between -1 and 1
      direction = Math.max(-1, Math.min(1, direction));

      if (playerType.controlType === controlTypes.rocketShip) {
        player.vr = direction * this.SimpleGameMetrics.angularAcceleration;
      } else if (playerType.controlType === controlTypes.tank) {
        player.vx = direction * this.SimpleGameMetrics.tankSpeed;
      }
    }
  }

  /**
   * Handle proportional forward/back messages from the client
   *
   * @param sessionID Session id of the client
   * @param accel Forward/back signal from -1 to 1
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

      // Check for valid input values. Must be between -1 and 1
      accel = Math.max(-1, Math.min(1, accel));

      // Adjust based on control type
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
   * Add a new player into the game. Called when they join for the first time
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
   * the player is not in a rock cell
   *
   * @returns The new position for the player
   */
  generateSpawnPosition(): { x: number; y: number } {
    let spawnPosition = {
      x: Math.floor(Math.random() * this.SimpleGameMetrics.playAreaWidth),
      y: Math.floor(Math.random() * this.SimpleGameMetrics.playAreaHeight),
    };

    // Check if the spawn position is within a rock cell
    while (this.isInRockCell(spawnPosition.x, spawnPosition.y)) {
      console.log("Hit a rock block, generating a new spawn position");
      spawnPosition = {
        x: Math.floor(Math.random() * this.SimpleGameMetrics.playAreaWidth),
        y: Math.floor(Math.random() * this.SimpleGameMetrics.playAreaHeight),
      };
    }

    return spawnPosition;
  }

  /**
   * Checks if a given point in game coordinates is located within a cell that is rock.
   *
   * @param x - The x-coordinate of the point in game coordinates.
   * @param y - The y-coordinate of the point in game coordinates.
   * @returns True if the point is within a rock cell, false otherwise.
   */
  isInRockCell(x: number, y: number): boolean {
    const gridX = Math.floor(x / this.SimpleGameMetrics.cellSize);
    const gridY = Math.floor(y / this.SimpleGameMetrics.cellSize);

    // Check if the cell at (gridX, gridY) is rock
    return (
      this.SimpleGameMetrics.grid[gridY][gridX] ===
      GameGridGenerator.MATERIAL.ROCK
    );
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
   * Update the player for the game loop including position and rock collisions
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

      // Check for rock collisions
      const playerCollisionCorrection = this.collisionManager.checkForRockCollision(
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

      // Wrap the player position if somehow we escaped
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

      // If the player is in firing mode, see if we can generate a new fire event
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

      if (this.isInRockCell(player.x, player.y)) {
        // Player collided with rock, respawn
        const pos = this.generateSpawnPosition();
        player.x = pos.x;
        player.y = pos.y;
        player.vx = 0.0;
        player.vy = 0.0;
        player.direction = Math.random() * 2 * Math.PI;
        player.health = player.maxHealth;
        console.log(
          generateLogWithTimestamp(
            "Player " +
              player.username +
              " collided with a rock and was respawned"
          )
        );
      }
    }
  }


  /**
   * Update the state of the game for the next game cycle.
   *
   * @param deltaTime Time since the last game update in millis
   * @param elapsedTime Time since game start in millis
   */
  update(deltaTime: number, elapsedTime: number): void {
    // Update AI players, physics, projectiles and metrics
    this.computerManager.updateAll(deltaTime, elapsedTime);

    this.state.players.forEach((player, sessionId) => {
      this.physicsEngine.updatePlayer(
        sessionId,
        player,
        deltaTime,
        elapsedTime,
        this.state.projectiles
      );
    });

    this.state.projectiles = this.projectileManager.updateAll(
      deltaTime,
      elapsedTime,
      this.state.projectiles,
      this.state.players
    );

    this.metricsManager.update(elapsedTime);
  }

}
