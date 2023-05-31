import type { ShipType } from "./ShipDesignTypes";

export const controlTypes = {
  rocketShip: "RocketShip",
  tank: "Tank",
};

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
      fillColor: "playerColor", // Set to the color of the spaceship
      strokeColor: "playerColor",
      lineWidth: 1,
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
      strokeColor: "red",
      lineWidth: 1,
    },
  ],
  firesLasers: true,
  controlType: controlTypes.rocketShip,
  hasFlame: true,
  collisionRadius: 10,
};

// Instantiate the SpaceShip design
const Tank: ShipType = {
  id: "Tank",
  shapes: [
    {
      type: "polygon",
      points: [
        { x: 0, y: 7 },
        { x: 33, y: 7 },
        { x: 33, y: -7 },
        { x: 0, y: -7 },
      ],
      fillColor: "rgb(183, 183, 183)",
      strokeColor: "rgb(114, 114, 114)",
      lineWidth: 4,
    },
    {
      type: "circle",
      center: { x: 0, y: 0 },
      radius: 20,
      fillColor: "playerColor",
      strokeColor: "playerColor",
      lineWidth: 4,
    },
  ],
  flames: [],
  firesLasers: true,
  controlType: controlTypes.tank,
  hasFlame: false,
  collisionRadius: 20,
};

// Export the ship designs for serialization to client
export const ShipDesigns = [SpaceShip, Tank];

// Map for lookup of designs
export const ShipDesignsMap = ShipDesigns.reduce(
  (map, shipType) => map.set(shipType.id, shipType),
  new Map<string, ShipType>()
);
