/**
 * Configuration and magic constants for the game server.
 */
export interface GameConfig {
  /** Number of grid cells per side */
  gridSize: number;
  /** Size (in pixels) of each grid cell */
  cellSize: number;
  /** Physics parameters */
  physics: {
    acceleration: number;
    angularAcceleration: number;
    drag: number;
    tankSpeed: number;
    laserSpeed: number;
  };
  /** Projectile parameters */
  projectiles: {
    fireDelayInterval: number;
    laserDamage: number;
  };
  /** Number of computer-controlled players */
  computerPlayerCount: number;
  /** Visibility radius (Manhattan/diagonal limit) for fog-of-war */
  visibilityDiagonalLimit: number;
  /** Number of game update cycles to average over (for UPS calculation) */
  metricsWindowSize: number;
  /** Interval (ms) between metrics logs and client-count reset */
  metricsIntervalMs: number;
}

/** Default game configuration */
export const GAME_CONFIG: GameConfig = {
  gridSize: 100,
  cellSize: 100,
  physics: {
    acceleration: 0.01,
    angularAcceleration: 0.005,
    drag: -0.01,
    tankSpeed: 0.1,
    laserSpeed: 0.4,
  },
  projectiles: {
    fireDelayInterval: 200,
    laserDamage: 25,
  },
  computerPlayerCount: 1,
  visibilityDiagonalLimit: 10,
  metricsWindowSize: 50,
  metricsIntervalMs: 60000,
};