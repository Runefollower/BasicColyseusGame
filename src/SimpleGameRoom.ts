import http from "http";
import express from "express";
import path from 'path';
import serveIndex from 'serve-index';

import { Server, Room } from "colyseus";
import { GameState, Player } from "./GameState";
import { SimpleGameLogic } from "./SimpleGameLogic";

const app = express();
app.use(express.json());
app.use('/', serveIndex(path.join(__dirname, "static"), { 'icons': true }))
app.use('/', express.static(path.join(__dirname, "static")));

const gameServer = new Server({
  server: http.createServer(app),
  //express: app,
});

export class SimpleGameRoom extends Room<GameState> {
  gameLogic: SimpleGameLogic;

  onCreate() {
    console.log("Creation of Game Room")
    this.setState(new GameState());
    this.gameLogic = new SimpleGameLogic(this.state);

    // Register the "move" message handler
    this.onMessage("input", (client, input) => {
      this.gameLogic.handleInput(client, input);
    });

    // Set up the game loop
    this.setSimulationInterval((deltaTime) => this.gameLogic.update(deltaTime, this.clock.elapsedTime));
  }

  onJoin(client) {
    console.log("client joined " + client.sessionId)
    this.gameLogic.addPlayer(client);

    // Send initialization data to the client
    client.send('init', this.gameLogic.getInitializationData() );
  }

  onLeave(client) {
    console.log("client left " + client.sessionId);
    this.gameLogic.removePlayer(client);
  }

  onDispose() {
    // Cleanup code when the room is disposed
  }
}

gameServer.define("game", SimpleGameRoom);
gameServer.listen(2567);