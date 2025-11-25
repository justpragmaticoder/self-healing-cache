# Self-Healing Cache Module for NestJS

A production-ready, drop-in cache layer with ML-powered failure prediction and adaptive recovery strategies for NestJS applications.

## Features

✨ **ML-Powered Predictions** - Predicts cache failures before they happen  
🔄 **Adaptive Recovery** - 5 intelligent recovery strategies  
🏥 **Health Monitoring** - Real-time metrics and diagnostics  
📊 **Multi-Tier Storage** - Redis + MySQL + In-memory fallback  
🛡️ **Circuit Breaker** - Automatic protection from cascading failures  
⚡ **Zero Config** - Works out of the box with sensible defaults  
🔌 **Drop-In Ready** - Add to any NestJS app in minutes  

---

## Installation

```bash
npm install redis mysql2
```

---

## Quick Start

### 1. Basic Setup (In-Memory Only)

```typescript
import { Module } from '@nestjs/common';
import { SelfHealingCacheModule } from './self-healing-cache.module';

@Module({
  imports: [
    SelfHealingCacheModule.forRoot(),
  ],
})
export class AppModule {}
```

### 2. With Redis

```typescript
SelfHealingCacheModule.forRoot({
  redis: {
    host: 'localhost',
    port: 6379,
  },
})
```

### 3. Full Configuration

```typescript
SelfHealingCacheModule.forRoot({
  // Cache settings
  maxSize: 10000,
  defaultTTL: 300000, // 5 minutes
  healthCheckInterval: 10000, // 10 seconds
  
  // ML & Recovery
  enableML: true,
  enableAdaptiveRecovery: true,
  predictionThreshold: 0.75,
  
  // Storage
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
  },
  
  // Metrics (optional)
  mysql: {
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  },
})
```

---

## Usage in Your Application

### Inject the Service

```typescript
import { Injectable } from '@nestjs/common';
import { SelfHealingCacheService } from './self-healing-cache.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly cache: SelfHealingCacheService,
    private readonly database: DatabaseService,
  ) {}

  async findOne(id: number) {
    const cacheKey = `product:${id}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    
    // Cache miss - fetch from database
    const product = await this.database.findProduct(id);
    
    // Store in cache for next time
    await this.cache.set(cacheKey, product, 300000); // 5 min TTL
    
    return product;
  }
}
```

### Set Data Refresh Function (Automatic Recovery)

```typescript
import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    private readonly cache: SelfHealingCacheService,
    private readonly database: DatabaseService,
  ) {}

  onModuleInit() {
    // Configure automatic data refresh on cache miss
    this.cache.setDataRefreshFunction(async (key: string) => {
      if (key.startsWith('product:')) {
        const id = key.split(':')[1];
        return await this.database.findProduct(id);
      }
    });
  }

  async findOne(id: number) {
    // Now cache.get() will automatically fetch from DB on miss!
    return await this.cache.get(`product:${id}`);
  }
}
```

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxSize` | number | 10000 | Maximum cache entries |
| `defaultTTL` | number | 300000 | Default TTL in milliseconds |
| `healthCheckInterval` | number | 10000 | Health check frequency |
| `predictionThreshold` | number | 0.75 | ML prediction threshold (0-1) |
| `enableML` | boolean | true | Enable ML predictions |
| `enableAdaptiveRecovery` | boolean | true | Enable recovery strategies |
| `redis` | RedisConfig | undefined | Redis configuration |
| `mysql` | MySQLConfig | undefined | MySQL configuration |
| `enableExperiments` | boolean | false | Enable experiment runner |

---

## Async Configuration

Use `forRootAsync()` to inject ConfigService or other providers:

```typescript
SelfHealingCacheModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    redis: {
      host: config.get('REDIS_HOST'),
      port: config.get<number>('REDIS_PORT'),
    },
    enableML: config.get('ENABLE_ML') === 'true',
    defaultTTL: config.get<number>('CACHE_TTL', 300000),
  }),
})
```

---

## API Reference

### SelfHealingCacheService

#### `get<T>(key: string): Promise<T | undefined>`
Get value from cache with automatic retry on failure.

#### `set<T>(key: string, value: T, ttl?: number): Promise<void>`
Store value in cache with optional TTL.

#### `delete(key: string): Promise<void>`
Remove value from cache.

#### `clear(): void`
Clear all cache entries.

#### `getHealth(): CacheHealth`
Get current cache health status.

