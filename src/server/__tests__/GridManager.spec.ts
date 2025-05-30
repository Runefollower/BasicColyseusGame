import { GridManager } from '../GridManager';
import { GameGridGenerator } from '../GameGridGenerator';
import { GameConfig, GAME_CONFIG } from '../config';

describe('GridManager', () => {
  let gridGen: GameGridGenerator;
  let config: GameConfig;
  let callback: jest.Mock;
  let manager: GridManager;

  beforeEach(() => {
    config = { ...GAME_CONFIG, gridSize: 1, visibilityDiagonalLimit: 0 };
    gridGen = new GameGridGenerator(config.gridSize);
    jest.spyOn(gridGen, 'generateGrid').mockReturnValue([[0]]);
    jest
      .spyOn(gridGen, 'generateVisibilityMatrixDiagonalLimited')
      .mockReturnValue([[[]]]);
    jest
      .spyOn(
        gridGen,
        'generateVisibilityMatrixDiagonalLimitedPoint'
      )
      .mockReturnValue(['vis']);
    callback = jest.fn();
    manager = new GridManager(gridGen, config, callback);
  });

  it('initializes grid, gridDamage, and visibilityMatrix', () => {
    expect(manager.grid).toEqual([[0]]);
    expect(manager.gridDamage).toEqual([[0]]);
    expect(manager.visibilityMatrix).toEqual([[[]]]);
  });

  it('recalculateVisibility calls onGridRefresh for each cell in radius', () => {
    manager.recalculateVisibility(0, 0);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(0, 0, 0, ['vis']);
    expect(manager.visibilityMatrix[0][0]).toEqual(['vis']);
  });

  it('recalculateVisibility does nothing when out of bounds', () => {
    manager.recalculateVisibility(-1, 0);
    manager.recalculateVisibility(0, -1);
    manager.recalculateVisibility(1, 0);
    manager.recalculateVisibility(0, 1);
    expect(callback).not.toHaveBeenCalled();
  });
});