import http from "http";
import express from "express";
import path from 'path';
import serveIndex from 'serve-index';

import { Server, Room, Client } from "colyseus";
import { GameState } from "./GameState";
import { SimpleGameLogic } from "./SimpleGameLogic";
import { logWithTimestamp } from "./ServerTools";

let staticRoot = "../web";
if (process.argv.includes('-d')) {
  logWithTimestamp("Running in dev mode");
  staticRoot = "../../dist/web";
} else {
  logWithTimestamp("Running in prod mode");
}


const app = express();
app.use(express.json());
app.use('/', serveIndex(path.join(__dirname, staticRoot), { 'icons': true }))
app.use('/', express.static(path.join(__dirname, staticRoot)));

const gameServer = new Server({
  server: http.createServer(app),
  //express: app,
});

export class SimpleGameRoom extends Room<GameState> {
  gameLogic: SimpleGameLogic;

  onAuth(client, options, req) {
    // Perform any authentication or authorization here
    // You can access request headers or cookies via `req` object
    // Return true if the client is authorized, otherwise false
    return true;
  }

  onInit(options) {
    // Initialize the room here
  }

  async onCreate() {
    logWithTimestamp("CreateGameRoom")
    this.setState(new GameState());
    this.gameLogic = new SimpleGameLogic(this.state);

    // Register the "move" message handler
    this.onMessage("input", (client, input) => {
      this.gameLogic.handleInput(client, input);
    });

    // Register the "joinGame" message handler
    this.onMessage("joinGame", (client, input) => {
      logWithTimestamp("ClientJoined ClientID:" + client.sessionId + " Username:" + input);
      this.gameLogic.addPlayer(client, input);
    });

    // Set up the game loop
    this.setSimulationInterval((deltaTime) => this.gameLogic.update(deltaTime, this.clock.elapsedTime));
  }

  async onJoin(client) {
    logWithTimestamp("ClientConnected ClientID:" + client.sessionId );

    // Send initialization data to the client
    client.send('init', this.gameLogic.getInitializationData());
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
gameServer.listen(3000);