# Self-Healing Cache Layer for Node.js Applications

**Research Topic:** Development of Self-Healing Cache Layer Architecture in Node.js Applications

Intelligent cache with ML-based failure prediction and adaptive recovery strategies for NestJS.

## 🎯 Scientific Novelty

### 1. ML-Based Failure Prediction
- Real-time metrics analysis (error rate, hit rate, response time)
- Online learning with gradient descent
- Prediction of failure probability and time to failure

### 2. Adaptive Recovery Strategies
5 dynamic strategies: IMMEDIATE_REFRESH, GRADUAL_REFRESH, CIRCUIT_BREAKER, FALLBACK, ADAPTIVE

### 3. Proactive Self-Healing
Automatic degradation detection and preventive recovery

### 4. Distributed Architecture
Redis + MySQL + In-memory fallback

## 🚀 Quick Start

### ⚡ Run Everything with One Command (Full Experiment)

```bash
npm run experiment
```

This command automatically:
- ✅ Starts Docker (Redis + MySQL)
- ✅ Builds the application
- ✅ Starts NestJS server
- ✅ Runs baseline experiment (100 requests)
- ✅ Runs self-healing experiment (100 requests + failure simulation)
- ✅ Shows results and comparison
- ✅ Exports data to `experiment_results/`

### Manual Start

```bash
# Local
npm install
npm run build
npm run start:dev

# With Docker (full stack)
docker-compose up
```

**API:** http://localhost:3000

## 📡 Main Endpoints

```bash
GET  /api/cache/health              # Cache health status
GET  /api/cache/health/detailed     # Detailed health (cache + Redis + MySQL)
GET  /api/cache/stats               # Statistics
GET  /api/users/:id                 # User (with caching)
POST /api/cache/heal                # Trigger recovery
GET  /api/experiments               # Analytics
```

## 💻 Usage in NestJS

```typescript
@Module({
  imports: [
    SelfHealingCacheModule.forRoot({
      enableML: true,
      enableAdaptiveRecovery: true,
      redis: { host: 'localhost', port: 6379 },
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

```typescript
@Injectable()
export class ProductsService {
  constructor(private readonly cache: SelfHealingCacheService) {}

  async getProduct(id: string): Promise<Product> {
    const cached = await this.cache.get(`product:${id}`);
    if (cached) return cached;

    const product = await this.db.findProduct(id);
    await this.cache.set(`product:${id}`, product);
    return product;
  }
}
```

## 🧪 Testing

```bash
npm test           # 21 unit tests
npm run demo       # Scientific novelty demonstration
npm run benchmark  # Comparison with traditional cache
```

## 📊 Benchmark Results

| Metric | Traditional | Self-Healing | Improvement |
|--------|-------------|--------------|-------------|
| Success Rate | 99.40% | 99.60% | +0.20% |
| Response Time | 1.19ms | 1.16ms | +2.36% |
| Throughput | 843 req/s | 864 req/s | +2.51% |

## 🗂️ Project Structure

```
src/
├── core/          # SelfHealingCache, HealthMonitor
├── ml/            # FailurePredictor (ML)
├── recovery/      # RecoveryManager (5 strategies)
├── adapters/      # Redis, MySQL, InMemory
├── examples/
│   └── nestjs-app/  # Full NestJS application
└── __tests__/     # 21 unit tests
```

## 🐳 Docker

```bash
docker-compose up      # Redis + MySQL + App
docker-compose logs -f # Logs
docker-compose down    # Stop
```

## 📚 Documentation

- **README.md** - this file
- **NESTJS_GUIDE.md** - detailed guide
- **init.sql** - MySQL schema

## 🔧 Configuration

`.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
ENABLE_REDIS=true

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=cacheuser
MYSQL_PASSWORD=cachepass
MYSQL_DATABASE=cache_metrics
ENABLE_MYSQL=true
```

## 📄 License

MIT

---

**Version:** 1.0.0 | **Status:** Production-ready ✅
