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

function logWithTimestamp(...messages) {
  const timestamp = new Date().toISOString();
  console.log(timestamp, ...messages);
}

export class SimpleGameRoom extends Room<GameState> {
  gameLogic: SimpleGameLogic;

  onCreate() {
    logWithTimestamp("CreateGameRoom")
    this.setState(new GameState());
    this.gameLogic = new SimpleGameLogic(this.state);

    // Register the "move" message handler
    this.onMessage("input", (client, input) => {
      this.gameLogic.handleInput(client, input);
    });

    // Set up the game loop
    this.setSimulationInterval((deltaTime) => this.gameLogic.update(deltaTime, this.clock.elapsedTime));
  }

  onJoin(client, options) {
    logWithTimestamp("ClientJoined ClientID:" + client.sessionId + " Username:" + options.username)
    this.gameLogic.addPlayer(client, options.username);

    // Send initialization data to the client
    client.send('init', this.gameLogic.getInitializationData() );
  }

  onLeave(client) {
    logWithTimestamp("ClientLeft   ClientID:" + client.sessionId);
    this.gameLogic.removePlayer(client);
  }

  onDispose() {
    // Cleanup code when the room is disposed
  }
}

gameServer.define("game", SimpleGameRoom);
gameServer.listen(2567);