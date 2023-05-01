import http from "http";
import express from "express";
import path from 'path';
import serveIndex from 'serve-index';
import { Server, Room } from "colyseus";
import { GameState, Player, Laser } from "./GameState";
import { SimpleGameStatics } from "./static/GameStatics";

const app = express();
app.use(express.json());
app.use('/', serveIndex(path.join(__dirname, "static"), {'icons': true}))
app.use('/', express.static(path.join(__dirname, "static")));

const gameServer = new Server({
  server: http.createServer(app),
  //express: app,
});

export class SimpleGameRoom extends Room<GameState> {
  onCreate() {
    console.log("Creation of Game Room")
    this.setState(new GameState());

    // Register the "move" message handler
    this.onMessage("input", (client, input) => {
        if (this.state.players.has(client.sessionId)) {
            const player = this.state.players.get(client.sessionId);
            
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
            }
        }
    });

    this.onMessage("fire", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.state.lasers.push(new Laser(
            player.x + Math.cos(player.direction) * SimpleGameStatics.playerRadius, 
            player.y + Math.sin(player.direction) * SimpleGameStatics.playerRadius, 
            Math.cos(player.direction) * SimpleGameStatics.laserSpeed,
            Math.sin(player.direction) * SimpleGameStatics.laserSpeed,
            player.direction));
      }
    });


    // Set up the game loop
    this.setSimulationInterval((deltaTime) => this.update(deltaTime));
  }

  onJoin(client) {
    console.log("client joined " + client.sessionId)
    this.state.players.set(client.sessionId, new Player(Math.random() * 800, Math.random() * 600));
  }

  onLeave(client) {
    console.log("client left " + client.sessionId)
    this.state.players.delete(client.sessionId);
  }
  

  onDispose() {
    // Cleanup code when the room is disposed
  }

  update(deltaTime) {
    this.state.players.forEach((player, sessionId) => {
      player.vx += Math.cos(player.direction) * player.accel + SimpleGameStatics.drag * player.vx;
      player.vy += Math.sin(player.direction) * player.accel + SimpleGameStatics.drag * player.vy;

      player.x += player.vx * deltaTime;
      player.y += player.vy * deltaTime;
      player.direction += player.vr * deltaTime;

      if (player.x > SimpleGameStatics.playAreaWidth) {
          player.x = 0;
      } else if (player.x < 0 ) {
          player.x = SimpleGameStatics.playAreaWidth;
      }
          
      if (player.y > SimpleGameStatics.playAreaHeight) {
          player.y = 0;
      } else if (player.y < 0 ) {
          player.y = SimpleGameStatics.playAreaHeight;
      }

      player.direction = (player.direction + 2 * Math.PI) % (2 * Math.PI);
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

gameServer.define("game", SimpleGameRoom);
gameServer.listen(2567);