import http from "http";
import express from "express";
import path from "path";
import serveIndex from "serve-index";

import { Server, Room } from "colyseus";
import type { Client } from "colyseus";
import { GameState } from "./GameState";
import { SimpleGameLogic } from "./SimpleGameLogic";
import { logWithTimestamp } from "./ServerTools";

let staticRoot = "../web";

const devMode = process.argv.includes("-d");

if (devMode) {
  logWithTimestamp("Running in dev mode");
  staticRoot = "../../dist/web";
} else {
  logWithTimestamp("Running in prod mode");
}

const app = express();
app.use(express.json());
app.use("/", serveIndex(path.join(__dirname, staticRoot), { icons: true }));
app.use("/", express.static(path.join(__dirname, staticRoot)));

const gameServer = new Server({
  server: http.createServer(app),
  // express: app,
});

export class SimpleGameRoom extends Room<GameState> {
  gameLogic: SimpleGameLogic;

  onAuth(_client, _options, _req): boolean {
    // Perform any authentication or authorization here
    // You can access request headers or cookies via `req` object
    // Return true if the client is authorized, otherwise false
    return true;
  }

  onInit(_options): void {
    // Initialize the room here
  }

  async onCreate(): Promise<void> {
    logWithTimestamp("CreateGameRoom");
    this.setState(new GameState());
    this.gameLogic = new SimpleGameLogic(this.state);

    // Register the "move" message handler
    this.onMessage("input", (client, input) => {
      this.gameLogic.handleInput(client, input);
    });

    // Register the "joinGame" message handler
    this.onMessage("joinGame", (client, input) => {
      logWithTimestamp(
        "ClientJoined ClientID:" +
          String(client.sessionId) +
          " Username:" +
          String(input)
      );
      this.gameLogic.addPlayer(client, input);
    });

    // Set up the game loop
    this.setSimulationInterval((deltaTime) => {
      this.gameLogic.update(deltaTime, this.clock.elapsedTime);
    });
  }

  async onJoin(client: Client): Promise<void> {
    logWithTimestamp("ClientConnected ClientID:" + String(client.sessionId));

    // Send initialization data to the client
    client.send("init", this.gameLogic.getInitializationData());
  }

  onLeave(client: Client): void {
    logWithTimestamp("ClientLeft   ClientID:" + String(client.sessionId));
    this.gameLogic.removePlayer(client);
  }

  onDispose(): void {
    // Cleanup code when the room is disposed
  }
}

gameServer.define("game", SimpleGameRoom);
gameServer.listen(3000).then(
  function (_value) {
    logWithTimestamp("Bound to port");
  },
  function (error) {
    logWithTimestamp("Failed to bind to port:" + String(error));
  }
);

if (devMode) {
  logWithTimestamp(
    "The game is now running at http://localhost:3000/index.html"
  );
}
