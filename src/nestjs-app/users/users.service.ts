import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import mysql from 'mysql2/promise';

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

  constructor(private readonly db: DatabaseService) {}

  async findOne(id: number): Promise<User> {
    // Simulate database delay (realistic network latency)
    await this.sleep(50 + Math.random() * 50);

    // Simulate random database failures (10% chance) - this is what cache protects against!
    if (Math.random() < 0.1) {
      this.logger.warn(`💥 Simulated database timeout for user ${id}`);
      throw new Error('Database connection timeout');
    }

    if (this.db.isConnected()) {
      try {
        const rows = await this.db.query<mysql.RowDataPacket[]>(
          'SELECT id, name, email, role, created_at as createdAt FROM users WHERE id = ?',
          [id]
        );

        if (rows.length === 0) {
          throw new NotFoundException(`User with ID ${id} not found`);
        }

        const user = rows[0] as User;
        this.logger.debug(`📊 Fetched user ${id} from MySQL database`);
        return {
          ...user,
          createdAt: new Date(user.createdAt).toISOString(),
        };
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        this.logger.error(`Database error for user ${id}:`, error);
        throw new Error('Database query failed');
      }
    } else {
      // Fallback to in-memory data when MySQL is not available
      return this.findOneInMemory(id);
    }
  }

  async findAll(): Promise<User[]> {
    await this.sleep(100);

    if (this.db.isConnected()) {
      try {
        const rows = await this.db.query<mysql.RowDataPacket[]>(
          'SELECT id, name, email, role, created_at as createdAt FROM users ORDER BY id LIMIT 100'
        );

        return rows.map((row) => ({
          ...row,
          createdAt: new Date(row.createdAt).toISOString(),
        })) as User[];
      } catch (error) {
        this.logger.error('Database error fetching all users:', error);
        return this.findAllInMemory();
      }
    } else {
      return this.findAllInMemory();
    }
  }

  // Fallback in-memory implementation when MySQL is unavailable
  private findOneInMemory(id: number): User {
    if (id < 1 || id > 100) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    this.logger.debug(`📝 Fetched user ${id} from in-memory fallback`);
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      role: id % 3 === 0 ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    };
  }

  private findAllInMemory(): User[] {
    const users: User[] = [];
    for (let i = 1; i <= 100; i++) {
      users.push({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: i % 3 === 0 ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
      });
    }
    return users;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
