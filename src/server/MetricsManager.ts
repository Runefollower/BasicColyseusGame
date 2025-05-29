import { GameState } from "./GameState";
import { generateLogWithTimestamp } from "./ServerTools";
import { GameConfig } from "./config";

/**
 * Manages server-side metrics: UPS, client counts, high score and periodic logging.
 */
export class MetricsManager {
  private cycleTimestamps: number[] = [];
  private nextClientReset: number;
  private nextLogTime: number;

  constructor(private state: GameState, private config: GameConfig) {
    this.nextClientReset = config.metricsIntervalMs;
    this.nextLogTime = config.metricsIntervalMs;
  }

  /**
   * Update metrics based on elapsed time, adjust state and optionally log.
   */
  update(elapsedTime: number): void {
    // Update current client count and max per interval
    this.state.currentClientsCount = this.state.players.size;
    this.state.maxClientsCountLastMinute = Math.max(
      this.state.currentClientsCount,
      this.state.maxClientsCountLastMinute
    );

    // Track timestamps for UPS calculation
    this.cycleTimestamps.push(elapsedTime);
    if (this.cycleTimestamps.length > this.config.metricsWindowSize) {
      const first = this.cycleTimestamps.shift()!;
      const seconds = (elapsedTime - first) / 1000;
      this.state.gameUpdateCyclesPerSecond = this.config.metricsWindowSize / seconds;
    }

    // Determine highest score and player
    this.state.highestScore = 0;
    this.state.highestScorePlayer = "";
    for (const player of this.state.players.values()) {
      if (player.score > this.state.highestScore) {
        this.state.highestScore = player.score;
        this.state.highestScorePlayer = player.username;
      }
    }

    // Reset max clients per interval
    if (elapsedTime >= this.nextClientReset) {
      this.state.maxClientsCountLastMinute = this.state.currentClientsCount;
      this.nextClientReset = elapsedTime + this.config.metricsIntervalMs;
    }

    // Periodic metrics logging
    if (elapsedTime >= this.nextLogTime && this.state.players.size > 0) {
      this.nextLogTime = elapsedTime + this.config.metricsIntervalMs;
      console.log(
        generateLogWithTimestamp(
          `Clients: ${this.state.currentClientsCount}, Max: ${this.state.maxClientsCountLastMinute}, UPS: ${this.state.gameUpdateCyclesPerSecond.toFixed(2)}, HighScore: ${this.state.highestScorePlayer} ${this.state.highestScore}`
        )
      );
    }
  }
}