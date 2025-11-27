import { Test, TestingModule } from '@nestjs/testing';
import { CacheController, ExperimentsController } from '../nestjs-app/cache/cache.controller';
import { SelfHealingCacheService } from '../libs/self-healing-cache/self-healing-cache.service';
import { ExperimentRunnerService } from '../libs/self-healing-cache/experiments/experiment-runner.service';

describe('CacheController', () => {
  let controller: CacheController;
  let cacheService: SelfHealingCacheService;

  const mockCacheService = {
    getHealth: jest.fn(),
    getStats: jest.fn(),
    triggerHealing: jest.fn(),
    clear: jest.fn(),
    getMetricsAdapter: jest.fn(),
    getStorageAdapter: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheController],
      providers: [
        {
          provide: SelfHealingCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    controller = module.get<CacheController>(CacheController);
    cacheService = module.get<SelfHealingCacheService>(SelfHealingCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return basic health status', async () => {
      const health = {
        state: 'healthy',
        metrics: {
          hitRate: 0.85,
          errorRate: 0.05,
        },
      };
      mockCacheService.getHealth.mockReturnValue(health);

      const result = await controller.getHealth();

      expect(result).toEqual(health);
      expect(mockCacheService.getHealth).toHaveBeenCalled();
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health with all components', async () => {
      const mockHealth = { state: 'healthy', metrics: {} };
      const mockMetricsAdapter = { ping: jest.fn().mockResolvedValue(true) };
      const mockStorageAdapter = { ping: jest.fn().mockResolvedValue(true) };

      mockCacheService.getHealth.mockReturnValue(mockHealth);
      mockCacheService.getMetricsAdapter.mockReturnValue(mockMetricsAdapter);
      mockCacheService.getStorageAdapter.mockReturnValue(mockStorageAdapter);

      const result = await controller.getDetailedHealth();

      expect(result.status).toBe('healthy');
      expect(result.components).toBeDefined();
      expect(result.components.cache).toBeDefined();
      expect(result.components.redis).toBeDefined();
      expect(result.components.mysql).toBeDefined();
    });

    it('should handle missing adapters', async () => {
      const mockHealth = { state: 'healthy', metrics: {} };

      mockCacheService.getHealth.mockReturnValue(mockHealth);
      mockCacheService.getMetricsAdapter.mockReturnValue(null);
      mockCacheService.getStorageAdapter.mockReturnValue(null);

      const result = await controller.getDetailedHealth();

      expect(result.components.mysql.status).toBe('disconnected');
      expect(result.components.redis.status).toBe('in-memory');
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const stats = {
        cacheStats: { hits: 100, misses: 20, hitRate: 0.83 },
        health: { state: 'healthy' },
      };
      mockCacheService.getStats.mockReturnValue(stats);

      const result = controller.getStats();

      expect(result).toEqual(stats);
    });
  });

  describe('triggerHealing', () => {
    it('should trigger healing successfully', async () => {
      mockCacheService.triggerHealing.mockResolvedValue(undefined);

      const result = await controller.triggerHealing();

      expect(result).toEqual({ message: 'Self-healing triggered successfully' });
      expect(mockCacheService.triggerHealing).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear cache successfully', () => {
      mockCacheService.clear.mockReturnValue(undefined);

      const result = controller.clear();

      expect(result).toEqual({ message: 'Cache cleared successfully' });
      expect(mockCacheService.clear).toHaveBeenCalled();
    });
  });
});


describe('ExperimentsController', () => {
  let controller: ExperimentsController;
  let experimentRunner: ExperimentRunnerService;
  let cacheService: SelfHealingCacheService;

  const mockExperimentRunner = {
    runFullComparison: jest.fn(),
  };

  const mockCacheService = {
    getMetricsAdapter: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExperimentsController],
      providers: [
        {
          provide: ExperimentRunnerService,
          useValue: mockExperimentRunner,
        },
        {
          provide: SelfHealingCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    controller = module.get<ExperimentsController>(ExperimentsController);
    experimentRunner = module.get<ExperimentRunnerService>(ExperimentRunnerService);
    cacheService = module.get<SelfHealingCacheService>(SelfHealingCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('runFullComparison', () => {
    it('should run full comparison experiment', async () => {
      const report = {
        experimentId: 'exp-123',
        timestamp: Date.now(),
        scenarios: {},
        summary: {},
      };
      mockExperimentRunner.runFullComparison.mockResolvedValue(report);

      const response = await controller.runFullComparison();

      expect(response).toEqual({
        message: 'Full cache comparison experiment completed',
        report,
        resultsFile: `experiment_results/${report.experimentId}.json`,
      });
      expect(mockExperimentRunner.runFullComparison).toHaveBeenCalled();
    });

    it('should handle experiment errors', async () => {
      mockExperimentRunner.runFullComparison.mockRejectedValue(
        new Error('Experiment failed')
      );

      await expect(controller.runFullComparison()).rejects.toThrow('Experiment failed');
    });
  });

  describe('getAll', () => {
    it('should return error when metrics adapter not available', async () => {
      mockCacheService.getMetricsAdapter.mockReturnValue(null);

      const result = await controller.getAll();

      expect(result).toEqual({ error: 'Metrics database not available' });
    });
  });
});

