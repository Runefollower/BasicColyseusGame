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
    this.onMessage("move", (client, key) => {
      let dx = 0;
      let dy = 0;

      switch (key) {
        case "w":
          dy = -0.01;
          break;
        case "a":
          dx = -0.01;
          break;
        case "s":
          dy = 0.01;
          break;
        case "d":
          dx = 0.01;
          break;
      }

      if (this.state.players.has(client.sessionId)) {
          const player = this.state.players.get(client.sessionId);
          player.vx += dx;
          player.vy += dy;
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
          player.x += player.vx * deltaTime;
          player.y += player.vy * deltaTime;

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
      });
  }
}

gameServer.define("game", SimpleGameRoom);
gameServer.listen(2567);