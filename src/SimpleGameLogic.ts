import { Client } from "colyseus";
import { GameState, Player, Laser } from "./GameState";
//import { SimpleGameStatics } from "./static/GameStatics";


let SimpleGameMetrics = {
  playAreaWidth: 1200,
  playAreaHeight: 800,
  acceleration: 0.01,
  angularAcceleration: 0.005,
  drag: -0.01,
  laserSpeed: .4,
  playerRadius: 10,
  fireDelayInterval: 200,
}


function logWithTimestamp(...messages) {
  const timestamp = new Date().toISOString();
  console.log(timestamp, ...messages);
}

export class SimpleGameLogic {
  state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  getInitializationData() {
    return SimpleGameMetrics;
  }

  handleInput(client: Client, input: string) {
    if (this.state.players.has(client.sessionId)) {
      let player = this.state.players.get(client.sessionId);

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

  addPlayer(client: Client, username: string) {
    this.state.players.set(client.sessionId, new Player(username, Math.random() * 800, Math.random() * 600));
  }

  removePlayer(client: Client) {
    this.state.players.delete(client.sessionId);
  }

  update(deltaTime: number, elapsedTime: number) {
    this.state.players.forEach((player, sessionId) => {
      player.vx += Math.cos(player.direction) * player.accel + SimpleGameMetrics.drag * player.vx;
      player.vy += Math.sin(player.direction) * player.accel + SimpleGameMetrics.drag * player.vy;

      player.x += player.vx * deltaTime;
      player.y += player.vy * deltaTime;
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



      if (player.firing && (elapsedTime - player.lastFired >= SimpleGameMetrics.fireDelayInterval)) {
        this.state.lasers.push(new Laser(
          player.x + Math.cos(player.direction) * SimpleGameMetrics.playerRadius,
          player.y + Math.sin(player.direction) * SimpleGameMetrics.playerRadius,
          Math.cos(player.direction) * SimpleGameMetrics.laserSpeed,
          Math.sin(player.direction) * SimpleGameMetrics.laserSpeed,
          player.direction,
          sessionId
        ));
        player.lastFired = elapsedTime;
      }
    });

    // Update laser positions
    for (const laser of this.state.lasers) {
      laser.x += laser.vx * deltaTime;
      laser.y += laser.vy * deltaTime;
    }

    // Check for collisions between lasers and ships
    for (const laser of this.state.lasers) {
      for (const [sessionId, player] of this.state.players.entries()) {
        const dx = laser.x - player.x;
        const dy = laser.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= SimpleGameMetrics.playerRadius) {
          // Laser hit a ship, increment score, remove the ship and the laser
          const attacker = this.state.players.get(laser.ownerSessionId);
          if (attacker) {
            attacker.score += 1;
          }

          // Respawn the hit player in a random location
          player.x = Math.random() * SimpleGameMetrics.playAreaWidth;
          player.y = Math.random() * SimpleGameMetrics.playAreaHeight;
          player.vx = 0.0;
          player.vy = 0.0;
          player.direction = Math.random() * 2 * Math.PI;

          // Remove the laser
          this.state.lasers.splice(this.state.lasers.indexOf(laser), 1);

          logWithTimestamp("PlayerHit    " + attacker.username + " hit " + player.username + ", " + attacker.username + " score:" + attacker.score);
          break;
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
  }
}
