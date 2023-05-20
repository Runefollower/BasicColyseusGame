import { SpaceShipRender } from "./SpaceShipRenderer.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const radius = 10;

//To keep track the time of the last server update
let lastStateUpdate = 0.0;

//To keep track the time of the last frame render
let lastFrameRender = 0.0;

//For counting the number of frame updates since the
//last server update
let framesBetweenState = 0;
let maxFramesBetweenState = 0;

let ssRender = new SpaceShipRender();

const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const client = new Colyseus.Client(`${protocol}://${window.location.hostname}:${window.location.port}${gamePrefix}`);
let room;
let gameMetrics;



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
      ctx
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
  sortedPlayers.forEach(([id, player], index) => {
    ctx.fillText(`${player.username}: ${player.score}`, canvas.width - 10, 20 + index * 20);
  });
}

function getSortedPlayers() {
  const playersArray = Array.from(room.state.players.entries());
  return playersArray.sort((a, b) => b[1].score - a[1].score);
}

document.getElementById("connect").addEventListener("click", async () => {
  const username = document.getElementById("username").value;

  if (!username.trim()) {
    alert("Please enter a username.");
    return;
  }

  document.getElementById("game-init").style.display = "none";
  document.getElementById("game-connect").style.display = "block";

  room = await client.joinOrCreate("game", { username });

  room.onStateChange.once(() => {
    // Initial state received from the server
    // keeping track of the timestep and resetting the counter to check
    // frames without update
    lastStateUpdate = performance.now();
    framesBetweenState = 0;
  });

  room.onMessage('init', (message) => {
    // retrive initialization metrics
    gameMetrics = message;

    // Resize canvas to match game area dimensions
    canvas.width = gameMetrics.playAreaWidth;
    canvas.height = gameMetrics.playAreaHeight;
  });

  room.onStateChange(() => {
    // Update state received from the server
    // keeping track of the timestep and resetting the counter to check
    // frames without update
    lastStateUpdate = performance.now();
    framesBetweenState = 0;
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key;
    if (["w", "a", "s", "d"].includes(key)) {
      room.send("input", key + "-down");
    } else if (key === " ") {
      room.send("input", "fire-down");
    }
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key;
    if (["w", "a", "s", "d"].includes(key)) {
      room.send("input", key + "-up");
    } else if (event.key === " ") {
      room.send("input", "fire-up");
    }
  });

  render();
});