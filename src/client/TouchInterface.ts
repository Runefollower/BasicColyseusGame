import * as nipplejs from "nipplejs";
import type { JoystickManagerOptions } from "nipplejs";

import type * as Colyseus from "colyseus.js";

/**
 * Sets up the touch interface for the game
 */
export class TouchInterface {
  // record last directional signals
  joystickUP: boolean;
  joystickRight: boolean;
  joystickLeft: boolean;
  joystickDown: boolean;

  maxDistance: number;
  deadZone: number;

  room: Colyseus.Room;

  constructor() {
    this.joystickUP = false;
    this.joystickRight = false;
    this.joystickLeft = false;
    this.joystickDown = false;

    this.maxDistance = 50;
    this.deadZone = 0.1 * this.maxDistance;
  }

  /**
   * Assign the handle to the room when connected
   *
   * @param room The game room
   */
  assignRoom(room: Colyseus.Room): void {
    this.room = room;
  }

  /**
   * Set up the touch interface UI elements
   *
   * @param movementZone The div element where the movement joystick is placed
   * @param fireZone The div element where the fire joystick will be placed
   */
  initMobileUI(movementZone: HTMLDivElement, fireZone: HTMLDivElement): void {
    this.initJoysticks(movementZone, fireZone);
  }

  /**
   * Initialize the joysticks
   *
   * @param movementZone The div element where the movement joystick is placed
   * @param fireZone The div element where the fire joystick will be placed
   */
  initJoysticks(movementZone: HTMLDivElement, fireZone: HTMLDivElement): void {
    // Ensure the joysticks are at the top
    movementZone.style.zIndex = "2";
    fireZone.style.zIndex = "2";

    // Create the movement joystick
    const optionsR: JoystickManagerOptions = {
      zone: movementZone,
      mode: "static",
      position: { right: "50%", bottom: "50%" },
      size: 100,
      color: "blue",
    };

    const joystickR = nipplejs.create(optionsR);

    // Event handlers for movement joystick
    joystickR.on("move", this.movementJoyProportionalMoveHandler.bind(this));
    joystickR.on("end", this.movementJoyEndHandler.bind(this));

    // Create the fire joystick, this will aim in Tank mode
    // and turn on wepon fire
    const optionsL: JoystickManagerOptions = {
      zone: fireZone,
      mode: "static",
      position: { left: "50%", bottom: "50%" },
      size: 100,
      color: "blue",
    };

    const joystickL = nipplejs.create(optionsL);

    // Event handlers for fire joystick
    joystickL.on("move", this.fireJoyMoveHandler.bind(this));
    joystickL.on("end", this.fireJoyEndHandler.bind(this));
  }

  /**
   * Sends the movement signals to the server based on proportional movement
   *
   * @param evt Event data
   * @param data Joystick parameters
   */
  movementJoyProportionalMoveHandler(
    evt: nipplejs.EventData,
    data: nipplejs.JoystickOutputData
  ): void {
    const dx = data.distance * Math.cos(data.angle.radian);
    const dy = data.distance * Math.sin(data.angle.radian);

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    const normalizedDx =
      absDx > this.deadZone
        ? (dx - Math.sign(dx) * this.deadZone) /
          (this.maxDistance - this.deadZone)
        : 0;
    const normalizedDy =
      absDy > this.deadZone
        ? (dy - Math.sign(dy) * this.deadZone) /
          (this.maxDistance - this.deadZone)
        : 0;

    if (this.room !== undefined) {
      this.room.send("turn", normalizedDx);
      this.room.send("accel", normalizedDy);
    }
  }

  /**
   * Clears any movement signals sent to the server
   *
   * @param evt Event data
   * @param data Joystick parmeters
   */
  movementJoyEndHandler(
    evt: nipplejs.EventData,
    data: nipplejs.JoystickOutputData
  ): void {
    if (this.room !== undefined) {
      this.room.send("turn", 0);
      this.room.send("accel", 0);
    }
  }

  /**
   * Sends server signals for fire events
   *
   * @param evt Event data
   * @param data Joystick parmeters
   */
  fireJoyMoveHandler(
    evt: nipplejs.EventData,
    data: nipplejs.JoystickOutputData
  ): void {
    if (this.room !== undefined) {
      this.room.send("input", "fire-down");
      this.room.send("mouseDirection", -data.angle.radian);
    }
  }

  /**
   * Clear the fire events from server
   *
   * @param evt Event data
   * @param data Joystick parameters
   */
  fireJoyEndHandler(
    evt: nipplejs.EventData,
    data: nipplejs.JoystickOutputData
  ): void {
    if (this.room !== undefined) {
      this.room.send("input", "fire-up");
    }
  }
}
