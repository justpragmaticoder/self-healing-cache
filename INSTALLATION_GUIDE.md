# 📦 Self-Healing Cache Module - Installation Guide

## Overview

The entire self-healing cache functionality is now contained in a **single folder**: `src/self-healing-cache/`

This makes it incredibly easy to:
- ✅ Copy to any NestJS project
- ✅ Understand the module structure
- ✅ Maintain and update
- ✅ Share with other projects

---

## 📁 What's in the Module

```
src/self-healing-cache/          ← Copy this entire folder
├── README.md                    # Complete usage guide
├── index.ts                     # Main exports (import from here!)
├── self-healing-cache.module.ts # NestJS module configuration
├── self-healing-cache.service.ts# Injectable cache service
├── constants.ts                 # Module constants
│
├── core/                        # Core cache logic
│   ├── SelfHealingCache.ts     # Main cache implementation
│   ├── HealthMonitor.ts        # Health monitoring
│   ├── CacheStorage.ts         # Internal storage
│   └── SimpleCache.ts          # Baseline (for experiments)
│
├── ml/                          # Machine learning
│   └── FailurePredictor.ts     # ML-based predictions
│
├── recovery/                    # Recovery strategies
│   └── RecoveryManager.ts      # 5 adaptive strategies
│
├── adapters/                    # Storage adapters
│   ├── StorageAdapter.ts       # Interface
│   ├── RedisAdapter.ts         # Redis implementation
│   ├── MySQLMetricsAdapter.ts  # MySQL metrics
│   └── InMemoryAdapter.ts      # Fallback
│
├── types/                       # TypeScript types
│   └── index.ts
│
└── experiments/                 # Experimental validation (optional)
    └── experiment-runner.service.ts
```

---

## 🚀 Installation Steps

### Step 1: Copy the Module Folder

Copy the **entire** `self-healing-cache` folder into your NestJS project:

```bash
# From your project root
cp -r path/to/self-healing-cache/src/self-healing-cache ./src/
```

Your project structure should look like:

```
your-nestjs-app/
├── src/
│   ├── self-healing-cache/      ← Copied here
│   │   ├── core/
│   │   ├── ml/
│   │   ├── recovery/
│   │   ├── adapters/
│   │   ├── types/
│   │   └── index.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   └── ...
├── package.json
└── ...
```

### Step 2: Install Dependencies

```bash
npm install redis mysql2
```

Or with yarn:

```bash
yarn add redis mysql2
```

### Step 3: Import the Module

In your `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SelfHealingCacheModule } from './self-healing-cache';

@Module({
  imports: [
    // Minimal configuration (uses in-memory storage)
    SelfHealingCacheModule.forRoot(),
    
    // OR with Redis
    SelfHealingCacheModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    
    // OR with full configuration
    SelfHealingCacheModule.forRoot({
      maxSize: 10000,
      defaultTTL: 300000,
      enableML: true,
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
  ],
})
export class AppModule {}
```

### Step 4: Use in Your Services

```typescript
import { Injectable } from '@nestjs/common';
import { SelfHealingCacheService } from './self-healing-cache';

@Injectable()
export class ProductsService {
  constructor(private readonly cache: SelfHealingCacheService) {}

  async getProduct(id: number) {
    const cacheKey = `product:${id}`;
    
    // Try cache
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    
    // Fetch from DB
    const product = await this.db.findProduct(id);
    
    // Cache it
    await this.cache.set(cacheKey, product, 300000);
    
    return product;
  }
}
```

**That's it!** 🎉 The cache is now working in your application.

---

## 📝 Configuration Examples

### 1. Development (In-Memory Only)

```typescript
SelfHealingCacheModule.forRoot({
  enableML: true,
  // No Redis/MySQL - uses in-memory storage
})
```

### 2. Production (Redis + MySQL)

```typescript
SelfHealingCacheModule.forRoot({
  maxSize: 50000,
  defaultTTL: 600000, // 10 minutes
  enableML: true,
  enableAdaptiveRecovery: true,
  
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
  },
  
  mysql: {
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: 'cache_metrics',
  },
})
```

### 3. Async Configuration (Recommended)

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    
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
    }),
  ],
})
```

---

## 🧪 Enable Experiments (Optional)

For research/testing, enable the experiment runner:

```typescript
SelfHealingCacheModule.forRoot({
  redis: { host: 'localhost', port: 6379 },
  enableExperiments: true,  // ← Enables ExperimentRunnerService
})
```

Then inject it:

```typescript
import { ExperimentRunnerService } from './self-healing-cache';

@Injectable()
export class MyService {
  constructor(private readonly experiments: ExperimentRunnerService) {}
  
  async runExperiments() {
    const results = await this.experiments.runFullComparison();
    return results;
  }
}
```

---

## 🔄 Updating the Module

To update the module in your project:

1. **Delete old folder**: `rm -rf src/self-healing-cache`
2. **Copy new folder**: `cp -r path/to/new/self-healing-cache src/`
3. **Rebuild**: `npm run build`

No code changes needed in your app!

---

## 📚 Import Patterns

### Import the Module

```typescript
import { SelfHealingCacheModule } from './self-healing-cache';
```

### Import the Service

```typescript
import { SelfHealingCacheService } from './self-healing-cache';
```

### Import Types

```typescript
import { 
  CacheConfig, 
  HealthMetrics, 
  RecoveryStrategy 
} from './self-healing-cache';
```

### Import Everything

```typescript
import * as SHC from './self-healing-cache';

// Then use:
// SHC.SelfHealingCacheModule
// SHC.SelfHealingCacheService
// etc.
```

---

## ✅ Verification

### 1. Build Check

```bash
npm run build
```

Should compile without errors.

### 2. Runtime Check

```typescript
// In any controller/service
constructor(private readonly cache: SelfHealingCacheService) {}

async test() {
  const health = this.cache.getHealth();
  console.log('Cache health:', health);
}
```

### 3. Health Endpoint

Add a health check:

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

Visit: `http://localhost:3000/health/cache`

---

## 🎯 Benefits of This Structure

### ✅ Self-Contained
- Everything in one folder
- No scattered dependencies
- Easy to understand

### ✅ Portable
- Copy-paste to any project
- No complex setup
- Works immediately

### ✅ Maintainable
- Clear structure
- Logical organization
- Easy to update

### ✅ TypeScript-First
- Full type safety
- IntelliSense support
- Compile-time checking

### ✅ Production-Ready
- Zero-config option
- Full-config option
- Async-config option

---

## 📖 Documentation

See `src/self-healing-cache/README.md` for:
- Complete API reference
- Configuration options
- Usage examples
- Troubleshooting
- Best practices

---

## 🎓 For Diploma/Research

The module includes experimental validation features:

```typescript
// Enable experiments
SelfHealingCacheModule.forRoot({
  enableExperiments: true,
})

// Then use
import { ExperimentRunnerService } from './self-healing-cache';
```

This is optional and can be disabled in production.

---

## 🤝 Support

For detailed usage, see:
- `src/self-healing-cache/README.md` - Complete guide
- `ARCHITECTURE.md` - System design
- `CACHE_MODULE_README.md` - Advanced features

---

## Summary

**Installation is now just 3 steps:**

1. Copy `self-healing-cache` folder → `src/`
2. Install dependencies → `npm install redis mysql2`
3. Import module → `import { SelfHealingCacheModule } from './self-healing-cache'`

**Everything is in one place!** 🚀

