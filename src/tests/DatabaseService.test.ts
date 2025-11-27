import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../nestjs-app/database/database.service';
import * as mysql from 'mysql2/promise';

jest.mock('mysql2/promise');

describe('DatabaseService', () => {
  let service: DatabaseService;
  let mockPool: any;

  beforeEach(async () => {
    mockPool = {
      query: jest.fn(),
      execute: jest.fn(),
      end: jest.fn(),
      getConnection: jest.fn().mockResolvedValue({
        release: jest.fn(),
      }),
    };

    (mysql.createPool as jest.Mock).mockReturnValue(mockPool);

    // Set ENABLE_MYSQL environment variable to true
    process.env.ENABLE_MYSQL = 'true';

    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);

    // Manually call onModuleInit to initialize the connection
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('query', () => {
    it('should execute a query', async () => {
      const mockResult = [{ id: 1, name: 'Test' }];
      mockPool.query.mockResolvedValue([mockResult]);

      const result = await service.query('SELECT * FROM users');

      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users', undefined);
    });

    it('should execute a query with parameters', async () => {
      const mockResult = [{ id: 1, name: 'Test' }];
      mockPool.query.mockResolvedValue([mockResult]);

      const result = await service.query('SELECT * FROM users WHERE id = ?', [1]);

      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
    });

    it('should handle query errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Query failed'));

      await expect(service.query('INVALID SQL')).rejects.toThrow('Query failed');
    });

    it('should handle empty results', async () => {
      mockPool.query.mockResolvedValue([[]]);

      const result = await service.query('SELECT * FROM users WHERE id = 999');

      expect(result).toEqual([]);
    });
  });

  describe('execute', () => {
    it('should execute a statement', async () => {
      const mockResult = { affectedRows: 1, insertId: 5 };
      mockPool.execute.mockResolvedValue([mockResult]);

      const result = await service.execute('INSERT INTO users (name) VALUES (?)', ['Test']);

      expect(result).toEqual(mockResult);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'INSERT INTO users (name) VALUES (?)',
        ['Test']
      );
    });

    it('should handle execution errors', async () => {
      mockPool.execute.mockRejectedValue(new Error('Execution failed'));

      await expect(
        service.execute('INSERT INTO users (name) VALUES (?)', ['Test'])
      ).rejects.toThrow('Execution failed');
    });

    it('should execute without parameters', async () => {
      const mockResult = { affectedRows: 0 };
      mockPool.execute.mockResolvedValue([mockResult]);

      const result = await service.execute('DELETE FROM users WHERE id = 999');

      expect(result).toEqual(mockResult);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = 999',
        undefined
      );
    });
  });

  describe('Connection Pool', () => {
    it('should create connection pool with correct config', () => {
      expect(mysql.createPool).toHaveBeenCalledWith({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306'),
        user: process.env.MYSQL_USER || 'cacheuser',
        password: process.env.MYSQL_PASSWORD || 'cachepass',
        database: process.env.MYSQL_DATABASE || 'cache_metrics',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    });

    it('should reuse the same pool for multiple queries', async () => {
      mockPool.query.mockResolvedValue([[]]);

      await service.query('SELECT 1');
      await service.query('SELECT 2');

      // Pool should be created only once
      expect(mysql.createPool).toHaveBeenCalledTimes(1);
    });
  });

  describe('Lifecycle', () => {
    it('should close connections on module destroy', async () => {
      mockPool.end.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle errors when closing connections', async () => {
      mockPool.end.mockRejectedValue(new Error('Close failed'));

      await expect(service.onModuleDestroy()).rejects.toThrow('Close failed');
    });
  });

  describe('Complex Queries', () => {
    it('should handle queries with multiple parameters', async () => {
      const mockResult = [{ id: 1 }];
      mockPool.query.mockResolvedValue([mockResult]);

      const result = await service.query(
        'SELECT * FROM users WHERE email = ? AND name = ? AND age > ?',
        ['test@example.com', 'Test User', 18]
      );

      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = ? AND name = ? AND age > ?',
        ['test@example.com', 'Test User', 18]
      );
    });

    it('should handle NULL parameters', async () => {
      const mockResult = { affectedRows: 1 };
      mockPool.execute.mockResolvedValue([mockResult]);

      const result = await service.execute('UPDATE users SET name = ? WHERE id = ?', [null, 1]);

      expect(result).toEqual(mockResult);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'UPDATE users SET name = ? WHERE id = ?',
        [null, 1]
      );
    });

    it('should handle empty parameter array', async () => {
      const mockResult: any[] = [];
      mockPool.query.mockResolvedValue([mockResult]);

      const result = await service.query('SELECT * FROM users', []);

      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM users', []);
    });
  });
});

