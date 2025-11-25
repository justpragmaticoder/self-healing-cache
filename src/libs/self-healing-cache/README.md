# Self-Healing Cache Module for NestJS

**A drop-in, production-ready cache layer with ML-powered failure prediction and adaptive recovery.**

---

## 🚀 Quick Installation

### Step 1: Copy This Folder

Copy the entire `self-healing-cache` folder into your NestJS project's `src` directory:

```
your-nestjs-app/
├── src/
│   ├── self-healing-cache/    ← Copy this entire folder here
│   │   ├── core/
│   │   ├── ml/
│   │   ├── recovery/
│   │   ├── adapters/
│   │   ├── types/
│   │   ├── index.ts
│   │   ├── self-healing-cache.module.ts
│   │   └── self-healing-cache.service.ts
│   ├── app.module.ts
│   └── ...
```

### Step 2: Install Dependencies

```bash
npm install redis mysql2
```

### Step 3: Import the Module

In your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SelfHealingCacheModule } from './self-healing-cache';

@Module({
  imports: [
    SelfHealingCacheModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
      enableML: true,
    }),
  ],
})
export class AppModule {}
```

**That's it!** The cache is now available throughout your application.

---

## 💡 Basic Usage

### Inject the Service

```typescript
import { Injectable } from '@nestjs/common';
import { SelfHealingCacheService } from './self-healing-cache';

@Injectable()
export class ProductsService {
  constructor(private readonly cache: SelfHealingCacheService) {}

  async getProduct(id: number) {
    const cacheKey = `product:${id}`;
    
    // Try cache first
    const cached = await this.cache.get<Product>(cacheKey);
    if (cached) return cached;
    
    // Cache miss - fetch from database
    const product = await this.database.findProduct(id);
    
    // Store in cache (5 minute TTL)
    await this.cache.set(cacheKey, product, 300000);
    
    return product;
  }
}
```

### Automatic Refresh (Recommended)

```typescript
import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    private readonly cache: SelfHealingCacheService,
    private readonly database: DatabaseService,
  ) {}

  onModuleInit() {
    // Configure automatic data refresh
    this.cache.setDataRefreshFunction(async (key: string) => {
      if (key.startsWith('product:')) {
        const id = key.split(':')[1];
        return await this.database.findProduct(id);
      }
    });
  }

  async getProduct(id: number) {
    // Now cache.get() automatically retries and recovers from failures!
    return await this.cache.get<Product>(`product:${id}`);
  }
}
```

---

## ⚙️ Configuration Options

### Basic Configuration

```typescript
SelfHealingCacheModule.forRoot({
  // Cache settings
  maxSize: 10000,              // Maximum cache entries (default: 10000)
  defaultTTL: 300000,          // Default TTL in ms (default: 5 min)
  healthCheckInterval: 10000,  // Health check frequency (default: 10 sec)
  
  // ML & Recovery
  enableML: true,              // Enable ML predictions (default: true)
  enableAdaptiveRecovery: true,// Enable recovery strategies (default: true)
  predictionThreshold: 0.75,   // ML threshold 0-1 (default: 0.75)
  
  // Storage (optional)
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'your-password',
  },
})
```

### With MySQL Metrics (Optional)

```typescript
SelfHealingCacheModule.forRoot({
  redis: { host: 'localhost', port: 6379 },
  
  // Optional: Persist metrics to MySQL
  mysql: {
    host: 'localhost',
    port: 3306,
    user: 'cacheuser',
    password: 'cachepass',
    database: 'cache_metrics',
  },
})
```

### Async Configuration

```typescript
import { ConfigService } from '@nestjs/config';

SelfHealingCacheModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    redis: {
      host: config.get('REDIS_HOST'),
      port: config.get<number>('REDIS_PORT'),
    },
    enableML: config.get('ENABLE_ML') === 'true',
  }),
})
```

---

## 📚 API Reference

### SelfHealingCacheService

#### `get<T>(key: string): Promise<T | undefined>`
Get value from cache with automatic retry on failure.

```typescript
const user = await this.cache.get<User>('user:123');
```

#### `set<T>(key: string, value: T, ttl?: number): Promise<void>`
Store value in cache with optional TTL.

```typescript
await this.cache.set('user:123', userData, 600000); // 10 min TTL
```

#### `delete(key: string): Promise<void>`
Remove value from cache.

```typescript
await this.cache.delete('user:123');
```

#### `clear(): void`
Clear all cache entries.

```typescript
this.cache.clear();
```

#### `getHealth()`
Get current cache health status.

```typescript
const health = this.cache.getHealth();
console.log(health.state); // 'healthy', 'degraded', 'critical'
console.log(health.metrics.hitRate);
console.log(health.metrics.errorRate);
```

#### `getStats()`
Get comprehensive cache statistics.

```typescript
const stats = this.cache.getStats();
console.log(stats.cacheStats.hits);
console.log(stats.mlStats.predictions);
console.log(stats.recoveryStats.successRate);
```

---

## 🎯 Features

### ✨ ML-Powered Failure Prediction
- Predicts cache failures before they happen
- Online learning with gradient descent
- Proactive recovery triggering

### 🔄 Adaptive Recovery Strategies
- **IMMEDIATE_REFRESH**: Fast recovery for moderate issues
- **GRADUAL_REFRESH**: Careful recovery for sensitive systems
- **CIRCUIT_BREAKER**: Protection from cascading failures
- **FALLBACK**: Recovery from data corruption
- **ADAPTIVE**: Intelligent strategy selection

### 🏥 Health Monitoring
- Real-time metrics tracking
- Hit rate, error rate, response times
- Automatic state detection (healthy, degraded, critical)

### 📊 Multi-Tier Storage
- **Redis**: Primary cache (high performance)
- **MySQL**: Metrics persistence (optional)
- **In-memory**: Automatic fallback

### 🛡️ Production Features
- Automatic retry with exponential backoff
- Circuit breaker pattern
- Graceful degradation
- Zero downtime transitions

---

## 📂 Module Structure

```
self-healing-cache/
├── index.ts                   # Main exports
├── self-healing-cache.module.ts   # NestJS module
├── self-healing-cache.service.ts  # Injectable service
├── constants.ts               # Module constants
├── core/                      # Core cache logic
│   ├── SelfHealingCache.ts   # Main cache implementation
│   ├── HealthMonitor.ts      # Health monitoring
│   ├── CacheStorage.ts       # Internal storage
│   └── SimpleCache.ts        # Baseline (for comparison)
├── ml/                        # Machine learning
│   └── FailurePredictor.ts   # ML predictions
├── recovery/                  # Recovery strategies
│   └── RecoveryManager.ts    # Recovery logic
├── adapters/                  # Storage adapters
│   ├── StorageAdapter.ts     # Interface
│   ├── RedisAdapter.ts       # Redis implementation
│   ├── MySQLMetricsAdapter.ts # MySQL metrics
│   └── InMemoryAdapter.ts    # In-memory fallback
└── types/                     # TypeScript types
    └── index.ts
```

---

## 🔧 Troubleshooting

### Cache not working?

Check health status:
```typescript
const health = this.cache.getHealth();
console.log(health);
```

### High error rate?

Adjust ML threshold:
```typescript
SelfHealingCacheModule.forRoot({
  predictionThreshold: 0.5, // More aggressive (default: 0.75)
})
```

### Need to disable ML temporarily?

```typescript
SelfHealingCacheModule.forRoot({
  enableML: false,           // Disable ML
  enableAdaptiveRecovery: true, // Keep retry logic
})
```

---

## 📊 Performance Benefits

**Typical improvements:**
- ⚡ 100x faster response times (cache hits vs database)
- 📉 90%+ error reduction vs traditional caching
- 🛡️ Automatic recovery from failures
- 📈 Predictive maintenance via ML

---

## 🎓 Scientific Background

This module is based on research in:
- ML-powered failure prediction in distributed systems
- Adaptive recovery strategies for cache layers
- Multi-tier graceful degradation architectures

**For academic use**: See full thesis documentation in the parent project.

---

## 📝 License

MIT

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the full documentation in the parent project
3. Open an issue on GitHub

---

**That's all you need to know!** 🚀

The module is self-contained and ready to use. Just copy, import, and start caching with ML-powered self-healing capabilities.

