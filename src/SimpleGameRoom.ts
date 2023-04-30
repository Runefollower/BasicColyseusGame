import http from "http";
import express from "express";
import path from 'path';
import serveIndex from 'serve-index';
import { Server, Room } from "colyseus";
import { GameState, Player } from "./GameState";
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
  }
}

gameServer.define("game", SimpleGameRoom);
gameServer.listen(2567);