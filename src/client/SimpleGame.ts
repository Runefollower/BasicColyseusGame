
import { SSGameEngineClient } from "./ClientGameEngine";
import * as Colyseus from 'colyseus.js';

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

const gamePrefix = "/BasicGameServer/";
//const gamePrefix="";
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const client = new Colyseus.Client(`${protocol}://${window.location.hostname}:${window.location.port}${gamePrefix}`);
let room: Colyseus.Room;
let gameMetrics: any;

let gameEngine: SSGameEngineClient = new SSGameEngineClient();

let lastStateUpdate = performance.now();
let lastFrameRender = performance.now();




function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let thisFrameRender = performance.now();
  let udt = thisFrameRender - lastStateUpdate;
  let dt = thisFrameRender - lastFrameRender;
  lastFrameRender = thisFrameRender;

  gameEngine.update(udt, dt, thisFrameRender);

  gameEngine.draw(ctx, udt, thisFrameRender, room.state);

  requestAnimationFrame(() => render());
}



// Make this a let so it can be set when the username is entered.
let username: string | null = null;

(async function connectToServer() {
  room = await client.joinOrCreate("game");
  gameEngine.setSessionID(room.sessionId);

  room.onStateChange.once(() => {
  });

  room.onMessage('init', (message) => {
    // retrieve initialization metrics
    gameMetrics = message;

    // Resize canvas to match game area dimensions
    canvas.width = gameMetrics.playAreaWidth;
    canvas.height = gameMetrics.playAreaHeight;
    gameEngine.displayWidth = canvas.width;
    gameEngine.displayHeight = canvas.height;

    let gameDiv = document.getElementById("game-connect") as HTMLDivElement;
    let instructionsDiv = document.getElementById("game-instructions") as HTMLDivElement;

    if (gameDiv) {
      gameDiv.style.height = (gameMetrics.playAreaHeight + 10) + "px";
    }

    if (instructionsDiv) {
      instructionsDiv.style.top = (gameMetrics.playAreaHeight + 10) + "px";
    }
  });

  room.onStateChange(() => {
    lastStateUpdate = performance.now();

    gameEngine.updateFromServer(room.state);
  });

  document.addEventListener("keydown", (event) => {
    if (username) {
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          room.send("input", "w-down");
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          room.send("input", "s-down");
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          room.send("input", "a-down");
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          room.send("input", "d-down");
          break;
        case ' ':
          room.send("input", "fire-down");
          break;
        case 'l':
        case 'L':
          gameEngine.showPlayerLabels = !gameEngine.showPlayerLabels;
          break;
        case 'k':
        case 'K':
          gameEngine.showServerMetrics = !gameEngine.showServerMetrics;
          break;
      }
    }
  });

  document.addEventListener("keyup", (event) => {
    if (username) {
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          room.send("input", "w-up");
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          room.send("input", "s-up");
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          room.send("input", "a-up");
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          room.send("input", "d-up");
          break;
        case ' ':
          room.send("input", "fire-up");
          break;
      }
    }
  });

  render();
})();

document.getElementById("connect").addEventListener("click", async () => {
  username = (document.getElementById("PlayerName") as HTMLInputElement).value;

  if (!username.trim()) {
    alert("Please enter a username.");
    return;
  }

  document.getElementById("game-init").style.display = "none";
  document.getElementById("game-connect").style.zIndex = "1";
  document.getElementById("game-connect").style.display = "block";

  // Now that we have the username, send it to the server.
  room.send("joinGame", username);
});



