
/* 
 * Smoke particles, the individual particles
 * and the particle emitter for the smoke particle effect
 */

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  alpha: number;

  constructor(x: number, y: number, vx: number, vy: number, life: number) {
    this.x = x;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.alpha = 1;
  }

  update(dt: number) {
    this.vx -= .001 * this.vx * dt;
    this.vy -= .001 * this.vy * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life / 1000);
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = `rgba(128, 128, 128, ${this.alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}

class ParticleEmitter {
  particles: Particle[];

  constructor() {
    this.particles = [];
  }

  emit(x: number, y: number, svx: number, svy: number, direction: number, speed: number) {
    const angle = direction + (Math.random() - 0.5) * (Math.PI / 6);
    const vx = (Math.cos(angle) * speed) + svx;
    const vy = (Math.sin(angle) * speed) + svy;
    const life = Math.random() * 500 + 500; // Random life between 0.5 and 1 seconds
    this.particles.push(new Particle(x, y, vx, vy, life));
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(dt);

      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    this.particles.forEach((particle) => {
      particle.render(ctx);
    });
  }
}




export class SpaceShipRender {
  particleEmitter: ParticleEmitter;
  laserLength: number;

  constructor() {
    this.particleEmitter = new ParticleEmitter();
    this.laserLength = 10;
  }

  update(dt: number) {
    this.particleEmitter.update(dt);
  }

  render(
    x: number,
    y: number,
    vx: number,
    vy: number,
    direction: number,
    color: string,
    accel: number,
    ctx: CanvasRenderingContext2D,
    name: string,
    displayName: boolean,
    displayExhaust: boolean
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(direction);

    //Render the ship
    ctx.beginPath();
    ctx.moveTo(10, 0);  // Forward point of the triangle
    ctx.lineTo(-6, 7);  // Bottom right point of the triangle
    ctx.lineTo(-3, 0);  // Center of engine
    ctx.lineTo(-6, -7); // Bottom left point of the triangle
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();

    //Render a flame when accelerating
    if (accel > 0) {
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-8, 5);
      ctx.lineTo(-17, 0);
      ctx.lineTo(-8, -5);
      ctx.closePath();

      ctx.fillStyle = "red";
      ctx.fill();

      if (displayExhaust) {
        // Emit smoke particles
        const smokeX = x - 20 * Math.cos(direction);
        const smokeY = y - 20 * Math.sin(direction);
        this.particleEmitter.emit(smokeX, smokeY, vx, vy, direction + Math.PI, .03);
      }
    }

    ctx.restore();

    if (displayName) {
      ctx.save();
      ctx.translate(x, y);
      const fontSize = 9;
      ctx.font = "10px Courier";
      ctx.textAlign = 'right';
      ctx.fillStyle = color;
      const labelMetrics = ctx.measureText(name);

      ctx.fillText(name, labelMetrics.width / 2, labelMetrics.actualBoundingBoxAscent + 10);
      ctx.restore();
    }

    if (displayExhaust) {
      this.particleEmitter.render(ctx);
    }
  }

  renderLaser(
    x: number,
    y: number,
    direction: number,
    ctx: CanvasRenderingContext2D
  ) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;

    const startX = x - this.laserLength * Math.cos(direction);
    const startY = y - this.laserLength * Math.sin(direction);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}