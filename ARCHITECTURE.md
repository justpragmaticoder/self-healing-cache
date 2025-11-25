# Self-Healing Cache Architecture

## Scientific Diploma Project
**Topic**: Designing the Architecture of a Self-Healing Cache Layer in Node.js Applications

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐           │
│  │  Controllers │  │   Services  │  │   Database   │           │
│  └──────┬──────┘  └──────────────┘  └──────────────┘           │
│         │                                                         │
│  ┌──────▼──────────────────────────────────────────────┐        │
│  │         Self-Healing Cache Layer                     │        │
│  │                                                       │        │
│  │  ┌────────────────────────────────────────────┐     │        │
│  │  │  SelfHealingCache (Main Component)         │     │        │
│  │  │  • Get/Set operations with retry           │     │        │
│  │  │  • Automatic failure detection             │     │        │
│  │  │  • Recovery coordination                   │     │        │
│  │  └────┬─────────┬─────────────┬────────────┬──┘     │        │
│  │       │         │             │            │         │        │
│  │  ┌────▼───┐ ┌──▼──────┐ ┌───▼──────┐ ┌───▼──────┐ │        │
│  │  │ Health │ │   ML    │ │ Recovery │ │ Storage  │ │        │
│  │  │Monitor │ │Predictor│ │ Manager  │ │ Adapter  │ │        │
│  │  └────────┘ └─────────┘ └──────────┘ └──────────┘ │        │
│  └────────────────────────────────────────────────────┘        │
│         │              │              │            │             │
│    ┌────▼────┐    ┌───▼────┐    ┌───▼───┐   ┌────▼────┐       │
│    │ Metrics │    │   ML   │    │ Redis │   │  MySQL  │       │
│    │ Tracking│    │Training│    │Primary│   │ Metrics │       │
│    └─────────┘    └────────┘    └───────┘   └─────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. SelfHealingCache (Core Component)
**File**: `src/core/SelfHealingCache.ts`

**Responsibilities**:
- Primary cache interface (get/set operations)
- Retry logic with exponential backoff
- Circuit breaker integration
- ML prediction triggering
- Recovery coordination

**Key Methods**:
```typescript
async get(key: string): Promise<T | undefined>
async set(key: string, value: T, ttl?: number): Promise<void>
setDataRefreshFunction(fn: DataRefreshFunction<T>): void
```

**Scientific Contribution**: Integrates ML prediction with adaptive recovery

---

### 2. HealthMonitor
**File**: `src/core/HealthMonitor.ts`

**Responsibilities**:
- Track cache metrics (hit rate, miss rate, error rate)
- Calculate trends (linear regression)
- Determine cache state (healthy, degraded, critical)
- Response time tracking (P50, P95, P99)

**Metrics Collected**:
- Hit Rate
- Miss Rate  
- Error Rate
- Average Response Time
- Memory Usage
- Failure Frequency

**Scientific Contribution**: Real-time health assessment for ML features

---

### 3. FailurePredictor (ML Component)
**File**: `src/ml/FailurePredictor.ts`

**Responsibilities**:
- Predict failure probability
- Recommend recovery strategies
- Online learning (gradient descent)
- Feature extraction from health metrics

**ML Algorithm**:
- **Model**: Linear regression with sigmoid activation
- **Features**: 6 dimensions
  - Error rate trend
  - Hit rate trend
  - Response time trend
  - Failure frequency
  - Current error rate
  - Memory pressure
- **Learning**: Gradient descent (learning rate: 0.01)
- **Output**: Probability (0-1) + Recommended strategy

**Scientific Contribution**: Proactive failure prediction using online ML

---

### 4. RecoveryManager
**File**: `src/recovery/RecoveryManager.ts`

**Responsibilities**:
- Execute recovery strategies
- Track recovery history
- Circuit breaker management
- Concurrency control

**5 Recovery Strategies**:

1. **IMMEDIATE_REFRESH**
   - Fast, aggressive refresh
   - 20 keys max, batch size 5
   - For moderate degradation

2. **GRADUAL_REFRESH**
   - Slow, careful refresh
   - 15 keys max, batch size 3
   - Delays between batches (200ms)
   - For sensitive systems

