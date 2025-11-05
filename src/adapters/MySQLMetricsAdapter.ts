import mysql from 'mysql2/promise';
import { HealthMetrics, RecoveryAction, CacheState } from '../types';
import { ExperimentMetrics } from '../metrics/MetricsCollector';

export class MySQLMetricsAdapter {
  private pool: mysql.Pool;
  private connected = false;

  constructor(config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log(`MySQL pool created for ${config.host}:${config.port}`);
  }

  async connect(): Promise<void> {
    try {
      const connection = await this.pool.getConnection();
      connection.release();
      this.connected = true;
      console.log('MySQL connected successfully');
    } catch (error) {
      console.error('Failed to connect to MySQL:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    this.connected = false;
  }

  async ping(): Promise<boolean> {
    try {
      const [rows] = await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Health Metrics
  async saveHealthMetrics(metrics: HealthMetrics, state: CacheState): Promise<void> {
    const query = `
      INSERT INTO health_metrics (
        timestamp, hit_rate, miss_rate, error_rate,
        avg_response_time, memory_usage, failure_count, cache_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.pool.execute(query, [
      metrics.timestamp,
      metrics.hitRate,
      metrics.missRate,
      metrics.errorRate,
      metrics.avgResponseTime,
      metrics.memoryUsage,
      metrics.failureCount,
      state
    ]);
  }

  async getHealthMetricsHistory(limit: number = 1000): Promise<HealthMetrics[]> {
    const query = `
      SELECT timestamp, hit_rate as hitRate, miss_rate as missRate,
             error_rate as errorRate, avg_response_time as avgResponseTime,
             memory_usage as memoryUsage, failure_count as failureCount
      FROM health_metrics
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const [rows] = await this.pool.query(query, [limit]);
    return rows as HealthMetrics[];
  }

  // Recovery Actions
  async saveRecoveryAction(action: RecoveryAction, keysAffected: number): Promise<void> {
    const query = `
      INSERT INTO recovery_actions (
        strategy, timestamp, success, duration, keys_affected,
        error_rate_before, error_rate_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.pool.execute(query, [
      action.strategy,
      action.timestamp,
      action.success,
      action.duration,
      keysAffected,
      action.metricsBeforeRecovery.errorRate,
      action.metricsAfterRecovery.errorRate
    ]);
  }

  async getRecoveryActionsHistory(limit: number = 100): Promise<any[]> {
    const query = `
      SELECT * FROM recovery_actions
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const [rows] = await this.pool.query(query, [limit]);
    return rows as any[];
  }

  // Experiments
  async startExperiment(name: string): Promise<void> {
    const query = `
      INSERT INTO experiments (experiment_name, start_time)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE start_time = ?, end_time = NULL
    `;

    const timestamp = Date.now();
    await this.pool.execute(query, [name, timestamp, timestamp]);
  }

  async endExperiment(name: string, metrics: ExperimentMetrics): Promise<void> {
    const query = `
      UPDATE experiments
      SET end_time = ?,
          total_requests = ?,
          successful_requests = ?,
          failed_requests = ?,
          cache_hits = ?,
          cache_misses = ?,
          avg_response_time = ?,
          p50_response_time = ?,
          p95_response_time = ?,
          p99_response_time = ?,
          downtime_seconds = ?,
          mtbf = ?,
          mttr = ?,
          availability = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE experiment_name = ?
    `;

    await this.pool.execute(query, [
      metrics.endTime,
      metrics.totalRequests,
      metrics.successfulRequests,
      metrics.failedRequests,
      metrics.cacheHits,
      metrics.cacheMisses,
      metrics.avgResponseTime,
      metrics.p50ResponseTime,
      metrics.p95ResponseTime,
      metrics.p99ResponseTime,
      metrics.downtimeSeconds,
      metrics.mtbf,
      metrics.mttr,
      metrics.availability,
      name
    ]);
  }

  async getExperiment(name: string): Promise<any> {
    const query = `SELECT * FROM experiments WHERE experiment_name = ?`;
    const [rows] = await this.pool.query(query, [name]);
    const results = rows as any[];
    return results[0];
  }

  async getAllExperiments(): Promise<any[]> {
    const query = `SELECT * FROM experiments ORDER BY created_at DESC`;
    const [rows] = await this.pool.query(query);
    return rows as any[];
  }

  // ML Training Data
  async saveMLTrainingData(
    features: {
      errorRateTrend: number;
      hitRateTrend: number;
      responseTimeTrend: number;
      failureFrequency: number;
      currentErrorRate: number;
      memoryPressure: number;
    },
    actualFailure: boolean,
    predictionProbability?: number
  ): Promise<void> {
    const query = `
      INSERT INTO ml_training_data (
        error_rate_trend, hit_rate_trend, response_time_trend,
        failure_frequency, current_error_rate, memory_pressure,
        actual_failure, prediction_probability
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.pool.execute(query, [
      features.errorRateTrend,
      features.hitRateTrend,
      features.responseTimeTrend,
      features.failureFrequency,
      features.currentErrorRate,
      features.memoryPressure,
      actualFailure,
      predictionProbability || null
    ]);
  }

  async getMLTrainingData(limit: number = 1000): Promise<any[]> {
    const query = `
      SELECT * FROM ml_training_data
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const [rows] = await this.pool.query(query, [limit]);
    return rows as any[];
  }

  // Analytics
  async getExperimentComparison(baseline: string, comparison: string): Promise<any> {
    const query = `
      SELECT
        b.experiment_name as baseline_name,
        c.experiment_name as comparison_name,
        b.successful_requests / b.total_requests as baseline_success_rate,
        c.successful_requests / c.total_requests as comparison_success_rate,
        ((c.successful_requests / c.total_requests) - (b.successful_requests / b.total_requests)) /
          (b.successful_requests / b.total_requests) * 100 as success_rate_improvement,
        b.avg_response_time as baseline_avg_response,
        c.avg_response_time as comparison_avg_response,
        (b.avg_response_time - c.avg_response_time) / b.avg_response_time * 100 as response_time_improvement,
        b.availability as baseline_availability,
        c.availability as comparison_availability,
        (c.availability - b.availability) / b.availability * 100 as availability_improvement
      FROM experiments b
      CROSS JOIN experiments c
      WHERE b.experiment_name = ? AND c.experiment_name = ?
    `;

    const [rows] = await this.pool.query(query, [baseline, comparison]);
    const results = rows as any[];
    return results[0];
  }

  isConnected(): boolean {
    return this.connected;
  }
}
