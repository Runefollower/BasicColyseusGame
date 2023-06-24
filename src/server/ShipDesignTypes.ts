/*
 * Defines the structures used to describe the ships
 */

interface Point {
  x: number;
  y: number;
}

interface PolygonShape {
  type: "polygon";
  points: Point[];
  fillColor: string;
  strokeColor: string;
  lineWidth: number;
}

interface CircleShape {
  type: "circle";
  center: Point;
  radius: number;
  fillColor: string;
  strokeColor: string;
  lineWidth: number;
}

type Shape = PolygonShape | CircleShape;

export interface ShipType {
  id: string; // An identifier for the ship type, e.g., "SpaceShip"
  shapes: Shape[]; // Geometric shapes for the ship's body
  flames: Shape[]; // Geometric shapes for the flames
  firesLasers: boolean; // Does the ship fire lasers?
  firesCannonballs: boolean; // Does the ship fire cannonballs?
  controlType: string; // The control mechanism for the ship, e.g., "TurnAndAccelerate"
  hasFlame: boolean; // Does this ship render a flame
  collisionRadius: number; // Size of this ship for collision detection
  fireDelayInterval: number; // Fire interval
}

export const projectileTypes = {
  Laser: 1,
  Cannonball: 2,
};
