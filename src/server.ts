import http from "http";
import express from "express";
import path from 'path';
import serveIndex from 'serve-index';
import { Server, Room } from "colyseus";
import { GameState } from "./GameState";

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

      this.state.movePlayer(client.sessionId, x, y);
    });
  }

  onJoin(client) {
    console.log("client joined " + client.sessionId)
    this.state.addPlayer(client.sessionId, Math.random() * 800, Math.random() * 600);
  }

  onLeave(client) {
    this.state.removePlayer(client.sessionId);
  }
}

gameServer.define("game", GameRoom);
gameServer.listen(2567);