const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const radius = 10;

//To keep track the time of the last server update
let lastStateUpdate = 0.0;

//For counting the number of frame updates since the
//last server update
let framesBetweenState = 0;
let maxFramesBetweenState = 0;

const client = new Colyseus.Client("ws://localhost:2567");
let room;

/* 
 * Smoke particles, the individual particles
 * and the particle emitter for the smoke particle effect
 */

class Particle {
  constructor(x, y, vx, vy, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.alpha = 1;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life);
  }

  render(ctx) {
    ctx.fillStyle = `rgba(128, 128, 128, ${this.alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}

class ParticleEmitter {
  constructor() {
    this.particles = [];
  }

  emit(x, y, direction, speed) {
    const angle = direction + (Math.random() - 0.5) * (Math.PI / 6);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const life = Math.random() * 0.5 + 0.5; // Random life between 0.5 and 1 seconds
    this.particles.push(new Particle(x, y, vx, vy, life));
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(dt);

      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    this.particles.forEach((particle) => {
      particle.render(ctx);
    });
  }
}


const particleEmitter = new ParticleEmitter();


const laserLength = 10;

function drawLaser(x, y, direction) {
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;

  const startX = x - laserLength * Math.cos(direction);
  const startY = y - laserLength * Math.sin(direction);

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(x, y);
  ctx.stroke();
}

function drawSpaceship(x, y, direction, color, accel) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(direction);

  //Render the ship
  ctx.beginPath();
  ctx.moveTo(10, 0); // Forward point of the triangle
  ctx.lineTo(-6, 7); // Bottom right point of the triangle
  ctx.lineTo(-3, 0); // Center of engine
  ctx.lineTo(-6, -7); // Bottom left point of the triangle
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();

  //Render a flame when accelerating
  if (accel > 0) {
      ctx.beginPath();
      ctx.moveTo(-6, 0); 
      ctx.lineTo(-8, 3); 
      ctx.lineTo(-15, 0); 
      ctx.lineTo(-8, -3); 
      ctx.closePath();

      ctx.fillStyle = "red";
      ctx.fill();

      // Emit smoke particles
      const smokeX = x - 15 * Math.cos(direction);
      const smokeY = y - 15 * Math.sin(direction);
      particleEmitter.emit(smokeX, smokeY, direction + Math.PI, 30);
  }

  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let timeStepUpdate = performance.now() - lastStateUpdate;

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

  room.state.lasers.forEach((laser) => {
    drawLaser(
      laser.x + laser.vx * timeStepUpdate,
      laser.y + laser.vy * timeStepUpdate,
      laser.direction
    );
  });


  const dt = (performance.now() - lastStateUpdate) / 1000; // Convert to seconds

  // Update and render smoke particles
  particleEmitter.update(dt);
  particleEmitter.render(ctx);

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