import type { ShipType } from "../server/ShipDesignTypes";

/**
 * Smoke particles for the smoke effect
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

  /**
   * Updates the particle's properties according to the given time interval.
   *
   * The velocity of the particle is slowly reduced over time.
   * The position is then updated based on the current velocity and time interval.
   * The particle's life is also reduced by the time interval.
   * Finally, the particle's transparency (alpha) is updated to reflect its remaining life.
   *
   * @param dt - The elapsed time since the last update in milliseconds.
   */
  update(dt: number): void {
    this.vx -= 0.001 * this.vx * dt;
    this.vy -= 0.001 * this.vy * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life / 1000);
  }

  /**
   * Renders the particle on a 2D canvas.
   *
   * A circle is drawn at the particle's position, with a diameter of 2 units.
   * The fill color is set to be a semi-transparent gray, with transparency level
   * set according to the particle's alpha value.
   *
   * @param ctx - The rendering context of the canvas.
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = `rgba(128, 128, 128, ${this.alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/**
 * ParticleEmitter is used for the smoke effect and will manage
 * all particles being rendered
 */
class ParticleEmitter {
  particles: Particle[];

  constructor() {
    this.particles = [];
  }

  emit(
    x: number,
    y: number,
    svx: number,
    svy: number,
    direction: number,
    speed: number
  ): void {
    const angle = direction + (Math.random() - 0.5) * (Math.PI / 6);
    const vx = Math.cos(angle) * speed + svx;
    const vy = Math.sin(angle) * speed + svy;
    const life = Math.random() * 500 + 500; // Random life between 0.5 and 1 seconds
    this.particles.push(new Particle(x, y, vx, vy, life));
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(dt);

      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach((particle) => {
      particle.render(ctx);
    });
  }
}

export class SpaceShipRender {
  particleEmitter: ParticleEmitter;
  laserLength: number;
  shipDesignsMap: Map<string, ShipType> = new Map<string, ShipType>();

  constructor() {
    this.particleEmitter = new ParticleEmitter();
    this.laserLength = 10;
  }

  setShipDesigns(newDesigns: any): void {
    const shipDesignsArray: ShipType[] = newDesigns;
    this.shipDesignsMap = shipDesignsArray.reduce(
      (map, shipType) => map.set(shipType.id, shipType),
      new Map<string, ShipType>()
    );

    const ss = this.shipDesignsMap.get("SpaceShip");
    if (ss !== undefined) console.log(ss.id);
  }

  update(dt: number): void {
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
    displayExhaust: boolean,
    health: number,
    maxHealth: number,
    shipType: string
  ): void {
    const sType = this.shipDesignsMap.get(shipType);
    if (sType === undefined) {
      console.error("Ship type not found :" + shipType);
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(direction);

    // Render the ship
    sType.shapes.forEach((shape) => {
      ctx.beginPath();
      if (shape.type === "polygon") {
        ctx.moveTo(shape.points[0].x, shape.points[0].y); // Move to the first point
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y); // Draw lines to subsequent points
        }
        ctx.closePath(); // Close the path
      } else if (shape.type === "circle") {
        ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, 2 * Math.PI);
      }

      if (shape.fillColor === "playerColor") {
        ctx.fillStyle = this.selectFillColor(color);
      } else {
        ctx.fillStyle = shape.fillColor;
      }

      if (shape.strokeColor === "playerColor") {
        ctx.strokeStyle = this.selectStrokeColor(color);
      } else {
        ctx.strokeStyle = shape.strokeColor;
      }
      ctx.lineWidth = shape.lineWidth;

      ctx.fill();
      ctx.stroke();
    });

    // Render a flame when accelerating
    if (accel > 0 && sType.hasFlame) {
      sType.flames.forEach((shape) => {
        ctx.beginPath();
        if (shape.type === "polygon") {
          ctx.moveTo(shape.points[0].x, shape.points[0].y); // Move to the first point
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y); // Draw lines to subsequent points
          }
          ctx.closePath(); // Close the path
        } else if (shape.type === "circle") {
          ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, 2 * Math.PI);
        }
        ctx.fillStyle = shape.fillColor;
        ctx.strokeStyle = shape.strokeColor;
        ctx.lineWidth = shape.lineWidth;
        ctx.fill();
        ctx.stroke();
      });

      if (displayExhaust) {
        // Emit smoke particles
        const smokeX = x - 20 * Math.cos(direction);
        const smokeY = y - 20 * Math.sin(direction);
        this.particleEmitter.emit(
          smokeX,
          smokeY,
          vx,
          vy,
          direction + Math.PI,
          0.03
        );
      }
    }

    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    this.renderHealthBar(-10, 10, health, maxHealth, ctx);
    ctx.restore();

    if (displayName) {
      ctx.save();
      ctx.translate(x, y);
      ctx.font = "12px Courier";
      ctx.textAlign = "right";
      ctx.fillStyle = color;
      const labelMetrics = ctx.measureText(name);

      ctx.fillText(
        name,
        labelMetrics.width / 2,
        labelMetrics.actualBoundingBoxAscent + 15
      );
      ctx.restore();
    }

    if (displayExhaust) {
      this.particleEmitter.render(ctx);
    }
  }

  selectFillColor(color: string): string {
    if (color === "blue") {
      return "rgb(118, 141, 252)";
    } else if (color === "red") {
      return "rgb(245, 131, 135)";
    } else {
      return color;
    }
  }

  selectStrokeColor(color: string): string {
    if (color === "blue") {
      return "rgb(88, 105, 189)";
    } else if (color === "red") {
      return "rgb(180, 58, 63)";
    } else {
      return color;
    }
  }

  renderHealthBar(
    x: number,
    y: number,
    health: number,
    maxHealth: number,
    ctx: CanvasRenderingContext2D
  ): void {
    if (health < maxHealth) {
      const barWidth = 20;
      const healthWidth = (health / maxHealth) * barWidth;
      ctx.lineWidth = 1;
      ctx.fillStyle = "red";
      ctx.strokeStyle = "red";
      ctx.strokeRect(x, y, barWidth, 3);
      ctx.fillRect(x, y, healthWidth, 3);
    }
  }

  renderLaser(
    x: number,
    y: number,
    direction: number,
    ctx: CanvasRenderingContext2D
  ): void {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;

    const startX = x - this.laserLength * Math.cos(direction);
    const startY = y - this.laserLength * Math.sin(direction);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  renderCannonball(x: number, y: number, ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = this.selectFillColor("blue");
    ctx.strokeStyle = this.selectStrokeColor("blue");
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();
  }
}
