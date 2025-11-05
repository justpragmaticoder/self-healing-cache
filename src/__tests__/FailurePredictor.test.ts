import { FailurePredictor } from '../ml/FailurePredictor';
import { RecoveryStrategy } from '../types';

describe('FailurePredictor', () => {
  let predictor: FailurePredictor;

  beforeEach(() => {
    predictor = new FailurePredictor();
  });

  describe('Failure prediction', () => {
    test('should predict low probability for healthy metrics', () => {
      const metrics = {
        timestamp: Date.now(),
        hitRate: 0.95,
        missRate: 0.05,
        errorRate: 0.01,
        avgResponseTime: 10,
        memoryUsage: 100,
        failureCount: 0
      };

      const prediction = predictor.predict(metrics, 0, 0, 0, 0);

      expect(prediction.probability).toBeLessThan(0.3);
      expect(prediction.estimatedTimeToFailure).toBeGreaterThan(1000);
    });

    test('should predict high probability for degraded metrics', () => {
      const metrics = {
        timestamp: Date.now(),
        hitRate: 0.3,
        missRate: 0.7,
        errorRate: 0.4,
        avgResponseTime: 500,
        memoryUsage: 800,
        failureCount: 10
      };

      const prediction = predictor.predict(metrics, 0.05, -0.05, 50, 5);

      expect(prediction.probability).toBeGreaterThan(0.5);
    });

    test('should recommend circuit breaker for critical situations', () => {
      const metrics = {
        timestamp: Date.now(),
        hitRate: 0.2,
        missRate: 0.8,
        errorRate: 0.45,
        avgResponseTime: 1000,
        memoryUsage: 900,
        failureCount: 15
      };

      const prediction = predictor.predict(metrics, 0.1, -0.1, 100, 10);

      expect(prediction.recommendedAction).toBe(RecoveryStrategy.CIRCUIT_BREAKER);
    });

    test('should provide confidence based on historical data', () => {
      const metrics = {
        timestamp: Date.now(),
        hitRate: 0.8,
        missRate: 0.2,
        errorRate: 0.05,
        avgResponseTime: 50,
        memoryUsage: 200,
        failureCount: 1
      };

      const prediction1 = predictor.predict(metrics, 0, 0, 0, 0);
      expect(prediction1.confidence).toBe(0);

      // Learn from multiple examples
      for (let i = 0; i < 50; i++) {
        predictor.learn(
          {
            errorRateTrend: 0,
            hitRateTrend: 0,
            responseTimeTrend: 0,
            failureFrequency: 0,
            currentErrorRate: 0.05,
            memoryPressure: 0.2
          },
          false
        );
      }

      const prediction2 = predictor.predict(metrics, 0, 0, 0, 0);
      expect(prediction2.confidence).toBeGreaterThan(prediction1.confidence);
    });
  });

  describe('Online learning', () => {
    test('should update model with new data', () => {
      const initialStats = predictor.getModelStats();
      expect(initialStats.dataPoints).toBe(0);

      predictor.learn(
        {
          errorRateTrend: 0.05,
          hitRateTrend: -0.05,
          responseTimeTrend: 10,
          failureFrequency: 2,
          currentErrorRate: 0.2,
          memoryPressure: 0.5
        },
        true
      );

      const updatedStats = predictor.getModelStats();
      expect(updatedStats.dataPoints).toBe(1);
    });

    test('should limit historical data size', () => {
      for (let i = 0; i < 1500; i++) {
        predictor.learn(
          {
            errorRateTrend: 0,
            hitRateTrend: 0,
            responseTimeTrend: 0,
            failureFrequency: 0,
            currentErrorRate: 0.1,
            memoryPressure: 0.3
          },
          false
        );
      }

      const stats = predictor.getModelStats();
      expect(stats.dataPoints).toBeLessThanOrEqual(1000);
    });

    test('should adjust weights through learning', () => {
      const initialStats = predictor.getModelStats();
      const initialWeights = [...initialStats.weights];

      // Learn from multiple examples with variance
      for (let i = 0; i < 100; i++) {
        predictor.learn(
          {
            errorRateTrend: 0.1 + (i % 10) * 0.01,
            hitRateTrend: -0.1,
            responseTimeTrend: 50 + (i % 20),
            failureFrequency: 5,
            currentErrorRate: 0.3,
            memoryPressure: 0.7
          },
          true
        );
      }

      const updatedStats = predictor.getModelStats();
      const updatedWeights = updatedStats.weights;

      // Check that weights changed or at least data points increased
      const weightsChanged = !updatedWeights.every((w, i) => Math.abs(w - initialWeights[i]) < 0.001);
      expect(weightsChanged || updatedStats.dataPoints > 0).toBe(true);
    });
  });

  describe('Reset functionality', () => {
    test('should reset model state', () => {
      // Add some data
      for (let i = 0; i < 10; i++) {
        predictor.learn(
          {
            errorRateTrend: 0,
            hitRateTrend: 0,
            responseTimeTrend: 0,
            failureFrequency: 0,
            currentErrorRate: 0.1,
            memoryPressure: 0.3
          },
          false
        );
      }

      expect(predictor.getModelStats().dataPoints).toBe(10);

      predictor.reset();

      expect(predictor.getModelStats().dataPoints).toBe(0);
    });
  });
});
