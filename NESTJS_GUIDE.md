# Self-Healing Cache Layer for NestJS

Development of Self-Healing Cache Layer Architecture in Node.js Applications

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  NestJS Application                         │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │  Controllers   │──│   Services       │──│  Database  │  │
│  └────────┬───────┘  └──────────────────┘  └────────────┘  │
│           │                                                   │
│   ┌───────▼──────────────────────────────────────┐          │
│   │    Self-Healing Cache Module                 │          │
│   │  ┌──────────────────────────────────────┐   │          │
│   │  │  Cache Service                       │   │          │
│   │  │  - ML Prediction                     │   │          │
│   │  │  - Adaptive Recovery                 │   │          │
│   │  │  - Health Monitoring                 │   │          │
│   │  └────┬─────────────────────────────┬───┘   │          │
│   └───────┼─────────────────────────────┼───────┘          │
│           │                             │                    │
│      ┌────▼──────┐               ┌──────▼─────┐            │
│      │   Redis   │               │   MySQL    │            │
│      │ (Storage) │               │ (Metrics)  │            │
│      └───────────┘               └────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

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

## Run with Docker

### Full Stack (Redis + MySQL + App)

```bash
docker-compose up
```

This will start:
- **Redis** on port 6379 (caching)
- **MySQL** on port 3306 (metrics)
- **NestJS App** on port 3000

### Databases Only

```bash
docker-compose up redis mysql
```

Then start the application locally:

```bash
npm run start:dev
```

## Run Locally (without Docker)

### 1. Start Redis and MySQL Locally

```bash
# Redis
redis-server

# MySQL
mysql -u root -p
CREATE DATABASE cache_metrics;
CREATE USER 'cacheuser'@'localhost' IDENTIFIED BY 'cachepass';
GRANT ALL PRIVILEGES ON cache_metrics.* TO 'cacheuser'@'localhost';
SOURCE init.sql;
```

### 2. Start the Application

```bash
npm run start:dev
```

## API Endpoints

### Cache Management

```bash
# Статус здоров'я кешу
GET http://localhost:3000/api/cache/health

# Статистика кешу
GET http://localhost:3000/api/cache/stats

# Тригер само-відновлення
POST http://localhost:3000/api/cache/heal

# Очистити кеш
DELETE http://localhost:3000/api/cache
```

### Users API (з кешуванням)

```bash
# Отримати всіх користувачів
GET http://localhost:3000/api/users

# Отримати користувача по ID (з авто-кешуванням)
GET http://localhost:3000/api/users/1
```

### Experiments and ML

```bash
# All experiments
GET http://localhost:3000/api/experiments

# Compare experiments
GET http://localhost:3000/api/experiments/compare/baseline/comparison

# ML training data
GET http://localhost:3000/api/ml/training-data?limit=100
```

## Usage in Code

### 1. Add Module to AppModule

```typescript
import { SelfHealingCacheModule } from './self-healing-cache.module';

@Module({
  imports: [
    SelfHealingCacheModule.forRoot({
      maxSize: 10000,
      defaultTTL: 300000, // 5 хвилин
      enableML: true,
      enableAdaptiveRecovery: true,
      redis: {
        host: 'localhost',
        port: 6379,
      },
      mysql: {
        host: 'localhost',
        port: 3306,
        user: 'cacheuser',
        password: 'cachepass',
        database: 'cache_metrics',
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Use in Controller

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { SelfHealingCacheService } from './self-healing-cache.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly cacheService: SelfHealingCacheService) {
    // Configure data refresh function
    this.cacheService.setDataRefreshFunction(async (key: string) => {
      const id = key.split(':')[1];
      return await this.fetchProductFromDB(id);
    });
  }

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    const cacheKey = `product:${id}`;

    // Try to get from cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache - load
    const product = await this.fetchProductFromDB(id);

    // Save to cache
    await this.cacheService.set(cacheKey, product);

    return product;
  }
}
```

### 3. Use in Service

```typescript
import { Injectable } from '@nestjs/common';
import { SelfHealingCacheService } from './self-healing-cache.service';

@Injectable()
export class ProductsService {
  constructor(private readonly cache: SelfHealingCacheService) {}

  async findOne(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;

    // Automatic caching with data refresh function
    return await this.cache.get<Product>(cacheKey);
  }
}
```

