import { HealthMetrics, FailurePrediction, RecoveryStrategy } from '../types';

interface FeatureVector {
  errorRateTrend: number;
  hitRateTrend: number;
  responseTimeTrend: number;
  failureFrequency: number;
  currentErrorRate: number;
  memoryPressure: number;
}

export class FailurePredictor {
  private historicalData: Array<{ features: FeatureVector; actualFailure: boolean }> = [];
  private weights: number[] = [0.3, 0.25, 0.2, 0.15, 0.07, 0.03]; // Initial weights
  private readonly learningRate = 0.01;
  private readonly trainingThreshold = 100;

  // Prediction tracking for accuracy metrics
  private predictions: Array<{
    timestamp: number;
    predictedProbability: number;
    predictedTimeToFailure: number;
    actualFailure: boolean;
    actualTimeToFailure?: number;
  }> = [];

  predict(
    currentMetrics: HealthMetrics,
    errorRateTrend: number,
    hitRateTrend: number,
    responseTimeTrend: number,
    failureFrequency: number
  ): FailurePrediction {
    const features = this.extractFeatures(
      currentMetrics,
      errorRateTrend,
      hitRateTrend,
      responseTimeTrend,
      failureFrequency
    );

    // Calculate failure probability using weighted sum (simple linear model)
    const probability = this.calculateProbability(features);

    // Estimate time to failure based on trends
    const estimatedTimeToFailure = this.estimateTimeToFailure(features);

    // Calculate confidence based on data history
    const confidence = Math.min(this.historicalData.length / this.trainingThreshold, 1.0);

    // Recommend strategy based on probability and trends
    const recommendedAction = this.recommendStrategy(probability, features);

    // Track prediction for accuracy metrics
    this.predictions.push({
      timestamp: Date.now(),
      predictedProbability: probability,
      predictedTimeToFailure: estimatedTimeToFailure,
      actualFailure: false // Will be updated when outcome is known
    });

    // Keep predictions history limited
    if (this.predictions.length > 1000) {
      this.predictions.shift();
    }

    return {
      probability,
      estimatedTimeToFailure,
      confidence,
      recommendedAction
    };
  }

  private extractFeatures(
    metrics: HealthMetrics,
    errorRateTrend: number,
    hitRateTrend: number,
    responseTimeTrend: number,
    failureFrequency: number
  ): FeatureVector {
    const memoryPressure = metrics.memoryUsage / 1024; // Normalize memory

    return {
      errorRateTrend: this.normalize(errorRateTrend, -0.1, 0.1),
      hitRateTrend: this.normalize(hitRateTrend, -0.1, 0.1),
      responseTimeTrend: this.normalize(responseTimeTrend, -100, 100),
      failureFrequency: this.normalize(failureFrequency, 0, 20),
      currentErrorRate: metrics.errorRate,
      memoryPressure: this.normalize(memoryPressure, 0, 1)
    };
  }

  private normalize(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  private calculateProbability(features: FeatureVector): number {
    const featureArray = [
      features.errorRateTrend,
      features.hitRateTrend,
      features.responseTimeTrend,
      features.failureFrequency,
      features.currentErrorRate,
      features.memoryPressure
    ];

    let score = 0;
    for (let i = 0; i < featureArray.length; i++) {
      score += featureArray[i] * this.weights[i];
    }

    // Sigmoid activation for probability (adjusted for higher precision)
    // Higher bias (+7 instead of +5) makes it more conservative
    return 1 / (1 + Math.exp(-score * 12 + 7));
  }

  private estimateTimeToFailure(features: FeatureVector): number {
    // Based on error rate trend, estimate when error rate will reach critical threshold (0.5)
    if (features.errorRateTrend <= 0) {
      return Infinity; // No failure expected if trend is improving
    }

    const currentErrorRate = features.currentErrorRate;
    const criticalThreshold = 0.5;
    const errorRateGap = criticalThreshold - currentErrorRate;

    if (errorRateGap <= 0) {
      return 0; // Already critical
    }

    // Estimate time in milliseconds
    const estimatedTime = (errorRateGap / (features.errorRateTrend * 0.1)) * 60000; // minutes to ms

    return Math.max(0, Math.min(estimatedTime, 3600000)); // Cap at 1 hour
  }

  private recommendStrategy(probability: number, features: FeatureVector): RecoveryStrategy {
    // Critical situation - immediate action needed
    if (probability > 0.8 || features.currentErrorRate > 0.4) {
      return RecoveryStrategy.CIRCUIT_BREAKER;
    }

    // High risk - proactive refresh
    if (probability > 0.6) {
      return RecoveryStrategy.IMMEDIATE_REFRESH;
    }

    // Moderate risk - gradual approach
    if (probability > 0.4) {
      return RecoveryStrategy.GRADUAL_REFRESH;
    }

    // Low risk - adaptive monitoring
    if (probability > 0.2) {
      return RecoveryStrategy.ADAPTIVE;
    }

    // Minimal risk - use fallback if needed
    return RecoveryStrategy.FALLBACK;
  }

  // Online learning - update model based on actual outcomes
  learn(features: FeatureVector, actualFailure: boolean): void {
    this.historicalData.push({ features, actualFailure });

    // Keep history limited
    if (this.historicalData.length > 1000) {
      this.historicalData.shift();
    }

    // Update weights using gradient descent
    if (this.historicalData.length >= 10) {
      this.updateWeights(features, actualFailure);
    }
  }

  private updateWeights(features: FeatureVector, actualFailure: boolean): void {
    const predicted = this.calculateProbability(features);
    const error = (actualFailure ? 1 : 0) - predicted;

    const featureArray = [
      features.errorRateTrend,
      features.hitRateTrend,
      features.responseTimeTrend,
      features.failureFrequency,
      features.currentErrorRate,
      features.memoryPressure
    ];

    // Gradient descent update
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] += this.learningRate * error * featureArray[i];
    }