#### `getStats(): CacheStats`
Get comprehensive cache statistics.

#### `setDataRefreshFunction(fn: (key: string) => Promise<T>): void`
Set function to automatically refresh cache on miss.

---

## Recovery Strategies

The cache automatically selects the best recovery strategy based on system state:

1. **IMMEDIATE_REFRESH** - Fast aggressive refresh for moderate issues
2. **GRADUAL_REFRESH** - Slow careful refresh for sensitive systems  
3. **CIRCUIT_BREAKER** - Temporary halt for critical failures
4. **FALLBACK** - Clear and rebuild for data corruption
5. **ADAPTIVE** - Intelligent selection based on metrics

---

## Health Monitoring

### Get Health Status

```typescript
const health = this.cache.getHealth();

console.log(health.state); // 'healthy', 'degraded', 'critical', 'recovering'
console.log(health.metrics.hitRate);
console.log(health.metrics.errorRate);
console.log(health.metrics.avgResponseTime);
```

### Get Statistics

```typescript
const stats = this.cache.getStats();

console.log(stats.cacheStats.hits);
console.log(stats.cacheStats.hitRate);
console.log(stats.mlStats.predictions);
console.log(stats.recoveryStats.successRate);
```

---

## Production Best Practices

### 1. Use Redis for Distributed Caching

```typescript
SelfHealingCacheModule.forRoot({
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  },
})
```

### 2. Enable Metrics Persistence

```typescript
SelfHealingCacheModule.forRoot({
  mysql: {
    host: process.env.MYSQL_HOST,
    // ... config
  },
})
```

### 3. Tune ML Threshold

- **Conservative (0.8-0.9)**: Fewer false positives, may miss some failures
- **Balanced (0.6-0.7)**: Good balance (recommended)
- **Aggressive (0.4-0.5)**: Catches more failures, more false positives

```typescript
SelfHealingCacheModule.forRoot({
  predictionThreshold: 0.6, // Recommended
})
```

### 4. Set Appropriate TTLs

```typescript
// Short-lived data
await cache.set('session:123', data, 900000); // 15 min

// Long-lived data
await cache.set('product:456', data, 3600000); // 1 hour
```

### 5. Monitor Health in Production

```typescript
@Controller('health')
export class HealthController {
  constructor(private readonly cache: SelfHealingCacheService) {}

  @Get('cache')
  getCacheHealth() {
    return this.cache.getHealth();
  }
}
```

---

## Performance Benefits

**Typical Results**:
- 🚀 **100x faster** response times (cache hits)
- 📉 **90%+ error reduction** vs no retry
- 🛡️ **Automatic recovery** from failures
- 📊 **Predictive maintenance** via ML

**Example**:
```
Without Cache:
- Response: 100ms (database query)
- Error rate: 10% (database timeouts)

With Self-Healing Cache:
- Response: <1ms (cache hit)
- Error rate: <1% (automatic retry + recovery)
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Your NestJS Application                 │
│  ┌───────────────────────────────────────┐     │
│  │    SelfHealingCacheService            │     │
│  │                                        │     │
│  │  ┌──────┐  ┌──────┐  ┌──────┐        │     │
│  │  │Health│  │  ML  │  │Recov.│        │     │
│  │  │Monitor│  │Pred. │  │Mgr.  │        │     │
│  │  └──────┘  └──────┘  └──────┘        │     │
│  └────┬──────────────────────────┬───────┘     │
│       │                          │             │
│  ┌────▼────┐              ┌──────▼──────┐      │
│  │  Redis  │              │   MySQL     │      │
│  │ (Cache) │              │ (Metrics)   │      │
│  └─────────┘              └─────────────┘      │
└─────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Cache not working?

```typescript
// Check health
const health = this.cache.getHealth();
console.log(health);

// Check if Redis is connected
const stats = this.cache.getStats();
console.log(stats.storage); // Shows storage type
```

### High error rate?

```typescript
// Lower prediction threshold
SelfHealingCacheModule.forRoot({
  predictionThreshold: 0.5, // More aggressive
})
```

### Need to disable ML temporarily?

```typescript
SelfHealingCacheModule.forRoot({
  enableML: false,
  enableAdaptiveRecovery: true, // Keep retry logic
})
```

---

## License

MIT

---

## Contributing

This module is part of a research project on self-healing distributed systems. Contributions welcome!

---

## Support

For issues and questions, please open a GitHub issue or contact the maintainers.

