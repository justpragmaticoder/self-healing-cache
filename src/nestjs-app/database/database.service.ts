import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: mysql.Pool | null = null;
  private connected = false;

  async onModuleInit() {
    const mysqlEnabled = process.env.ENABLE_MYSQL === 'true';

    if (!mysqlEnabled) {
      this.logger.log('MySQL is disabled');
      return;
    }

    try {
      this.pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER || 'cacheuser',
        password: process.env.MYSQL_PASSWORD || 'cachepass',
        database: process.env.MYSQL_DATABASE || 'cache_metrics',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      // Test connection
      const connection = await this.pool.getConnection();
      connection.release();
      this.connected = true;
      this.logger.log('✓ Database connected successfully');
    } catch (error) {
      this.logger.warn('⚠ MySQL connection failed');
      this.connected = false;
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Database connection closed');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getPool(): mysql.Pool | null {
    return this.pool;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const [rows] = await this.pool.query(sql, params);
    return rows as T;
  }

  async execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const [result] = await this.pool.execute(sql, params);
    return result as mysql.ResultSetHeader;
  }
}

