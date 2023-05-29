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
}

interface CircleShape {
  type: "circle";
  center: Point;
  radius: number;
  fillColor: string;
}

type Shape = PolygonShape | CircleShape;

export interface ShipType {
  id: string; // An identifier for the ship type, e.g., "SpaceShip"
  shapes: Shape[]; // Geometric shapes for the ship's body
  flames: Shape[]; // Geometric shapes for the flames
  firesLasers: boolean; // Does the ship fire lasers?
  controlType: string; // The control mechanism for the ship, e.g., "TurnAndAccelerate"
}
