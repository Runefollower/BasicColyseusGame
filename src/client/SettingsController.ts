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
  menuItems: Map<string, MenuItem>;
  gameEngine: SSGameEngineClient;

  showLabelsKey = "showLabels";
  showMetricsKey = "showMetrics";
  showInstKey = "showInstructions";
  invertJoyKey = "invertMetrics";

  constructor(gameEngine: SSGameEngineClient) {
    this.showCollapsed = true;
    this.gameEngine = gameEngine;

    this.menuItems = new Map<string, MenuItem>();

    this.addCheckMenuItem(this.showLabelsKey, "Show Labels", false);
    this.addCheckMenuItem(this.showMetricsKey, "Show Metrics", false);
    this.addCheckMenuItem(this.showInstKey, "Show Instructions", false);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.showCollapsed) {
      ctx.fillStyle = "rgb(180,180,255)";
      ctx.fillRect(10, 10, 150, 150);
      ctx.strokeStyle = "rgb(10,10,10)";
      ctx.strokeRect(10, 10, 150, 150);
      this.drawMenu(ctx);
    }
    this.drawPulldownButton(ctx);
  }

  drawMenu(ctx: CanvasRenderingContext2D): void {
    ctx.font = "12px Courier";
    for (const item of this.menuItems.values()) {
      item.render(ctx);
    }
  }

  drawPulldownButton(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgb(250,180,180)";
    ctx.fillRect(10, 10, 14, 14);
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
      for (const item of this.menuItems.values()) {
        item.clickEvent(x, y);
      }
    }
    if (x > 10 && x < 24 && y > 10 && y < 24) {
      this.showCollapsed = !this.showCollapsed;
    }
  }

  addMenuItem(key: string, menuItem: MenuItem): void {
    const x = 15;
    const height = 20;
    const width = 100;
    const y = 40 + this.menuItems.size * 20; // calculate y based on the number of existing items
    menuItem.setPosition(x, y, height, width);
    this.menuItems.set(key, menuItem);
  }

  addCallbackMenuItem(key: string, text: string, callback: () => void): void {
    const newItem = new CallbackMenuItem(text, callback);
    this.addMenuItem(key, newItem);
  }

  getMenuItemBoolValue(key: string): boolean {
    const menuItem: MenuItem | undefined = this.menuItems.get(key);
    if (menuItem === undefined) {
      return false;
    } else {
      return menuItem.getBoolValue();
    }
  }

  addCheckMenuItem(key: string, label: string, initValue: boolean): void {
    this.addMenuItem(key, new CheckMenuItem(label, initValue));
  }
}
