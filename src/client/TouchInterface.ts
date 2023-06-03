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

  room: Colyseus.Room;

  constructor() {
    this.joystickUP = false;
    this.joystickRight = false;
    this.joystickLeft = false;
    this.joystickDown = false;
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
    joystickR.on("move", this.movementJoyMoveHandler.bind(this));
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
   * Sends the movement signals to the server
   *
   * @param evt Event data
   * @param data Joystick parameters
   */
  movementJoyMoveHandler(
    evt: nipplejs.EventData,
    data: nipplejs.JoystickOutputData
  ): void {
    const angle = data.angle.degree;
    const force = data.force;

    if (this.room !== undefined) {
      // Determine player direction based on joystick angle
      if (angle >= 20 && angle < 160 && force > 0.2) {
        if (!this.joystickUP) {
          this.room.send("input", "w-down");
          this.joystickUP = true;
        }
      } else if (this.joystickUP) {
        this.room.send("input", "w-up");
        this.joystickUP = false;
      }

      if (angle >= 135 && angle < 225 && force > 0.2) {
        if (!this.joystickLeft) {
          this.room.send("input", "a-down");
          this.joystickLeft = true;
        }
      } else if (this.joystickLeft) {
        this.room.send("input", "a-up");
        this.joystickLeft = false;
      }

      if (angle >= 225 && angle < 315 && force > 0.2) {
        if (!this.joystickDown) {
          this.room.send("input", "s-down");
          this.joystickDown = true;
        }
      } else if (this.joystickDown) {
        this.room.send("input", "s-up");
        this.joystickDown = false;
      }

      if (angle >= 315 || (angle < 45 && force > 0.2)) {
        if (!this.joystickRight) {
          this.room.send("input", "d-down");
          this.joystickRight = true;
        }
      } else if (this.joystickRight) {
        this.room.send("input", "d-up");
        this.joystickRight = false;
      }
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
      // Send an 'up' command for every direction to stop moving/fire when joystick is released
      this.room.send("input", "w-up");
      this.room.send("input", "s-up");
      this.room.send("input", "a-up");
      this.room.send("input", "d-up");
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
