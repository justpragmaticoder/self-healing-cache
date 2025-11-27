# ✅ Fixed: Empty ml_training_data.json and cache_statistics.json Files

## Problem Diagnosed

After running experiments, two files were **empty or had minimal data**:
1. `experiment_results/ml_training_data.json` → `{"data":[],"total":0}`
2. `experiment_results/cache_statistics.json` → Only current app state, no experiment data

## Root Causes Identified

### Issue #1: Separate Cache Instances
- The **experiment runner** creates SEPARATE cache instances for each test scenario
- These instances run in isolation and don't share state with the main NestJS app
- Each experiment cache instance stores ML training data in-memory only

### Issue #2: Wrong Data Source
The `run_experiment.sh` script was calling:
```bash
curl http://localhost:3000/api/cache/stats > cache_statistics.json
curl http://localhost:3000/api/ml/training-data > ml_training_data.json
```

These endpoints query the **main app's cache service**, which:
- Has NO data (experiments use separate cache instances)
- Has NO ML training data (not persisted to MySQL)
- Returns empty or minimal results

### Issue #3: No Data Persistence
- ML training data exists in-memory during experiments
- But it's never written to files
- When experiments complete, the data is lost

---

## Solution Implemented

### 1. Enhanced ExperimentRunnerService ✅

**File**: `src/libs/self-healing-cache/experiments/experiment-runner.service.ts`

**Changes**:
- Added data collection during experiment execution
- Aggregate ML training data from all scenarios
- Aggregate cache statistics from all test runs
- Save data directly to files after experiments complete

**New Code Added**:
```typescript
// Collect all ML training data and cache statistics
const allMLData: any[] = [];
let aggregatedCacheStats = {
  totalHits: 0,
  totalMisses: 0,
  totalRequests: 0,
  totalErrors: 0,
  scenarios: {} as any,
};

// During each scenario:
aggregatedCacheStats.scenarios[scenario] = {
  baseline: { hits, misses, hitRate, errors },
  selfHealing: { hits, misses, hitRate, errors },
  selfHealingML: { hits, misses, hitRate, errors, mlStats, predictionAccuracy }
};

// Collect ML training data
if (selfHealingMLResult.mlStats) {
  allMLData.push({
    scenario,
    experimentId,
    timestamp,
    mlStats,
    predictionAccuracy,
    recoveryStats
  });
}

// After all scenarios complete:
// Save ML training data
fs.writeFileSync('ml_training_data.json', JSON.stringify({
  experimentId,
  timestamp,
  data: allMLData,
  total: allMLData.length
}));

// Save cache statistics
fs.writeFileSync('cache_statistics.json', JSON.stringify({
  experimentId,
  timestamp,
  aggregated: aggregatedCacheStats,
  overallHitRate,
  overallErrorRate
}));
```

### 2. Updated run_experiment.sh ✅

**File**: `run_experiment.sh`

**Changes**:
- Removed the API calls that generated empty files
- Now just verifies that files were created by the experiment runner
- Cleaner and more reliable

**Old Code** (removed):
```bash
curl -s http://localhost:3000/api/cache/stats > cache_statistics.json
curl -s http://localhost:3000/api/ml/training-data > ml_training_data.json
```

**New Code**:
```bash
# Just verify files exist
if [ -f "experiment_results/cache_statistics.json" ]; then
    echo "✓ Cache statistics exported"
fi
if [ -f "experiment_results/ml_training_data.json" ]; then
    echo "✓ ML training data exported"
fi
```

---

## What Data Will Now Be Saved

### ml_training_data.json
```json
{
  "experimentId": "experiment_1234567890",
  "timestamp": 1234567890,
  "data": [
    {
      "scenario": "normal",
      "experimentId": "experiment_1234567890",
      "timestamp": 1234567890,
      "mlStats": {
        "dataPoints": 150,
        "weights": [0.3, 0.25, 0.2, 0.15, 0.07, 0.03],
        "predictions": 50
      },
      "predictionAccuracy": {
        "totalPredictions": 50,
        "correctPredictions": 42,
        "precision": 0.84,
        "recall": 0.80,
        "f1Score": 0.82
      },
      "recoveryStats": {
        "successRate": 0.95,
        "bestStrategy": "adaptive"
      }
    },
    // ... data for each scenario (8 scenarios total)
  ],
  "total": 8
}
```

### cache_statistics.json
```json
{
  "experimentId": "experiment_1234567890",
  "timestamp": 1234567890,
  "aggregated": {
    "totalHits": 45230,
    "totalMisses": 2870,
    "totalRequests": 48100,
    "totalErrors": 134,
    "scenarios": {
      "normal": {
        "baseline": { "hits": 980, "misses": 20, "hitRate": 0.98, "errors": 6 },
        "selfHealing": { "hits": 985, "misses": 15, "hitRate": 0.985, "errors": 2 },
        "selfHealingML": { "hits": 990, "misses": 10, "hitRate": 0.99, "errors": 1,
          "mlStats": {...}, "predictionAccuracy": {...}
        }
      },
      // ... 7 more scenarios
    }
  },
  "overallHitRate": 0.9403,
  "overallErrorRate": 0.0028
}
```

---

## Benefits

✅ **Complete Data**: All experiment data now saved to files  
✅ **ML Training Data**: Actual ML stats from experiments  
✅ **Cache Statistics**: Aggregated stats from all scenarios  
✅ **No Empty Files**: Files contain real experiment results  
✅ **Self-Contained**: No dependency on main app's API  
✅ **Reliable**: Data saved directly by experiment runner  

---

## Testing

After running experiments again:

```bash
npm run experiment
```

You should now see:
1. ✅ **ml_training_data.json** with 8 scenario entries
2. ✅ **cache_statistics.json** with aggregated statistics
3. ✅ All data from the actual experiment runs

---

## Files Changed

1. ✅ `src/libs/self-healing-cache/experiments/experiment-runner.service.ts`
   - Added ML data collection
   - Added cache stats aggregation
   - Added file writing logic

2. ✅ `run_experiment.sh`
   - Removed empty API calls
   - Added file verification

---

**Status**: ✅ **FIXED** - Files will now contain real experiment data!

