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

  // Position of the menu relative to top left corner
  xMenuOffset = 10;
  yMenuOffset = 10;

  // Size of pulldown box
  pulldownBoxSize = 20;

  // Size of full menu frame
  fullMenuWidth = 150;
  fullMenuHeight = 150;

  // Menu items offset from the left of the menu
  xMenuItemOffset = 5;
  yMenuItemOffset = 40;

  // Y spacing for each menu item
  yMenuItemSpacing = 20;

  // Dimensions of a menu item
  menuItemHeight = 20;
  menuItemWidth = 100;

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
      ctx.fillRect(
        this.xMenuOffset,
        this.yMenuOffset,
        this.fullMenuWidth,
        this.fullMenuHeight
      );
      ctx.strokeStyle = "rgb(10,10,10)";
      ctx.strokeRect(
        this.xMenuOffset,
        this.yMenuOffset,
        this.fullMenuWidth,
        this.fullMenuHeight
      );
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
    ctx.fillRect(
      this.xMenuOffset,
      this.yMenuOffset,
      this.pulldownBoxSize,
      this.pulldownBoxSize
    );
    ctx.strokeStyle = "rgb(10,10,10)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      this.xMenuOffset,
      this.yMenuOffset,
      this.pulldownBoxSize,
      this.pulldownBoxSize
    );

    ctx.beginPath();
    const lX = this.xMenuOffset + this.pulldownBoxSize * 0.2;
    const mX = this.xMenuOffset + this.pulldownBoxSize * 0.5;
    const rX = this.xMenuOffset + this.pulldownBoxSize * 0.8;
    const tY = this.yMenuOffset + this.pulldownBoxSize * 0.2;
    const bY = this.yMenuOffset + this.pulldownBoxSize * 0.8;
    if (this.showCollapsed) {
      ctx.moveTo(lX, tY);
      ctx.lineTo(mX, bY);
      ctx.lineTo(rX, tY);
    } else {
      ctx.moveTo(lX, bY);
      ctx.lineTo(mX, tY);
      ctx.lineTo(rX, bY);
    }
    ctx.stroke();
  }

  clickEvent(x: number, y: number): void {
    if (!this.showCollapsed) {
      for (const item of this.menuItems.values()) {
        item.clickEvent(x, y);
      }
    }
    if (
      x > this.xMenuOffset &&
      x < this.xMenuOffset + this.pulldownBoxSize &&
      y > this.yMenuOffset &&
      y < this.yMenuOffset + this.pulldownBoxSize
    ) {
      this.showCollapsed = !this.showCollapsed;
    }
  }

  addMenuItem(key: string, menuItem: MenuItem): void {
    const x = this.xMenuOffset + this.xMenuItemOffset;
    const y =
      this.yMenuItemOffset + this.menuItems.size * this.yMenuItemSpacing; // calculate y based on the number of existing items
    menuItem.setPosition(x, y, this.menuItemHeight, this.menuItemWidth);
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
