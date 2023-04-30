import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("number")
  x: number;

  @type("number")
  y: number;

  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }
}

export class GameState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();

  addPlayer(sessionId: string, x: number, y: number) {
    this.players.set(sessionId, new Player(x, y));
  }

  removePlayer(sessionId: string) {
    this.players.delete(sessionId);
  }

  movePlayer(sessionId: string, x: number, y: number) {
    if (this.players.has(sessionId)) {
      const player = this.players.get(sessionId);
      player.x += x;
      player.y += y;
    }
  }
}
