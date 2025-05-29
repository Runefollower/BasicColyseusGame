import { ComputerPlayerManager } from '../ComputerPlayerManager';
import { GameState } from '../GameState';
import { GameConfig, GAME_CONFIG } from '../config';
import { ComputerPlayer } from '../ComputerPlayer';

describe('ComputerPlayerManager', () => {
  it('spawns the configured number of computer players', () => {
    const stubLogic = { generateSpawnPosition: jest.fn().mockReturnValue({ x: 10, y: 20 }) } as any;
    const state = new GameState();
    const config: GameConfig = { ...GAME_CONFIG, computerPlayerCount: 3 };
    new ComputerPlayerManager(stubLogic, state, config);
    expect(state.players.size).toBe(3);
    const sessionIds = Array.from(state.players.keys());
    expect(sessionIds).toEqual(['PC 0', 'PC 1', 'PC 2']);
    expect(stubLogic.generateSpawnPosition).toHaveBeenCalledTimes(3);
  });

  it('calls update on each computer player during updateAll', () => {
    const stubLogic = { generateSpawnPosition: () => ({ x: 0, y: 0 }) } as any;
    const state = new GameState();
    const config: GameConfig = { ...GAME_CONFIG, computerPlayerCount: 2 };
    const spy = jest.spyOn(ComputerPlayer.prototype, 'update').mockImplementation(() => {});
    const manager = new ComputerPlayerManager(stubLogic, state, config);
    manager.updateAll(0.1, 42);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});