import type { SimpleGameLogic } from "./SimpleGameLogic";
import { Player, GameState } from "./GameState";
import { ComputerPlayer } from "./ComputerPlayer";
import { GameConfig } from "./config";

/**
 * Orchestrates computer-controlled (AI) players: spawning and updates.
 */
export class ComputerPlayerManager {
  private computerPlayers: ComputerPlayer[] = [];

  constructor(
    private logic: SimpleGameLogic,
    private state: GameState,
    private config: GameConfig
  ) {
    for (let i = 0; i < this.config.computerPlayerCount; i++) {
      this.addComputerPlayer();
    }
  }

  /**
   * Spawn and register a new computer player
   */
  private addComputerPlayer(): void {
    const pos = this.logic.generateSpawnPosition();
    const id = this.computerPlayers.length;
    const sessionId = `PC ${id}`;
    const player = new Player(`Computer ${id}`, pos.x, pos.y);
    this.computerPlayers.push(new ComputerPlayer(this.logic, player, sessionId));
    this.state.players.set(sessionId, player);
  }

  /**
   * Update all computer players for this game cycle
   */
  updateAll(deltaTime: number, elapsedTime: number): void {
    this.computerPlayers.forEach((cp) => cp.update(deltaTime, elapsedTime));
  }
}