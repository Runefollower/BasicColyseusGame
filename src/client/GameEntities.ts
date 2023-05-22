abstract class GameObject {
  x: number;
  y: number;

  //Render x and Render y - the positions
  //the object is displayed at based on interpolating 
  //from last server update
  rx: number;
  ry: number;
  vx: number;
  vy: number;
  direction: number;
  vr: number;
  accel: number;

  constructor(x: number, y: number, vx: number, vy: number, direction: number, vr: number, accel: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.direction = direction;
    this.vr = vr;
    this.accel = accel;
  }

  // Update this entity. UDT is the time since last 
  //server update.  This is just taking care of any movement
  //since the last server call
  update(udt: number): void {
    this.rx = this.x + this.vx * udt;
    this.ry = this.y + this.vy * udt;
  }

  abstract draw(ctx: CanvasRenderingContext2D): void;
}


export class PlayerShip extends GameObject {
  name: string;
  firing: boolean;
  lastFired: number;
  score: number;
  sessionId: string;

  constructor(x: number, y: number, vx: number, vy: number, direction: number, vr: number, accel: number, name: string, firing: boolean, lastFired: number, score: number, sessionId: string) {
    super(x, y, vx, vy, direction, vr, accel);
    this.name = name;
    this.firing = firing;
    this.lastFired = lastFired;
    this.score = score;
    this.sessionId = sessionId;
  }

  draw(ctx: CanvasRenderingContext2D): void {
  }
}
