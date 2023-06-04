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

  joystickPositionInverted: boolean;

  maxDistance: number;
  deadZone: number;

  room: Colyseus.Room;

  joystickR: nipplejs.JoystickManager;
  joystickL: nipplejs.JoystickManager;

  constructor() {
    this.joystickUP = false;
    this.joystickRight = false;
    this.joystickLeft = false;
    this.joystickDown = false;

    this.maxDistance = 50;
    this.deadZone = 0.1 * this.maxDistance;

    this.joystickPositionInverted = false;
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

    this.joystickR = nipplejs.create(optionsR);

    // Create the fire joystick, this will aim in Tank mode
    // and turn on wepon fire
    const optionsL: JoystickManagerOptions = {
      zone: fireZone,
      mode: "static",
      position: { left: "50%", bottom: "50%" },
      size: 100,
      color: "blue",
    };

    this.joystickL = nipplejs.create(optionsL);

    this.bindJoystickEventHandlers();
  }

  /**
   * Bind the event listeners to the right joysticks
   */
  bindJoystickEventHandlers(): void {
    // Event handlers for movement joystick
    this.joystickR.on("move", (evt, data) => {
      this.rlJoyMoveHandler(true, evt, data);
    });
    this.joystickR.on("end", (evt, data) => {
      this.rlJoyEndHandler(true, evt, data);
    });

    // Event handlers for fire joystick
    this.joystickL.on("move", (evt, data) => {
      this.rlJoyMoveHandler(false, evt, data);
    });
    this.joystickL.on("end", (evt, data) => {
      this.rlJoyEndHandler(false, evt, data);
    });
  }

  rlJoyMoveHandler(
    isRight: boolean,
    evt: nipplejs.EventData,
    data: nipplejs.JoystickOutputData
  ): void {
    if (
      (isRight && this.joystickPositionInverted) ||
      (!isRight && !this.joystickPositionInverted)
    ) {
      this.fireJoyMoveHandler(evt, data);
    } else {
      this.movementJoyPropMoveHandler(evt, data);
    }
  }

  rlJoyEndHandler(
    isRight: boolean,
    evt: nipplejs.EventData,
    data: nipplejs.JoystickOutputData
  ): void {
    if (
      (isRight && this.joystickPositionInverted) ||
      (!isRight && !this.joystickPositionInverted)
    ) {
      this.fireJoyEndHandler(evt, data);
    } else {
      this.movementJoyEndHandler(evt, data);
    }
  }

  /**
   * Sends the movement signals to the server based on proportional movement
   *
   * @param evt Event data
   * @param data Joystick parameters
   */
  movementJoyPropMoveHandler(
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
