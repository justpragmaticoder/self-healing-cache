# Cache Performance Experiment Guide

## Overview

This guide explains how to run automated experiments to compare three caching strategies:

1. **Baseline** - Traditional cache without self-healing
2. **Self-Healing (No ML)** - Self-healing cache with adaptive recovery but without ML predictions
3. **Self-Healing (With ML)** - Full self-healing cache with ML-powered failure prediction

## Running Experiments

### Method 1: Via API Endpoint

Start the NestJS application:

```bash
npm run start:dev
```

Then trigger the full comparison experiment:

```bash
curl -X POST http://localhost:3000/experiments/run-comparison
```

This will:
- Run all three cache types across three scenarios (normal, high_failure, burst_traffic)
- Generate detailed performance metrics
- Save results to `experiment_results/experiment_<timestamp>.json`

### Method 2: Via Script

You can also use the existing benchmark script:

```bash
npm run benchmark
```

## Experiment Scenarios

### 1. Normal Operation
- **Failure Rate**: 5%
- **Response Delay**: 10ms
- **Requests**: 1000
- **Key Pattern**: Sequential (100 unique keys)

### 2. High Failure Rate
- **Failure Rate**: 30%
- **Response Delay**: 50ms
- **Requests**: 500
- **Key Pattern**: Sequential (50 unique keys)

### 3. Burst Traffic
- **Bursts**: 5 cycles
- **Failure Rate**: Alternates between 5% and 25%
- **Response Delay**: Alternates between 10ms and 100ms
- **Requests per Burst**: 200
- **Key Pattern**: Random (100 unique keys)

## Results Format

Results are saved as JSON files in `experiment_results/` directory with the following structure:

```json
{
  "experimentId": "experiment_1730754000000",
  "timestamp": 1730754000000,
  "scenarios": {
    "normal": {
      "baseline": { /* metrics */ },
      "selfHealing": { /* metrics */ },
      "selfHealingML": { /* metrics */ },
      "improvements": {
        "successRateImprovement": {
          "vsBaseline": 15.5,
          "vsNoML": 3.2
        },
        "hitRateImprovement": { /* ... */ },
        "responseTimeImprovement": { /* ... */ },
        "throughputImprovement": { /* ... */ }
      }
    },
    "high_failure": { /* ... */ },
    "burst_traffic": { /* ... */ }
  },
  "summary": {
    "bestPerformer": "self_healing_with_ml",
    "overallImprovements": {
      "avgSuccessRateImprovement": 18.3,
      "avgHitRateImprovement": 22.1,
      "avgResponseTimeImprovement": 12.7,
      "avgThroughputImprovement": 25.4
    }
  }
}
```

## Key Metrics Explained

### Success Rate
Percentage of requests that completed successfully without errors.

### Hit Rate
Percentage of cache hits vs total cache operations.

### Response Time
- **avg**: Average response time in milliseconds
- **p50**: 50th percentile (median)
- **p95**: 95th percentile
- **p99**: 99th percentile

### Throughput
Number of requests processed per second.

### Improvements
Percentage improvement compared to baseline and non-ML versions:
- **Positive values** = better performance
- **Negative values** = worse performance

## Expected Results

### Normal Operation
- Self-healing with ML should show **10-20%** improvement in success rate
- Hit rate improvement of **15-25%**
- Response time reduction of **5-15%**

### High Failure Rate
- Self-healing with ML shows **significant advantage** (20-40% improvement)
- Better failure prediction and recovery
- Lower response time variance

### Burst Traffic
- Self-healing adapts to changing conditions
- ML model improves over time
- Better handling of traffic spikes

## Visualization

To visualize the results:

```bash
npm run visualize
```

This will generate charts showing:
- Success rate comparison across scenarios
- Hit rate comparison
- Response time comparison
- Throughput comparison
- ML model performance (if enabled)

## API Endpoints

### Run Full Comparison
```
POST /experiments/run-comparison
```

### Get All Experiments
```
GET /experiments
```

### Get Cache Stats
```
GET /cache/stats
```

### Get ML Training Data
```
GET /ml/training-data?limit=100
```

## Tips for Best Results

1. **Warm-up Period**: Run a few requests before measuring to allow ML model to train
2. **Multiple Runs**: Run experiments multiple times and average results
3. **Consistent Environment**: Ensure no other heavy processes are running
4. **Monitor Resources**: Check CPU and memory usage during experiments
5. **Log Analysis**: Review logs to understand recovery actions taken

## Troubleshooting

### Experiments Not Starting
- Check if port 3000 is available
- Verify MySQL/Redis connections if enabled

### Inconsistent Results
- Run experiments multiple times
- Increase sample size in src/nestjs-app/experiments/experiment-runner.service.ts
- Check system resources

### No Improvement Shown
- ML needs time to train (increase iterations)
- Verify failure rates are configured correctly
- Check if adaptive recovery is enabled

## Next Steps

After running experiments:

1. Analyze the JSON results in `experiment_results/`
2. Compare metrics across different scenarios
3. Visualize trends using the Python visualization script
4. Fine-tune cache configuration based on results
5. Adjust ML thresholds and recovery strategies
