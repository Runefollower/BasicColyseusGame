import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("number")
  x: number;

  @type("number")
  y: number;

  @type("number")
  vx: number;

  @type("number")
  vy: number;

  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
    this.vx = 0.0;
    this.vy = 0.0;

  }
}

export class GameState extends Schema {
  @type({ map: Player }) 
  players = new MapSchema<Player>();
}
