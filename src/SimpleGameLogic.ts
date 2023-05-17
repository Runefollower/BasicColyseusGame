import { Client } from "colyseus";
import { GameState, Player, Laser } from "./GameState";
import { SimpleGameStatics } from "./static/GameStatics";

export class SimpleGameLogic {
  state: GameState;

  constructor(state: GameState) {
    this.state = state;
  }

  handleInput(client: Client, input: string) {
    if (this.state.players.has(client.sessionId)) {
      let player = this.state.players.get(client.sessionId);

      switch (input) {
        case "w-down":
          player.accel = SimpleGameStatics.acceleration;
          break;
        case "s-down":
          player.accel = -1 * SimpleGameStatics.acceleration;
          break;
        case "a-down":
          player.vr = -1 * SimpleGameStatics.angularAcceleration;
          break;
        case "d-down":
          player.vr = SimpleGameStatics.angularAcceleration;
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

  addPlayer(client: Client) {
    this.state.players.set(client.sessionId, new Player(Math.random() * 800, Math.random() * 600));
  }

  removePlayer(client: Client) {
    this.state.players.delete(client.sessionId);
  }

  update(deltaTime: number, elapsedTime: number) {
    this.state.players.forEach((player, sessionId) => {
      player.vx += Math.cos(player.direction) * player.accel + SimpleGameStatics.drag * player.vx;
      player.vy += Math.sin(player.direction) * player.accel + SimpleGameStatics.drag * player.vy;

      player.x += player.vx * deltaTime;
      player.y += player.vy * deltaTime;
      player.direction += player.vr * deltaTime;

      if (player.x > SimpleGameStatics.playAreaWidth) {
        player.x = 0;
      } else if (player.x < 0) {
        player.x = SimpleGameStatics.playAreaWidth;
      }

      if (player.y > SimpleGameStatics.playAreaHeight) {
        player.y = 0;
      } else if (player.y < 0) {
        player.y = SimpleGameStatics.playAreaHeight;
      }

      player.direction = (player.direction + 2 * Math.PI) % (2 * Math.PI);



      if (player.firing && (elapsedTime - player.lastFired >= SimpleGameStatics.fireDelayInterval)) {
        this.state.lasers.push(new Laser(
          player.x + Math.cos(player.direction) * SimpleGameStatics.playerRadius,
          player.y + Math.sin(player.direction) * SimpleGameStatics.playerRadius,
          Math.cos(player.direction) * SimpleGameStatics.laserSpeed,
          Math.sin(player.direction) * SimpleGameStatics.laserSpeed,
          player.direction
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

        if (distance <= SimpleGameStatics.playerRadius) {
          // Laser hit a ship, remove the ship and the laser
          console.log("Player " + sessionId + " hit");
          this.state.players.delete(sessionId);
          this.state.lasers.splice(this.state.lasers.indexOf(laser), 1);
          break;
        }
      }
    }

    // Remove lasers that are out of bounds
    this.state.lasers = this.state.lasers.filter((laser) => {
      return (
        laser.x >= 0 &&
        laser.x <= SimpleGameStatics.playAreaWidth &&
        laser.y >= 0 &&
        laser.y <= SimpleGameStatics.playAreaHeight
      );
    });
  }
}
