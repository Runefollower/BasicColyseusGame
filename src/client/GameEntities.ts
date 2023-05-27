/**
 * GameObject is an abstract class that provides the foundation for any object in the game.
 * This includes basic attributes like x and y coordinates, velocity, direction, and acceleration.
 * It also includes an update function to handle movement and a draw function to be implemented by child classes.
 */
abstract class GameObject {
  x: number; // x-coordinate of the object
  y: number; // y-coordinate of the object
  rx: number; // x-coordinate for rendering (interpolated from the last server update)
  ry: number; // y-coordinate for rendering (interpolated from the last server update)
  vx: number; // x-velocity of the object
  vy: number; // y-velocity of the object
  direction: number; // direction the object is facing
  vr: number; // rate of change of direction
  accel: number; // object's acceleration
  health: number; // Current health of this object
  maxHealth: number; // Maximum health of this object

  /**
   * Constructs a new GameObject.
   */
  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    direction: number,
    vr: number,
    accel: number
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.direction = direction;
    this.vr = vr;
    this.accel = accel;
    this.health = 1;
    this.maxHealth = 1;
  }

  /**
   * Updates the GameObject's position based on its velocity and the time since the last server update.
   */
  update(udt: number): void {
    this.rx = this.x + this.vx * udt;
    this.ry = this.y + this.vy * udt;
  }

  /**
   * Abstract method for drawing the object. This needs to be implemented by any child classes.
   */
  abstract draw(ctx: CanvasRenderingContext2D): void;
}

/**
 * PlayerShip extends GameObject and represents a player's ship in the game.
 * It includes additional attributes specific to the player's ship, like name, firing state, last fired time, score, and session ID.
 */
export class PlayerShip extends GameObject {
  name: string; // player's name
  firing: boolean; // if the ship is currently firing
  lastFired: number; // the time the ship last fired
  score: number; // player's score
  sessionId: string; // unique session ID for the player

  /**
   * Constructs a new PlayerShip.
   */
  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    direction: number,
    vr: number,
    accel: number,
    name: string,
    firing: boolean,
    lastFired: number,
    score: number,
    sessionId: string
  ) {
    super(x, y, vx, vy, direction, vr, accel);
    this.name = name;
    this.firing = firing;
    this.lastFired = lastFired;
    this.score = score;
    this.sessionId = sessionId;
  }

  /**
   * Implementation of the abstract draw method for PlayerShip.
   * This method would contain code to draw the player's ship on the canvas.
   */
  draw(ctx: CanvasRenderingContext2D): void {}
}

/**
 * Laser extends GameObject and represents a laser in the game.
 * Currently, it has no additional properties or methods beyond those provided by GameObject.
 */
export class Laser extends GameObject {
  /**
   * Implementation of the abstract draw method for Laser.
   * This method would contain code to draw a laser on the canvas.
   */
  draw(ctx: CanvasRenderingContext2D): void {}
}