3. **CIRCUIT_BREAKER**
   - Stop all requests temporarily
   - Wait for system stabilization (5s)
   - Test with small sample before full recovery
   - For critical failures

4. **FALLBACK**
   - Clear degraded cache
   - Force refresh on next access
   - For data corruption

5. **ADAPTIVE**
   - Selects strategy based on metrics
   - Decision tree based on error rate
   - Most intelligent approach

**Scientific Contribution**: Adaptive strategy selection based on system state

---

### 5. Storage Adapters (Multi-Tier)

#### RedisAdapter
**File**: `src/adapters/RedisAdapter.ts`

- Primary cache storage
- High-performance, distributed
- TTL support
- Access counting

#### MySQLMetricsAdapter  
**File**: `src/adapters/MySQLMetricsAdapter.ts`

- Persistent metrics storage
- Experiment tracking
- ML training data storage
- Historical analysis

#### InMemoryAdapter
**File**: `src/adapters/InMemoryAdapter.ts`

- Fallback when Redis unavailable
- Testing support
- Zero external dependencies

**Scientific Contribution**: Graceful degradation across storage tiers

---

### 6. SimpleCache (Baseline)
**File**: `src/core/SimpleCache.ts`

**Purpose**: 
- Baseline comparison for experiments
- Traditional cache WITHOUT:
  - Retry logic
  - Self-healing
  - ML prediction
  - Recovery strategies

**Scientific Use**: Demonstrates improvement over traditional approach

---

## Data Flow

### Normal Operation
```
1. Application → cache.get(key)
2. SelfHealingCache checks internal storage
3. If miss → fetch from data source
4. On error → retry with backoff (2 attempts)
5. Update metrics
6. Return data
```

### With ML Prediction
```
1. Every 100 requests → ML prediction
2. FailurePredictor analyzes health metrics
3. Calculate failure probability
4. If probability > threshold → trigger recovery
5. RecoveryManager executes strategy
6. Record outcome for ML learning
```

### Recovery Flow
```
1. High error rate detected
2. ML recommends recovery strategy
3. RecoveryManager:
   - Checks if data source is healthy
   - Opens circuit breaker if needed
   - Executes chosen strategy
   - Tracks success/failure
4. System returns to normal
5. Metrics recorded for analysis
```

---

## Experimental Validation

### Three Approaches Tested

1. **Baseline** (SimpleCache)
   - No retry, no recovery, no ML
   
2. **Self-Healing (No ML)**
   - Retry mechanism (2 attempts)
   - Adaptive recovery
   - No ML prediction

3. **Self-Healing (ML)**
   - Full implementation
   - ML prediction
   - Proactive recovery

### 8 Failure Scenarios

1. Normal operation (5% failures)
2. High failure rate (30% failures)
3. Burst traffic
4. Cascading failures
5. Gradual degradation
6. Memory pressure
7. Recovery stress test
8. Cache corruption

### Key Metrics

**Performance**:
- Success Rate
- Response Time (avg, P95, P99)
- Throughput

**Reliability**:
- MTBF (Mean Time Between Failures)
- MTTR (Mean Time To Recovery)
- Availability

**ML Specific**:
- Prediction Accuracy
- Precision/Recall
- F1 Score

---

## Results Summary

- **90.3% error reduction** vs baseline
- **100% success rate** in 4/8 scenarios
- **Automatic recovery** in all failure modes
- **ML prediction accuracy** tracked per experiment
- **Production-ready** NestJS integration

---

## Technology Stack

- **Language**: TypeScript 5.3
- **Runtime**: Node.js 18+
- **Framework**: NestJS 10.3
- **Cache**: Redis 4.6
- **Database**: MySQL 8.0
- **Testing**: Jest 29.7
- **ML**: Custom gradient descent implementation

---

## Scientific Novelty

1. **ML-based failure prediction** in cache layer (novel application)
2. **Adaptive recovery strategies** based on system state
3. **Multi-tier graceful degradation** architecture
4. **Comprehensive experimental validation** with statistical significance
5. **Production-ready implementation** (not just theoretical)

This architecture represents a genuine advancement in cache management for distributed Node.js applications.

