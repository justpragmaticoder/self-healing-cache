# Self-Healing Cache Layer for Node.js Applications

**ML-powered self-healing cache with adaptive recovery strategies for Node.js and NestJS applications.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## 🎯 Overview

This project implements a **Self-Healing Cache Layer** that automatically detects, predicts, and recovers from cache failures using machine learning. It demonstrates significant improvements over traditional caching approaches:

- **90.3% error reduction** compared to baseline
- **100% success rate** in 4 out of 8 failure scenarios
- **Automatic recovery** without manual intervention
- **ML-based failure prediction** with online learning

### Key Features

- 🤖 **ML-Based Failure Prediction**: Real-time failure probability estimation using gradient descent
- 🔄 **Adaptive Recovery Strategies**: 5 dynamic strategies (IMMEDIATE_REFRESH, GRADUAL_REFRESH, CIRCUIT_BREAKER, FALLBACK, ADAPTIVE)
- 📊 **Comprehensive Metrics**: Hit rate, error rate, MTBF, MTTR, availability tracking
- 🔌 **Multi-tier Storage**: Redis + MySQL + In-memory fallback with graceful degradation
- 🌐 **NestJS Integration**: Ready-to-use module with dependency injection
- 🐳 **Docker Support**: One-command deployment with docker-compose

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Docker & Docker Compose (for Redis + MySQL)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd self-healing-cache

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### Run Everything with One Command

```bash
npm run experiment
```

This command automatically:
1. ✅ Starts Docker containers (Redis + MySQL)
2. ✅ Builds the application
3. ✅ Starts NestJS server
4. ✅ Runs 8 failure scenarios experiments
5. ✅ Compares 3 approaches: Baseline, Self-Healing, ML
6. ✅ Generates charts and exports results to `experiment_results/`
7. ✅ Displays comparative analysis

---

## 📦 Manual Setup

### 1. Start Infrastructure

```bash
# Start Redis + MySQL
docker-compose up -d redis mysql

# Verify services are running
docker-compose ps
```

### 2. Configure Environment

Edit `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
ENABLE_REDIS=true

# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=cacheuser
MYSQL_PASSWORD=cachepass
MYSQL_DATABASE=cache_metrics
ENABLE_MYSQL=true

# Application
NODE_ENV=development
PORT=3000
```

### 3. Initialize Database

The MySQL schema is automatically initialized from `init.sql` when the container starts.

### 4. Start Application

```bash
# Development mode with hot reload
npm run start:dev

# Production build
npm run build
npm run start
```

The API will be available at `http://localhost:3000`

---

## 🧪 Running Experiments

### Full Experiment Suite

```bash
./run_experiment.sh
```

This runs all 8 failure scenarios and compares three approaches:
- **Baseline**: Traditional cache without self-healing
- **Self-Healing (No ML)**: Retry mechanism with adaptive recovery
- **Self-Healing (ML)**: Full ML-based failure prediction + recovery

Results are saved to:
- `experiment_results/experiment_<timestamp>.json` - Raw metrics
- `charts/*.png` - Visualization charts

### Individual Scenarios

The experiment suite tests 8 scenarios:

1. **normal** - Normal operation (5% failure rate)
2. **high_failure** - High failure rate (30%)
3. **burst_traffic** - Traffic spikes with varying failure rates
4. **cascading_failure** - Cascading failure patterns
5. **gradual_degradation** - Gradual performance degradation
6. **memory_pressure** - High memory usage conditions
7. **recovery_stress_test** - Recovery mechanism stress test
8. **cache_corruption** - Data corruption scenarios

See [EXPERIMENTS.md](EXPERIMENTS.md) for detailed descriptions.

---

## 📊 API Endpoints

### Cache Management

```bash
# Health status
GET /api/cache/health

# Detailed health (cache + Redis + MySQL)
GET /api/cache/health/detailed

# Cache statistics
GET /api/cache/stats

# Trigger manual recovery
POST /api/cache/heal

# Clear cache
DELETE /api/cache
```

### Experiments & Analytics

```bash
# Run comparison experiment
POST /api/experiments/run-comparison

# Get all experiments
GET /api/experiments

# Get ML training data
GET /api/ml/training-data?limit=100
```

### Example Usage

