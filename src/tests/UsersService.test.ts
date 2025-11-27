import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../nestjs-app/users/users.service';
import { DatabaseService } from '../nestjs-app/database/database.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let databaseService: DatabaseService;

  const mockDatabaseService = {
    query: jest.fn(),
    execute: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    databaseService = module.get<DatabaseService>(DatabaseService);

    // Reset all mocks
    jest.clearAllMocks();
    mockDatabaseService.isConnected.mockReturnValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users from database', async () => {
      const mockUsers = [
        { id: 1, email: 'test1@example.com', name: 'User 1', role: 'user', createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 2, email: 'test2@example.com', name: 'User 2', role: 'admin', createdAt: '2024-01-02T00:00:00.000Z' },
      ];
      mockDatabaseService.query.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('test1@example.com');
      expect(result[1].email).toBe('test2@example.com');
      expect(mockDatabaseService.query).toHaveBeenCalled();
    });

    it('should return in-memory users when database is not connected', async () => {
      mockDatabaseService.isConnected.mockReturnValue(false);

      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should fall back to in-memory data when database errors occur', async () => {
      mockDatabaseService.query.mockRejectedValue(new Error('DB Error'));

      const result = await service.findAll();

      // Should return in-memory fallback data
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('findOne', () => {
    beforeEach(() => {
      // Mock Math.random to avoid random failures (10% chance)
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // > 0.1, won't trigger failure
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return a user by id from database', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: '2024-01-01T00:00:00.000Z'
      };
      mockDatabaseService.query.mockResolvedValue([mockUser]);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.email).toBe('test@example.com');
      expect(mockDatabaseService.query).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockDatabaseService.query.mockResolvedValue([]);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should return in-memory user when database is not connected', async () => {
      mockDatabaseService.isConnected.mockReturnValue(false);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should handle database errors', async () => {
      mockDatabaseService.query.mockRejectedValue(new Error('DB Connection Error'));

      await expect(service.findOne(1)).rejects.toThrow('Database query failed');
    });

    it('should simulate random failures (10% chance)', async () => {
      // Mock Math.random to trigger failure
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.05); // < 0.1 triggers failure

      mockDatabaseService.query.mockResolvedValue([{
        id: 1,
        name: 'Test',
        email: 'test@example.com',
        role: 'user',
        createdAt: '2024-01-01T00:00:00.000Z'
      }]);

      await expect(service.findOne(1)).rejects.toThrow('Database connection timeout');

      Math.random = originalRandom;
    });
  });

  describe('In-Memory Fallback', () => {
    it('should fall back to in-memory data when database unavailable', async () => {
      mockDatabaseService.isConnected.mockReturnValue(false);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockDatabaseService.query).not.toHaveBeenCalled();
    });

    it('should return in-memory users list when database unavailable', async () => {
      mockDatabaseService.isConnected.mockReturnValue(false);

      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockDatabaseService.query).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      // Mock Math.random to avoid random failures (10% chance)
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should handle user with special characters in email', async () => {
      const mockUser = {
        id: 1,
        email: 'test+special@example.com',
        name: 'Test',
        role: 'user',
        createdAt: '2024-01-01T00:00:00.000Z'
      };
      mockDatabaseService.query.mockResolvedValue([mockUser]);

      const result = await service.findOne(1);

      expect(result.email).toBe('test+special@example.com');
    });

    it('should handle user with unicode characters', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: '测试用户 🎉',
        role: 'user',
        createdAt: '2024-01-01T00:00:00.000Z'
      };
      mockDatabaseService.query.mockResolvedValue([mockUser]);

      const result = await service.findOne(1);

      expect(result.name).toBe('测试用户 🎉');
    });
  });
});

