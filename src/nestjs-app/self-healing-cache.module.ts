import { Module, Global, DynamicModule } from '@nestjs/common';
import { SelfHealingCacheService } from './self-healing-cache.service';
import { ExperimentRunnerService } from './experiments/experiment-runner.service';
import { SELF_HEALING_CACHE_OPTIONS } from './constants';
import { CacheConfig } from '../../types';

export interface SelfHealingCacheModuleOptions extends Partial<CacheConfig> {
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  mysql?: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
}

@Global()
@Module({})
export class SelfHealingCacheModule {
  static forRoot(options: SelfHealingCacheModuleOptions): DynamicModule {
    return {
      module: SelfHealingCacheModule,
      providers: [
        {
          provide: SELF_HEALING_CACHE_OPTIONS,
          useValue: options,
        },
        SelfHealingCacheService,
        ExperimentRunnerService,
      ],
      exports: [SelfHealingCacheService, ExperimentRunnerService],
    };
  }
}
