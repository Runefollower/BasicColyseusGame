import type { ShipType } from "./ShipDesignTypes";

// Instantiate the SpaceShip design
const SpaceShip: ShipType = {
  id: "SpaceShip",
  shapes: [
    {
      type: "polygon",
      points: [
        { x: 10, y: 0 }, // Forward point of the triangle
        { x: -6, y: 7 }, // Bottom right point of the triangle
        { x: -3, y: 0 }, // Center of engine
        { x: -6, y: -7 }, // Bottom left point of the triangle
      ],
      fillColor: "#FF0000", // Set to the color of the spaceship
    },
  ],
  flames: [
    {
      type: "polygon",
      points: [
        { x: -4, y: 0 },
        { x: -8, y: 5 },
        { x: -17, y: 0 },
        { x: -8, y: -5 },
      ],
      fillColor: "red",
    },
  ],
  firesLasers: true,
  controlType: "TurnAndAccelerate",
};

// Export the ship designs
export const ShipDesigns = [SpaceShip];
