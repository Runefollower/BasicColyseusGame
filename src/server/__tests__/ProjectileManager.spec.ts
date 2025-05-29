import { ProjectileManager } from '../ProjectileManager';
import { Projectile } from '../GameState';
import { GameConfig, GAME_CONFIG } from '../config';
import { CollisionManager } from '../CollisionManager';

class DummyCollisionManager implements Partial<CollisionManager> {
  checkForRockCollision = jest.fn(
    (_x, _y, newX, newY, vx, vy) => ({ newX, newY, vx, vy, hit: false })
  );
}

describe('ProjectileManager', () => {
  let config: GameConfig;
  let collisionManager: CollisionManager;
  let manager: ProjectileManager;

  beforeEach(() => {
    config = { ...GAME_CONFIG };
    collisionManager = new DummyCollisionManager() as unknown as CollisionManager;
    manager = new ProjectileManager({} as any, config, collisionManager);
  });

  it('returns empty list when there are no projectiles', () => {
    expect(manager.updateAll(1, 0, [], new Map())).toEqual([]);
  });

  it('keeps projectiles that are in bounds, unexpired, and did not hit rocks', () => {
    const proj = new Projectile(5, 5, 1, 0, 0, 'owner', 0);
    const alive = manager.updateAll(1, 0, [proj], new Map());
    expect(alive).toContain(proj);
  });

  it('removes projectiles that collide with rocks', () => {
    (collisionManager.checkForRockCollision as jest.Mock).mockImplementation(
      () => ({ newX: 0, newY: 0, vx: 0, vy: 0, hit: true })
    );
    const proj = new Projectile(5, 5, 1, 0, 0, 'owner', 0);
    const alive = manager.updateAll(1, 0, [proj], new Map());
    expect(alive).toEqual([]);
  });
});