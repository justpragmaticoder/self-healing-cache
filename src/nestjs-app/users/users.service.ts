import { Injectable, NotFoundException, Logger } from '@nestjs/common';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private users: Map<number, User> = new Map();

  constructor() {
    // Initialize with test data
    for (let i = 1; i <= 100; i++) {
      this.users.set(i, {
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: i % 3 === 0 ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
      });
    }
    this.logger.log('Users service initialized with 100 test users');
  }

  async findOne(id: number): Promise<User> {
    // Simulate database delay
    await this.sleep(50 + Math.random() * 50);

    // Simulate random failures (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('Database connection timeout');
    }

    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.debug(`Fetched user ${id} from database`);
    return user;
  }

  async findAll(): Promise<User[]> {
    await this.sleep(100);
    return Array.from(this.users.values());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
