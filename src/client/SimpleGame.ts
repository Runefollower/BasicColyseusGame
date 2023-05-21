import { SpaceShipRender } from "./SpaceShipRenderer";
import * as Colyseus from 'colyseus.js';

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

//To keep track the time of the last server update
let lastStateUpdate = 0.0;

//To keep track the time of the last frame render
let lastFrameRender = 0.0;

//For counting the number of frame updates since the
//last server update
let framesBetweenState = 0;
let maxFramesBetweenState = 0;

let showPlayerLabels = false;
let ssRender = new SpaceShipRender();

const gamePrefix = "/BasicGameServer/";
//const gamePrefix="";
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const client = new Colyseus.Client(`${protocol}://${window.location.hostname}:${window.location.port}${gamePrefix}`);
let room: Colyseus.Room;
let gameMetrics: any;




function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let thisFrameRender = performance.now();
  let udt = thisFrameRender - lastStateUpdate;
  let dt = thisFrameRender - lastFrameRender;
  lastFrameRender = thisFrameRender;

  ssRender.update(dt);

  //Rendering...  loop through clients and render to screen
  //updating the position for latency from last update
  room.state.players.forEach((player, sessionId) => {
    const color = sessionId === room.sessionId ? "blue" : "green";
    ssRender.render(
      player.x + player.vx * udt,
      player.y + player.vy * udt,
      player.vx,
      player.vy,
      player.direction,
      color,
      player.accel,
      ctx,
      player.username,
      showPlayerLabels,
      true
    );
  });

  room.state.lasers.forEach((laser) => {
    ssRender.renderLaser(
      laser.x + laser.vx * udt,
      laser.y + laser.vy * udt,
      laser.direction,
      ctx
    );
  });

  // Rendering game scores.
  renderScores();

  //Keep track of how many frames have been rendered
  //without a server update, and keep track of the
  //max max frames without update
  if (framesBetweenState > maxFramesBetweenState) {
    maxFramesBetweenState = framesBetweenState;
  }
  framesBetweenState++;

  requestAnimationFrame(() => render());
}

// This function will render the scores.
function renderScores() {
  const sortedPlayers = getSortedPlayers();
  ctx.fillStyle = 'black';
  ctx.font = '16px Arial';
  ctx.textAlign = 'right';

  let maxWidth = 0;
  (sortedPlayers as Array<[string, any]>).forEach(([id, player], index) => {
    const playerLabel = `${player.username}: ${player.score}`;
    const textWidth = ctx.measureText(playerLabel).width;
    if (textWidth > maxWidth) {
      maxWidth = textWidth;
    }
  });

  // Include some padding between the spaceship and the text
  const padding = 30;

  // Using sortedPlayers array for ordering
  (sortedPlayers as Array<[string, any]>).forEach(([id, player], index) => {
    const playerLabel = `${player.username}: ${player.score}`;

    ctx.fillStyle = `rgba(10, 10, 10, 1)`;
    ctx.fillText(playerLabel, canvas.width - 10, 20 + index * 20);

    // Render a small spaceship to the left of the player name, shift by maxWidth
    ssRender.render(
      canvas.width - maxWidth - padding - 10, // shifted x-position
      12 + index * 20, // same y-position as the text
      0, // static vx
      0, // static vy
      player.direction, // same orientation
      id === room.sessionId ? "blue" : "green", // same color
      player.accel, // no acceleration
      ctx,
      "", false, false
    );
  });
}

function getSortedPlayers() {
  const playersArray = Array.from(room.state.players.entries());
  return playersArray.sort((a, b) => b[1].score - a[1].score);
}



// Make this a let so it can be set when the username is entered.
let username: string | null = null;

(async function connectToServer() {
  room = await client.joinOrCreate("game");
  room.onStateChange.once(() => {
    // Initial state received from the server
    // keeping track of the timestep and resetting the counter to check
    // frames without update
    lastStateUpdate = performance.now();
    framesBetweenState = 0;
  });

  room.onMessage('init', (message) => {
    // retrieve initialization metrics
    gameMetrics = message;

    // Resize canvas to match game area dimensions
    canvas.width = gameMetrics.playAreaWidth;
    canvas.height = gameMetrics.playAreaHeight;

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
    // Update state received from the server
    // keeping track of the timestep and resetting the counter to check
    // frames without update
    lastStateUpdate = performance.now();
    framesBetweenState = 0;
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
          showPlayerLabels = !showPlayerLabels;
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



