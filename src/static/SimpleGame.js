const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const radius = 10;

//To keep track the time of the last server update
lastStateUpdate = 0.0;

//For counting the number of frame updates since the
//last server update
framesBetweenState = 0;
maxFramesBetweenState = 0;

const client = new Colyseus.Client("ws://localhost:2567");
let room;

function drawCircle(x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = color;
  ctx.fill();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  timeStepUpdate = performance.now() - lastStateUpdate;

  //Rendering...  loop through clients and render to screen
  //updating the position for latency from last update
  room.state.players.forEach((player, sessionId) => {
    const color = sessionId === room.sessionId ? "blue" : "green";
    drawCircle(player.x + (player.vx * timeStepUpdate), 
               player.y + (player.vy * timeStepUpdate), color);
  });

  //Keep track of how many frames have been rendered
  //without a server update, and keep track of the
  //max max frames without update
  if (framesBetweenState > maxFramesBetweenState) {
      maxFramesBetweenState = framesBetweenState;
  }
  framesBetweenState ++;

  requestAnimationFrame(() => render());
}

document.addEventListener("DOMContentLoaded", async () => {
  room = await client.joinOrCreate("game");

  room.onStateChange.once(() => {
    // Initial state received from the server
    // keeping track of the timestep and resetting the counter to check
    // frames without update
    lastStateUpdate = performance.now();
    framesBetweenState = 0;
  });

  room.onStateChange(() => {
    // Update state received from the server
    // keeping track of the timestep and resetting the counter to check
    // frames without update
    lastStateUpdate = performance.now();
    framesBetweenState = 0;
  });

  document.addEventListener("keydown", (event) => {
    room.send("move", event.key);
  });

  render();
});