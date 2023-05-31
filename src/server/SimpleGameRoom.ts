import http from "http";
import express from "express";
import path from "path";
import serveIndex from "serve-index";

import { Server, Room } from "colyseus";
import type { Client } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GameState } from "./GameState";
import { SimpleGameLogic } from "./SimpleGameLogic";
import { generateLogWithTimestamp } from "./ServerTools";

let staticRoot = "../web";

const devMode = process.argv.includes("-d");

if (devMode) {
  console.log(generateLogWithTimestamp("Running in dev mode"));
  staticRoot = "../../dist/web";
} else {
  console.log(generateLogWithTimestamp("Running in prod mode"));
}

const app = express();
app.use(express.json());
app.use("/", serveIndex(path.join(__dirname, staticRoot), { icons: true }));
app.use("/", express.static(path.join(__dirname, staticRoot)));

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: http.createServer(app),
  }),
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
    console.log(generateLogWithTimestamp("CreateGameRoom"));
    this.setState(new GameState());
    this.gameLogic = new SimpleGameLogic(this.state);

    // Register the "move" message handler
    this.onMessage("input", (client, input) => {
      this.gameLogic.handleInput(client.sessionId, input);
    });

    this.onMessage("mouseDirection", (client, direction) => {
      this.gameLogic.mouseDirection(client.sessionId, direction);
    });

    // Register the "joinGame" message handler
    this.onMessage("joinGame", (client, input) => {
      console.log(
        generateLogWithTimestamp(
          "ClientJoined ClientID:" +
            String(client.sessionId) +
            " Username:" +
            String(input)
        )
      );
      this.gameLogic.addPlayer(client, input);
    });

    // Set up the game loop
    this.setSimulationInterval((deltaTime) => {
      this.gameLogic.update(deltaTime, this.clock.elapsedTime);
    });
  }

  async onJoin(client: Client): Promise<void> {
    console.log(
      generateLogWithTimestamp(
        "ClientConnected ClientID:" + String(client.sessionId)
      )
    );

    // Send initialization data to the client
    client.send("init", this.gameLogic.getInitializationData());
  }

  onLeave(client: Client): void {
    console.log(
      generateLogWithTimestamp(
        "ClientLeft   ClientID:" + String(client.sessionId)
      )
    );
    this.gameLogic.removePlayer(client);
  }

  onDispose(): void {
    // Cleanup code when the room is disposed
  }
}

gameServer.define("game", SimpleGameRoom);
gameServer.listen(3000).then(
  function (_value) {
    console.log(generateLogWithTimestamp("Bound to port"));
  },
  function (error) {
    console.log(
      generateLogWithTimestamp("Failed to bind to port:" + String(error))
    );
  }
);

if (devMode) {
  console.log(
    generateLogWithTimestamp(
      "The game is now running at http://localhost:3000/index.html"
    )
  );
}
