import { Controller, Get, Param, ParseIntPipe, Logger, OnModuleInit } from '@nestjs/common';
import { UsersService, User } from './users.service';
import { SelfHealingCacheService } from '../self-healing-cache.service';

@Controller('users')
export class UsersController implements OnModuleInit {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly cacheService: SelfHealingCacheService,
  ) {}

  onModuleInit() {
    // Set data refresh function for users
    this.cacheService.setDataRefreshFunction(async (key: string) => {
      if (key.startsWith('user:')) {
        const id = parseInt(key.split(':')[1]);
        this.logger.debug(`[Cache Miss] Fetching user ${id} from database`);
        return await this.usersService.findOne(id);
      }
      return undefined;
    });
  }

  @Get()
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    const cacheKey = `user:${id}`;

    // Try to get from cache
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      this.logger.debug(`[Cache Hit] User ${id}`);
      return cached as User;
    }

    // Cache miss - fetch from database
    this.logger.debug(`[Cache Miss] User ${id}`);
    const user = await this.usersService.findOne(id);

    // Store in cache
    this.cacheService.set(cacheKey, user);

    return user;
  }
}