## Scientific Novelty

### 1. ML-Based Failure Prediction

```typescript
// Automatic analytics
const stats = await cacheService.getStats();

console.log('ML Model:', stats.mlStats);
// {
//   dataPoints: 150,
//   weights: [0.298, 0.253, 0.195, ...]
// }
```

### 2. Adaptive Recovery Strategies

5 recovery strategies:
- **IMMEDIATE_REFRESH** - immediate refresh on critical failures
- **GRADUAL_REFRESH** - gradual refresh under load
- **CIRCUIT_BREAKER** - temporary shutdown on critical errors
- **FALLBACK** - delayed refresh
- **ADAPTIVE** - dynamic selection based on ML

### 3. Proactive Self-Healing

```typescript
// Automatic recovery every 10 seconds
// Triggered when state changes to DEGRADED or CRITICAL

// Manual trigger
await cacheService.triggerHealing();
```

### 4. Research Metrics

```typescript
const health = await cacheService.getHealth();

console.log({
  state: health.state, // HEALTHY | DEGRADED | CRITICAL
  hitRate: health.metrics.hitRate,
  errorRate: health.metrics.errorRate,
  avgResponseTime: health.metrics.avgResponseTime,
  mtbf: stats.recoveryStats.mtbf,
  mttr: stats.recoveryStats.mttr
});
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Start full stack
docker-compose up

# In another terminal - test requests
curl http://localhost:3000/api/users/1
curl http://localhost:3000/api/cache/stats
```

### Benchmark

```bash
npm run benchmark
```

## Export Data for Research

### Metrics from MySQL

```sql
-- Health metrics statistics
SELECT
  AVG(hit_rate) as avg_hit_rate,
  AVG(error_rate) as avg_error_rate,
  AVG(avg_response_time) as avg_response_time
FROM health_metrics
WHERE created_at > NOW() - INTERVAL 1 HOUR;

-- Recovery actions effectiveness
SELECT
  strategy,
  COUNT(*) as total,
  AVG(success) as success_rate,
  AVG(duration) as avg_duration,
  AVG(error_rate_before - error_rate_after) as improvement
FROM recovery_actions
GROUP BY strategy;
```

### API Export

```bash
# Export all experiments
curl http://localhost:3000/api/experiments > experiments.json

# ML data
curl http://localhost:3000/api/ml/training-data?limit=1000 > ml_data.json
```

## Project Structure

```
src/nestjs-app/
├── main.ts                              # Bootstrap
├── app.module.ts                        # Main module
├── self-healing-cache.module.ts         # Cache module
├── self-healing-cache.service.ts        # Cache service
├── constants.ts                         # Constants
├── decorators/
│   └── cache.decorator.ts               # @Cacheable decorator
├── experiments/
│   └── experiment-runner.service.ts     # Experiment runner
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts              # REST API
│   └── users.service.ts                 # Business logic
└── cache/
    └── cache.controller.ts              # Cache management API
```

## Troubleshooting

### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping
# Response: PONG

# Or start via Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### MySQL Connection Failed

```bash
# Check connection
mysql -h localhost -u cacheuser -pcachepass cache_metrics

# Or start via Docker
docker-compose up mysql
```

### Application Uses In-Memory Storage

Make sure `ENABLE_REDIS=true` in `.env` and Redis is running.

## Production Deployment

### 1. Build Image

```bash
docker build -t self-healing-cache:latest .
```

### 2. Run with Production Settings

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Monitoring

```bash
# Health check
curl http://your-domain.com/api/cache/health

# Metrics
curl http://your-domain.com/api/cache/stats
```

## Future Development

- [ ] Add Swagger documentation
- [ ] Implement GraphQL API
- [ ] Add Prometheus metrics
- [ ] Implement distributed caching (multi-instance)
- [ ] Add Admin dashboard
- [ ] WebSocket for real-time metrics

## License

MIT

## Author

Scientific prototype for demonstrating self-healing cache layer architecture in Node.js applications.
