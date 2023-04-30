const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const radius = 10;

const client = new Colyseus.Client("ws://localhost:2567");
let room;

function drawCircle(x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = color;
  ctx.fill();
}

function render(players) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  players.forEach((player, sessionId) => {
    const color = sessionId === room.sessionId ? "blue" : "green";
    drawCircle(player.x, player.y, color);
  });

  requestAnimationFrame(() => render(players));
}

document.addEventListener("DOMContentLoaded", async () => {
  room = await client.joinOrCreate("game");

  room.onStateChange.once((state) => {
    // Initial state received from the server
    render(state.players);
  });

  room.onStateChange((state) => {
    // Update the state.players object on every state change
    render(state.players);
  });

  document.addEventListener("keydown", (event) => {
    room.send("move", event.key);
  });

  render();
});