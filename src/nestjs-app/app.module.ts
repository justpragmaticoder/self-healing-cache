import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SelfHealingCacheModule } from '../libs/self-healing-cache';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { CacheController, ExperimentsController, MLController } from './cache/cache.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    SelfHealingCacheModule.forRoot({
      // Cache configuration
      maxSize: 10000,
      defaultTTL: 300000, // 5 minutes
      healthCheckInterval: 10000, // 10 seconds

      // ML & Recovery features
      enableML: true,
      enableAdaptiveRecovery: true,
      predictionThreshold: 0.6,

      // Enable experiments for this demo application
      enableExperiments: true,

      // Storage adapters (optional - falls back to in-memory)
      redis: process.env.ENABLE_REDIS === 'true' ? {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      } : undefined,

      // Metrics persistence (optional)
      mysql: process.env.ENABLE_MYSQL === 'true' ? {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER || 'cacheuser',
        password: process.env.MYSQL_PASSWORD || 'cachepass',
        database: process.env.MYSQL_DATABASE || 'cache_metrics',
      } : undefined,
    }),
    UsersModule,
  ],
  controllers: [CacheController, ExperimentsController, MLController],
})
export class AppModule {}