```bash
# Check cache health
curl http://localhost:3000/api/cache/health

# Get detailed statistics
curl http://localhost:3000/api/cache/stats

# Trigger healing
curl -X POST http://localhost:3000/api/cache/heal
```

---

## 💻 Usage in Your NestJS Application

### 1. Install Module

```typescript
import { Module } from '@nestjs/common';
import { SelfHealingCacheModule } from './self-healing-cache.module';

@Module({
  imports: [
    SelfHealingCacheModule.forRoot({
      maxSize: 10000,
      defaultTTL: 300000, // 5 minutes
      enableML: true,
      enableAdaptiveRecovery: true,
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
      mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'cacheuser',
        password: process.env.MYSQL_PASSWORD || 'cachepass',
        database: process.env.MYSQL_DATABASE || 'cache_metrics',
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Use in Service

```typescript
import { Injectable } from '@nestjs/common';
import { SelfHealingCacheService } from './self-healing-cache.service';

@Injectable()
export class ProductService {
  constructor(private readonly cache: SelfHealingCacheService) {
    // Configure data refresh function
    this.cache.setDataRefreshFunction(async (key: string) => {
      const id = key.split(':')[1];
      return await this.fetchProductFromDB(id);
    });
  }

  async getProduct(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;

    // Automatic caching with self-healing
    const product = await this.cache.get<Product>(cacheKey);

    if (!product) {
      const freshData = await this.fetchProductFromDB(id);
      await this.cache.set(cacheKey, freshData);
      return freshData;
    }

    return product;
  }

  private async fetchProductFromDB(id: string): Promise<Product> {
    // Your database logic here
  }
}
```

---

## 🧬 Scientific Novelty

### 1. ML-Based Failure Prediction

**Features used for prediction:**
- Error rate trend
- Hit rate trend
- Response time trend
- Failure frequency
- Current error rate
- Memory pressure

**Algorithm:**
- Online learning with gradient descent
- Sigmoid activation for probability estimation
- Adaptive weight adjustment based on prediction accuracy

**Result:** Proactive recovery before critical failures occur

### 2. Adaptive Recovery Strategies

Five dynamic strategies automatically selected based on system state:

| Strategy | When Used | Action |
|----------|-----------|--------|
| IMMEDIATE_REFRESH | Critical errors > 35% | Immediate cache refresh |
| GRADUAL_REFRESH | Moderate errors (20-35%) | Batch refresh under load |
| CIRCUIT_BREAKER | Error rate > 20% | Temporary shutdown protection |
| FALLBACK | Low errors (15-20%) | Background refresh |
| ADAPTIVE | ML confidence high | ML-guided strategy selection |

### 3. Experimental Results

**Key Metrics (from experiment_1762383169147.json):**

| Metric | Baseline | Self-Healing | ML | Improvement |
|--------|----------|--------------|-----|-------------|
| **Total Errors** | 134 | 16 | 13 | **90.3%** ↓ |
| **Success Rate** | 99.55% | 99.89% | 99.91% | +0.36% |
| **Hit Rate** | 97.28% | 97.82% | 97.85% | +0.57% |
| **Scenarios Won** | 0/8 | 1/8 | 7/8 | **87.5%** |

**Hierarchy achieved:** Baseline < Self-Healing < ML in 7 out of 8 scenarios (87.5%)

---

## 🗂️ Project Structure

```
self-healing-cache/
├── src/
│   ├── core/                      # Core cache components
│   │   ├── SelfHealingCache.ts   # Main cache with ML + recovery
│   │   ├── SimpleCache.ts        # Baseline cache for comparison
│   │   ├── CacheStorage.ts       # Storage with TTL and LRU
│   │   └── HealthMonitor.ts      # Metrics monitoring
│   ├── ml/
│   │   └── FailurePredictor.ts   # ML model (6 features, online learning)
│   ├── recovery/
│   │   └── RecoveryManager.ts    # 5 recovery strategies
│   ├── adapters/
│   │   ├── InMemoryAdapter.ts    # In-memory storage
│   │   ├── RedisAdapter.ts       # Redis integration
│   │   └── MySQLMetricsAdapter.ts # Metrics persistence
│   ├── metrics/
│   │   └── MetricsCollector.ts   # Metrics collection & export
│   ├── nestjs-app/               # NestJS application
│   │   ├── main.ts               # Application bootstrap
│   │   ├── self-healing-cache.module.ts
│   │   ├── self-healing-cache.service.ts
│   │   ├── experiments/          # Experiment runner
│   │   ├── users/                # Example API
│   │   └── cache/                # Cache management API
│   ├── types/
│   │   └── index.ts              # TypeScript definitions
│   └── __tests__/                # Unit tests (21 tests)
├── charts/                        # Generated charts
├── experiment_results/            # Experiment data (JSON)
├── docker-compose.yml
├── Dockerfile
├── init.sql                       # MySQL schema
├── run_experiment.sh              # Automated experiment script
├── generate_better_charts.py      # Chart generation (optimized scales)
├── generate_thesis_charts.py      # Thesis charts (real data)
└── README.md
```

---

## 🧪 Testing

### Run Unit Tests

```bash
npm test
```

**Coverage:** 21 tests covering:
- SelfHealingCache (12 tests)
- FailurePredictor (9 tests)

### Run Benchmarks

```bash
npm run benchmark
```

Compares traditional cache vs self-healing cache performance.

---

## 🐳 Docker Deployment

### Full Stack

```bash
# Start all services (Redis + MySQL + App)
docker-compose up

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

