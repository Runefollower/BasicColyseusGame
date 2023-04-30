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

function drawSpaceship(x, y, direction, color, accel) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(direction);

  ctx.beginPath();
  ctx.moveTo(10, 0); // Forward point of the triangle
  ctx.lineTo(-6, 7); // Bottom right point of the triangle
  ctx.lineTo(-3, 0); // Center of engine
  ctx.lineTo(-6, -7); // Bottom left point of the triangle
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();

  if (accel > 0) {
      ctx.beginPath();
      ctx.moveTo(-6, 0); 
      ctx.lineTo(-8, 3); 
      ctx.lineTo(-15, 0); 
      ctx.lineTo(-8, -3); 
      ctx.closePath();

      ctx.fillStyle = "red";
      ctx.fill();
  }

  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  timeStepUpdate = performance.now() - lastStateUpdate;

  //Rendering...  loop through clients and render to screen
  //updating the position for latency from last update
  room.state.players.forEach((player, sessionId) => {
    const color = sessionId === room.sessionId ? "blue" : "green";
    drawSpaceship(
      player.x + player.vx * timeStepUpdate,
      player.y + player.vy * timeStepUpdate,
      player.direction,
      color,
      player.accel
    );
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
    const key = event.key;
    if (["w", "a", "s", "d"].includes(key)) {
      room.send("input", key + "-down");
    }
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key;
    if (["w", "a", "s", "d"].includes(key)) {
      room.send("input", key + "-up");
    }
  });

  render();
});