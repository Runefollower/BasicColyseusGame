/**
 * This will define a class for a computer player
 */

import type { Player } from "./GameState";
import type { SimpleGameLogic } from "./SimpleGameLogic";

const DIRECTION = {
  RIGHT: 0,
  LEFT: 1,
  FORWARD: 2,
};

export class ComputerPlayer {
  gameLogic: SimpleGameLogic = null;
  thisPlayer: Player = null;
  sessionID: string = "";

  turningRight: boolean = false;
  turningLeft: boolean = false;
  accelerating: boolean = false;
  firing: boolean = false;

  constructor(
    gameLogic: SimpleGameLogic,
    thisPlayer: Player,
    sessionID: string
  ) {
    this.gameLogic = gameLogic;
    this.thisPlayer = thisPlayer;
    this.sessionID = sessionID;
  }

  lastChange = 0;
  /**
   * Calculate what moves to take this turn and send commands
   * to the game engine
   *
   * @param deltaTime Time since last update
   * @param elapsedTime Time since start
   */
  oldupdate(deltaTime: number, elapsedTime: number): void {
    if (elapsedTime > this.lastChange + 1000) {
      if (this.turningLeft) {
        this.turn(DIRECTION.RIGHT);
      } else {
        this.turn(DIRECTION.LEFT);
      }

      if (this.firing) {
        this.setFire(false);
      } else {
        this.setFire(true);
      }
      this.lastChange = elapsedTime;
    }
  }

  update(deltaTime: number, elapsedTime: number): void {
    // Find the closest player
    let closestPlayer = null;
    let minDistance = Number.MAX_SAFE_INTEGER;

    for (const [sessionID, player] of this.gameLogic.state.players.entries()) {
      if (sessionID === this.sessionID) continue; // Skip self

      const dx = player.x - this.thisPlayer.x;
      const dy = player.y - this.thisPlayer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        closestPlayer = player;
      }
    }

    if (closestPlayer) {
      // Calculate the direction to the closest player
      const dx = closestPlayer.x - this.thisPlayer.x;
      const dy = closestPlayer.y - this.thisPlayer.y;
      const angleToPlayer = Math.atan2(dy, dx);

      let difference = this.thisPlayer.direction - angleToPlayer;

      while (difference < -1 * Math.PI) difference += 2 * Math.PI;
      while (difference > Math.PI) difference -= 2 * Math.PI;

      // Check if we need to turn
      if (Math.abs(difference) > Math.PI / 30) {
        // Change this value to adjust the sensitivity
        if (difference > 0) {
          this.turn(DIRECTION.LEFT);
        } else {
          this.turn(DIRECTION.RIGHT);
        }
      } else {
        this.turn(DIRECTION.FORWARD);
      }

      // Check if we need to accelerate
      if (Math.abs(difference) < Math.PI / 15) {
        // Change this value to adjust the sensitivity
        this.accelerate(true);
      } else {
        this.accelerate(false);
      }

      // Always firing
      this.setFire(true);
    }
  }

  /**
   * Internal function to set to turning or straight
   */
  turn(direction: number): void {
    // Send key up commands first, then key down

    // if we were turning left but not any more, stop
    if (this.turningLeft && direction !== DIRECTION.LEFT) {
      this.gameLogic.handleInput(this.sessionID, "a-up");
      this.turningLeft = false;
    }

    // if we were turning right but not any more, stop
    if (this.turningRight && direction !== DIRECTION.RIGHT) {
      this.gameLogic.handleInput(this.sessionID, "d-up");
      this.turningRight = false;
    }

    // if we were not turning left but now we are, start
    if (!this.turningLeft && direction === DIRECTION.LEFT) {
      this.gameLogic.handleInput(this.sessionID, "a-down");
      this.turningLeft = true;
    }

    // if we were not turning left but now we are, start
    if (!this.turningRight && direction === DIRECTION.RIGHT) {
      this.gameLogic.handleInput(this.sessionID, "d-down");
      this.turningRight = true;
    }
  }

  /**
   * Internal function to set acceleration
   *
   * @param accel True if we are now accelerating
   */
  accelerate(accel: boolean): void {
    // if we were turning right but not any more, stop
    if (this.accelerating && !accel) {
      this.gameLogic.handleInput(this.sessionID, "w-up");
      this.accelerating = false;
    }

    // if we were not turning left but now we are, start
    if (!this.accelerating && accel) {
      this.gameLogic.handleInput(this.sessionID, "w-down");
      this.accelerating = true;
    }
  }

  /**
   * Internal function to set acceleration
   *
   * @param fire True if we are now firing
   */
  setFire(fire: boolean): void {
    // if we were turning right but not any more, stop
    if (this.firing && !fire) {
      this.gameLogic.handleInput(this.sessionID, "fire-up");
      this.firing = false;
    }

    // if we were not turning left but now we are, start
    if (!this.firing && fire) {
      this.gameLogic.handleInput(this.sessionID, "fire-down");
      this.firing = true;
    }
  }
}
