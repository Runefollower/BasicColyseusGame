import type { SSGameEngineClient } from "./ClientGameEngine";

class MenuItem {
  x: number;
  y: number;
  height: number;
  width: number;
  text: string;

  constructor(text: string) {
    this.text = text;
  }

  setPosition(x: number, y: number, height: number, width: number): void {
    this.x = x;
    this.y = y;
    this.height = height;
    this.width = width;
  }

  render(ctx: CanvasRenderingContext2D): void {
    throw new Error("Method 'render' must be implemented in the subclass");
  }

  getBoolValue(): boolean {
    throw new Error("Method 'clickEvent' must be implemented in the subclass");
  }

  clickEvent(x: number, y: number): void {
    throw new Error("Method 'clickEvent' must be implemented in the subclass");
  }
}

class CheckMenuItem extends MenuItem {
  value: boolean;

  constructor(text: string, value: boolean) {
    super(text);
    this.value = value;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "rgb(0,0,0)";
    ctx.fillStyle = "rgb(0,0,100)";

    if (this.value) {
      ctx.fillRect(this.x, this.y, 10, 10);
    }

    ctx.strokeRect(this.x, this.y, 10, 10);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgb(0,0,0)";

    ctx.fillText(this.text, this.x + 15, this.y + 10);
  }

  clickEvent(x: number, y: number): void {
    if (
      x > this.x &&
      x < this.x + this.width &&
      y > this.y &&
      y < this.y + this.height
    ) {
      this.value = !this.value;
    }
  }

  getBoolValue(): boolean {
    return this.value;
  }
}

class CallbackMenuItem extends MenuItem {
  callback: () => void;

  constructor(text: string, callback: () => void) {
    super(text);
    this.callback = callback;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillText(this.text, this.x + 15, this.y + 10);
  }

  clickEvent(x: number, y: number): void {
    if (
      x > this.x &&
      x < this.x + this.width &&
      y > this.y &&
      y < this.y + this.height
    ) {
      this.callback();
    }
  }

  getBoolValue(): boolean {
    return false;
  }
}

export class SettingsController {
  showCollapsed: boolean;
  menuItems: MenuItem[];
  gameEngine: SSGameEngineClient;

  constructor(gameEngine: SSGameEngineClient) {
    this.showCollapsed = true;
    this.gameEngine = gameEngine;

    this.menuItems = [
      new CheckMenuItem("Show Labels", false),
      new CheckMenuItem("Show Metrics", false),
      new CheckMenuItem("Show Instructions", false),
    ];

    const x = 15;
    const height = 20;
    const width = 100;

    let y = 40;
    for (const item of this.menuItems) {
      item.setPosition(x, y, height, width);
      y += 20; // increment y by 20 for each item
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.drawPulldownButton(ctx);
    if (!this.showCollapsed) {
      ctx.strokeStyle = "rgb(10,10,10)";
      ctx.strokeRect(10, 10, 120, 120);
      this.drawMenu(ctx);
    }
  }

  drawMenu(ctx: CanvasRenderingContext2D): void {
    ctx.font = "12px Courier";
    for (const item of this.menuItems) {
      item.render(ctx);
    }
  }

  drawPulldownButton(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "rgb(10,10,10)";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 14, 14);

    ctx.beginPath();
    if (this.showCollapsed) {
      ctx.moveTo(14, 14);
      ctx.lineTo(17, 20);
      ctx.lineTo(20, 14);
    } else {
      ctx.moveTo(14, 20);
      ctx.lineTo(17, 14);
      ctx.lineTo(20, 20);
    }
    ctx.stroke();
  }

  clickEvent(x: number, y: number): void {
    if (!this.showCollapsed) {
      for (const item of this.menuItems) {
        item.clickEvent(x, y);
      }
    }
    if (x > 10 && x < 24 && y > 10 && y < 24) {
      this.showCollapsed = !this.showCollapsed;
    }

    this.gameEngine.showPlayerLabels = this.menuItems[0].getBoolValue();
    this.gameEngine.showServerMetrics = this.menuItems[1].getBoolValue();
    this.gameEngine.showInstructions = this.menuItems[2].getBoolValue();
  }

  addCallbackMenuItem(text: string, callback: () => void): void {
    const newItem = new CallbackMenuItem(text, callback);
    const x = 15;
    const height = 20;
    const width = 100;
    const y = 40 + this.menuItems.length * 20; // calculate y based on the number of existing items
    newItem.setPosition(x, y, height, width);
    this.menuItems.push(newItem);
  }
}
