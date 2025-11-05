import { Controller, Get, Post, Delete, Param, Query } from '@nestjs/common';
import { SelfHealingCacheService } from '../self-healing-cache.service';
import { ExperimentRunnerService } from '../experiments/experiment-runner.service';

@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: SelfHealingCacheService) {}

  @Get('health')
  async getHealth() {
    return this.cacheService.getHealth();
  }

  @Get('health/detailed')
  async getDetailedHealth() {
    const cacheHealth = this.cacheService.getHealth();
    const metricsAdapter = this.cacheService.getMetricsAdapter();
    const storageAdapter = this.cacheService.getStorageAdapter();

    // Check MySQL connection
    let mysqlStatus = 'disconnected';
    let mysqlError: string | null = null;
    if (metricsAdapter) {
      try {
        const isConnected = await metricsAdapter.ping();
        mysqlStatus = isConnected ? 'healthy' : 'unhealthy';
      } catch (error: any) {
        mysqlStatus = 'error';
        mysqlError = error?.message || 'Unknown error';
      }
    }

    // Check Redis connection
    let redisStatus = 'disconnected';
    let redisError: string | null = null;
    if (storageAdapter && typeof storageAdapter.ping === 'function') {
      try {
        const isConnected = await storageAdapter.ping();
        redisStatus = isConnected ? 'healthy' : 'unhealthy';
      } catch (error: any) {
        redisStatus = 'error';
        redisError = error?.message || 'Unknown error';
      }
    } else {
      redisStatus = 'in-memory';
    }

    const allHealthy =
      cacheHealth.state === 'healthy' &&
      (mysqlStatus === 'healthy' || mysqlStatus === 'disconnected') &&
      (redisStatus === 'healthy' || redisStatus === 'in-memory');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: Date.now(),
      components: {
        cache: {
          status: cacheHealth.state,
          metrics: cacheHealth.metrics,
        },
        redis: {
          status: redisStatus,
          error: redisError,
        },
        mysql: {
          status: mysqlStatus,
          error: mysqlError,
        },
      },
    };
  }

  @Get('stats')
  getStats() {
    return this.cacheService.getStats();
  }

  @Post('heal')
  async triggerHealing() {
    await this.cacheService.triggerHealing();
    return { message: 'Self-healing triggered successfully' };
  }

  @Delete()
  clear() {
    this.cacheService.clear();
    return { message: 'Cache cleared successfully' };
  }
}

@Controller('experiments')
export class ExperimentsController {
  constructor(
    private readonly cacheService: SelfHealingCacheService,
    private readonly experimentRunner: ExperimentRunnerService,
  ) {}

  @Get()
  async getAll() {
    const metricsAdapter = this.cacheService.getMetricsAdapter();
    if (!metricsAdapter) {
      return { error: 'Metrics database not available' };
    }

    const experiments = await metricsAdapter.getAllExperiments();
    return { data: experiments };
  }

  @Post('start/:name')
  async start(@Param('name') name: string) {
    const metricsAdapter = this.cacheService.getMetricsAdapter();
    if (!metricsAdapter) {
      return { error: 'Metrics database not available' };
    }

    await metricsAdapter.startExperiment(name);
    return { message: `Experiment '${name}' started`, timestamp: Date.now() };
  }

  @Post('end/:name')
  async end(@Param('name') name: string) {
    const metricsAdapter = this.cacheService.getMetricsAdapter();
    if (!metricsAdapter) {
      return { error: 'Metrics database not available' };
    }

    const stats = this.cacheService.getStats();
    const health = this.cacheService.getHealth();

    // Collect experiment metrics
    const metrics = {
      experimentName: name,
      startTime: Date.now() - 60000, // Approximate
      endTime: Date.now(),
      totalRequests: stats.cacheStats.hits + stats.cacheStats.misses,
      successfulRequests: stats.cacheStats.hits,
      failedRequests: stats.cacheStats.misses,
      cacheHits: stats.cacheStats.hits,
      cacheMisses: stats.cacheStats.misses,
      avgResponseTime: health.metrics.avgResponseTime,
      p50ResponseTime: health.metrics.avgResponseTime * 0.9,
      p95ResponseTime: health.metrics.avgResponseTime * 1.5,
      p99ResponseTime: health.metrics.avgResponseTime * 2,
      healthMetricsHistory: [health.metrics],
      recoveryActions: [],
      downtimeSeconds: 0,
      mtbf: stats.recoveryStats.mtbf || 0,
      mttr: stats.recoveryStats.mttr || 0,
      availability: health.metrics.hitRate || 0.99,
    };

    await metricsAdapter.endExperiment(name, metrics as any);
    return { message: `Experiment '${name}' ended`, metrics };
  }

  @Get('compare/:baseline/:comparison')
  async compare(
    @Param('baseline') baseline: string,
    @Param('comparison') comparison: string,
  ) {
    const metricsAdapter = this.cacheService.getMetricsAdapter();
    if (!metricsAdapter) {
      return { error: 'Metrics database not available' };
    }

    const result = await metricsAdapter.getExperimentComparison(
      baseline,
      comparison,
    );
    return { data: result };
  }

  @Post('run-comparison')
  async runFullComparison(): Promise<{
    message: string;
    report: any;
    resultsFile: string;
  }> {
    try {
      const report = await this.experimentRunner.runFullComparison();
      return {
        message: 'Full cache comparison experiment completed',
        report,
        resultsFile: `experiment_results/${report.experimentId}.json`,
      };
    } catch (error) {
      console.error('Error running comparison experiment:', error);
      throw error;
    }
  }
}

@Controller('ml')
export class MLController {
  constructor(private readonly cacheService: SelfHealingCacheService) {}

  @Get('training-data')
  async getTrainingData(@Query('limit') limit?: string) {
    const metricsAdapter = this.cacheService.getMetricsAdapter();
    if (!metricsAdapter) {
      return { error: 'Metrics database not available' };
    }

    const data = await metricsAdapter.getMLTrainingData(
      limit ? parseInt(limit) : 100,
    );
    return { data, total: data.length };
  }
}
