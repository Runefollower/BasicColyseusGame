import http from "http";
import express from "express";
import path from "path";
import serveIndex from "serve-index";

import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";

import { SimpleGameRoom } from "./SimpleGameRoom";
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
  transport: new WebSocketTransport({ server: http.createServer(app) }),
});

gameServer.define("game", SimpleGameRoom);

gameServer.listen(3000).then(
  () => console.log(generateLogWithTimestamp("Bound to port")),
  (error) => console.log(generateLogWithTimestamp("Failed to bind to port: " + error)),
);

if (devMode) {
  console.log(generateLogWithTimestamp("The game is now running at http://localhost:3000/index.html"));
}