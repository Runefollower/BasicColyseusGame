import { SpaceShipRender } from "./SpaceShipRenderer.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const radius = 10;

//To keep track the time of the last server update
let lastStateUpdate = 0.0;

//For counting the number of frame updates since the
//last server update
let framesBetweenState = 0;
let maxFramesBetweenState = 0;

let ssRender = new SpaceShipRender();

const client = new Colyseus.Client("ws://localhost:2567");
let room;







function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let dt = performance.now() - lastStateUpdate;

  ssRender.update(dt);

  //Rendering...  loop through clients and render to screen
  //updating the position for latency from last update
  room.state.players.forEach((player, sessionId) => {
    const color = sessionId === room.sessionId ? "blue" : "green";
    ssRender.render(
      player.x + player.vx * dt,
      player.y + player.vy * dt,
      player.direction,
      color,
      player.accel,
      ctx
    );
  });

  room.state.lasers.forEach((laser) => {
    ssRender.renderLaser(
      laser.x + laser.vx * dt,
      laser.y + laser.vy * dt,
      laser.direction,
      ctx
    );
  });

  //Keep track of how many frames have been rendered
  //without a server update, and keep track of the
  //max max frames without update
  if (framesBetweenState > maxFramesBetweenState) {
    maxFramesBetweenState = framesBetweenState;
  }
  framesBetweenState++;

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
    } else if (key === " ") {
      room.send("fire");
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