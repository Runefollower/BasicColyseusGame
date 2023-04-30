import http from "http";
import express from "express";
import path from 'path';
import serveIndex from 'serve-index';
import { Server, Room } from "colyseus";
import { GameState, Player } from "./GameState";

const app = express();
app.use(express.json());
app.use('/', serveIndex(path.join(__dirname, "static"), {'icons': true}))
app.use('/', express.static(path.join(__dirname, "static")));

const gameServer = new Server({
  server: http.createServer(app),
  //express: app,
});

export class GameRoom extends Room<GameState> {
  onCreate() {
    console.log("Creation of Game Room")
    this.setState(new GameState());

    // Register the "move" message handler
    this.onMessage("move", (client, key) => {
      console.log("Move")
      let x = 0;
      let y = 0;

      switch (key) {
        case "w":
          y = -1;
          break;
        case "a":
          x = -1;
          break;
        case "s":
          y = 1;
          break;
        case "d":
          x = 1;
          break;
      }

      if (this.state.players.has(client.sessionId)) {
          const player = this.state.players.get(client.sessionId);
          player.x += x;
          player.y += y;
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
  }
}

gameServer.define("game", GameRoom);
gameServer.listen(2567);