### Services

- **Redis**: `localhost:6379` (caching layer)
- **MySQL**: `localhost:3306` (metrics storage)
- **App**: `localhost:3000` (NestJS API)

### Production Build

```bash
# Build image
docker build -t self-healing-cache:latest .

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📈 Visualization

Charts are automatically generated after experiments:

**Key Charts:**
1. `error_reduction_by_scenario.png` - Error count comparison (most visible)
2. `comprehensive_comparison.png` - 4 metrics with optimized scales
3. `improvement_chart_real.png` - Percentage improvements
4. `success_rate_zoomed.png` - Zoomed success rate (95-100% scale)
5. `summary_table_real.png` - Detailed comparison table
6. `recovery_curve_*.png` - Recovery timeline analysis

All charts use real experiment data from `experiment_results/`.

---

## 🔧 Configuration

### Cache Configuration

```typescript
{
  maxSize: 10000,              // Maximum cache entries
  defaultTTL: 300000,          // Default TTL (5 minutes)
  enableML: true,              // Enable ML prediction
  enableAdaptiveRecovery: true, // Enable adaptive strategies
  healthCheckInterval: 10000,  // Health check frequency (10s)
  predictionThreshold: 0.75,   // ML prediction threshold
}
```

### Redis Configuration

```env
REDIS_HOST=localhost
REDIS_PORT=6379
ENABLE_REDIS=true
```

### MySQL Configuration

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=cacheuser
MYSQL_PASSWORD=cachepass
MYSQL_DATABASE=cache_metrics
ENABLE_MYSQL=true
```

---

## 📚 Documentation

- **README.md** (this file) - Overview and quick start
- **EXPERIMENTS.md** - Detailed experiment descriptions
- **NESTJS_GUIDE.md** - Detailed NestJS integration guide
- **EXPERIMENT_GUIDE.md** - How to run and analyze experiments

---

## 🤝 Contributing

This is a research prototype for demonstrating self-healing cache architecture in Node.js applications.

---

## 📄 License

MIT

---

## 🎓 Research Context

This project is part of a diploma thesis on **"Development of Self-Healing Cache Layer Architecture in Node.js Applications"**.

**Key Contributions:**
1. ML-based proactive failure prediction
2. Adaptive recovery strategies
3. Comprehensive experimental validation (8 scenarios)
4. Production-ready NestJS integration

**Status:** ✅ Ready for thesis defense

---

## 📞 Troubleshooting

### Redis Connection Failed

```bash
# Check if Redis is running
docker-compose ps redis

# Restart Redis
docker-compose restart redis

# Test connection
redis-cli ping
```

### MySQL Connection Failed

```bash
# Check if MySQL is running
docker-compose ps mysql

# View MySQL logs
docker-compose logs mysql

# Test connection
mysql -h localhost -u cacheuser -pcachepass cache_metrics
```

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process or change PORT in .env
PORT=3001
```

---

**Version:** 1.0.0
**Status:** Production-ready ✅
**Last Updated:** November 2025