    // Normalize weights
    const sum = this.weights.reduce((a, b) => Math.abs(a) + Math.abs(b), 0);
    if (sum > 0) {
      this.weights = this.weights.map(w => w / sum);
    }
  }

  recordActualOutcome(failureOccurred: boolean, timeToFailure?: number): void {
    // Update the most recent prediction with actual outcome
    if (this.predictions.length > 0) {
      const lastPrediction = this.predictions[this.predictions.length - 1];
      lastPrediction.actualFailure = failureOccurred;
      if (timeToFailure !== undefined) {
        lastPrediction.actualTimeToFailure = timeToFailure;
      }
    }
  }

  getPredictionAccuracy(): {
    totalPredictions: number;
    correctPredictions: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
    avgPredictionError: number;
  } {
    if (this.predictions.length === 0) {
      return {
        totalPredictions: 0,
        correctPredictions: 0,
        falsePositives: 0,
        falseNegatives: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        avgPredictionError: 0
      };
    }

    let truePositives = 0;
    let trueNegatives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let timeErrors: number[] = [];

    const threshold = 0.6; // Probability threshold for binary classification (balanced precision/recall)

    for (const pred of this.predictions) {
      const predictedFailure = pred.predictedProbability >= threshold;
      const actualFailure = pred.actualFailure;

      if (predictedFailure && actualFailure) {
        truePositives++;
      } else if (!predictedFailure && !actualFailure) {
        trueNegatives++;
      } else if (predictedFailure && !actualFailure) {
        falsePositives++;
      } else if (!predictedFailure && actualFailure) {
        falseNegatives++;
      }

      // Calculate time-to-failure prediction error
      if (pred.actualTimeToFailure !== undefined && pred.predictedTimeToFailure !== Infinity) {
        const error = Math.abs(pred.predictedTimeToFailure - pred.actualTimeToFailure);
        timeErrors.push(error);
      }
    }

    const correctPredictions = truePositives + trueNegatives;
    const precision = truePositives + falsePositives > 0
      ? truePositives / (truePositives + falsePositives)
      : 0;
    const recall = truePositives + falseNegatives > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;
    const f1Score = precision + recall > 0
      ? 2 * (precision * recall) / (precision + recall)
      : 0;
    const avgPredictionError = timeErrors.length > 0
      ? timeErrors.reduce((a, b) => a + b, 0) / timeErrors.length
      : 0;

    return {
      totalPredictions: this.predictions.length,
      correctPredictions,
      falsePositives,
      falseNegatives,
      precision,
      recall,
      f1Score,
      avgPredictionError
    };
  }

  getModelStats(): { dataPoints: number; weights: number[] } {
    return {
      dataPoints: this.historicalData.length,
      weights: [...this.weights]
    };
  }

  reset(): void {
    this.historicalData = [];
    this.predictions = [];
    this.weights = [0.3, 0.25, 0.2, 0.15, 0.07, 0.03];
  }
}
