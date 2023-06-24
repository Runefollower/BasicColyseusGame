import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string")
  username: string;

  @type("number")
  x: number;

  @type("number")
  y: number;

  @type("number")
  vx: number;

  @type("number")
  vy: number;

  @type("number")
  direction: number;

  @type("number")
  vr: number;

  @type("number")
  accel: number;

  @type("boolean")
  firing: boolean;

  @type("number")
  lastFired: number;

  @type("number")
  score: number;

  @type("number")
  health: number;

  @type("number")
  maxHealth: number;

  @type("string")
  shipType: string;

  fireInterval: any;

  constructor(username: string, x: number, y: number) {
    super();
    this.username = username;
    this.x = x;
    this.y = y;
    this.vx = 0.0;
    this.vy = 0.0;
    this.direction = 0.0;
    this.vr = 0.0;
    this.accel = 0.0;
    this.firing = false;
    this.lastFired = 0;
    this.score = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.shipType = "SpaceShip";
  }
}

export class Projectile extends Schema {
  @type("number")
  x: number;

  @type("number")
  y: number;

  @type("number")
  vx: number;

  @type("number")
  vy: number;

  @type("number")
  direction: number;

  @type("number")
  remainingTime: number;

  @type("string")
  ownerSessionId: string;

  @type("number")
  projectileType: number;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    direction: number,
    ownerSessionId: string,
    projectileType: number
  ) {
    super();
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.direction = direction;
    this.ownerSessionId = ownerSessionId;
    this.remainingTime = 1000;
    this.projectileType = projectileType;
  }
}

export class GameState extends Schema {
  @type({ map: Player })
  players = new MapSchema<Player>();

  @type([Projectile])
  projectiles = new ArraySchema<Projectile>();

  // Server-side metrics
  @type("number")
  gameUpdateCyclesPerSecond: number;

  @type("number")
  currentClientsCount: number;

  @type("number")
  maxClientsCountLastMinute: number;

  @type("string")
  highestScorePlayer: string;

  @type("number")
  highestScore: number;

  constructor() {
    super();

    // Initialize server-side metrics
    this.gameUpdateCyclesPerSecond = 0;
    this.currentClientsCount = 0;
    this.maxClientsCountLastMinute = 0;
    this.highestScorePlayer = "";
    this.highestScore = 0;
  }
}
