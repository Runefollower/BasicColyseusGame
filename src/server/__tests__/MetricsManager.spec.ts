import { MetricsManager } from '../MetricsManager';
import { GameState, Player } from '../GameState';
import { GameConfig, GAME_CONFIG } from '../config';

describe('MetricsManager', () => {
  let state: GameState;
  let config: GameConfig;
  let manager: MetricsManager;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  beforeEach(() => {
    state = new GameState();
    const p1 = new Player('p1', 0, 0);
    p1.score = 2;
    const p2 = new Player('p2', 0, 0);
    p2.score = 5;
    state.players.set('s1', p1);
    state.players.set('s2', p2);
    config = { ...GAME_CONFIG, metricsWindowSize: 2, metricsIntervalMs: 50 };
    manager = new MetricsManager(state, config);
  });

  it('updates currentClientsCount and highest score fields', () => {
    manager.update(10);
    expect(state.currentClientsCount).toBe(2);
    expect(state.highestScore).toBe(5);
    expect(state.highestScorePlayer).toBe('p2');
  });

  it('calculates gameUpdateCyclesPerSecond after enough cycles', () => {
    manager.update(0);
    expect(state.gameUpdateCyclesPerSecond).toBe(0);
    manager.update(30);
    expect(state.gameUpdateCyclesPerSecond).toBe(0);
    manager.update(60);
    expect(state.gameUpdateCyclesPerSecond).toBeGreaterThan(0);
  });

  it('resets maxClientsCountLastMinute after interval elapses', () => {
    manager.update(10);
    expect(state.maxClientsCountLastMinute).toBe(2);
    state.players.delete('s2');
    manager.update(60);
    expect(state.maxClientsCountLastMinute).toBe(1);
  });
});