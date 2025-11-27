import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../nestjs-app/users/users.controller';
import { UsersService } from '../nestjs-app/users/users.service';
import { SelfHealingCacheService } from '../libs/self-healing-cache/self-healing-cache.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;
  let cacheService: SelfHealingCacheService;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    setDataRefreshFunction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: SelfHealingCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
    cacheService = module.get<SelfHealingCacheService>(SelfHealingCacheService);

    // Reset mocks
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const result = [
        { id: 1, email: 'test1@example.com', name: 'Test User 1', role: 'user', createdAt: '2024-01-01' },
        { id: 2, email: 'test2@example.com', name: 'Test User 2', role: 'admin', createdAt: '2024-01-02' },
      ];
      mockUsersService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toBe(result);
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no users exist', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      expect(await controller.findAll()).toEqual([]);
    });

    it('should handle errors from service', async () => {
      mockUsersService.findAll.mockRejectedValue(new Error('Service Error'));

      await expect(controller.findAll()).rejects.toThrow('Service Error');
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      const result = { id: 1, email: 'test@example.com', name: 'Test User', role: 'user', createdAt: '2024-01-01' };
      mockUsersService.findOne.mockResolvedValue(result);

      expect(await controller.findOne(1)).toBe(result);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should handle different user IDs', async () => {
      const result = { id: 5, email: 'test@example.com', name: 'Test', role: 'user', createdAt: '2024-01-01' };
      mockUsersService.findOne.mockResolvedValue(result);

      await controller.findOne(5);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(5);
    });

    it('should handle not found errors', async () => {
      mockUsersService.findOne.mockRejectedValue(new Error('User not found'));

      await expect(controller.findOne(999)).rejects.toThrow('User not found');
    });

    it('should use cache when available', async () => {
      const cachedUser = { id: 1, email: 'cached@example.com', name: 'Cached', role: 'user', createdAt: '2024-01-01' };
      mockCacheService.get.mockResolvedValue(cachedUser);

      const result = await controller.findOne(1);

      expect(result).toEqual(cachedUser);
      expect(mockUsersService.findOne).not.toHaveBeenCalled();
    });

    it('should cache the result after fetching from database', async () => {
      const user = { id: 1, email: 'test@example.com', name: 'Test', role: 'user', createdAt: '2024-01-01' };
      mockUsersService.findOne.mockResolvedValue(user);

      await controller.findOne(1);

      expect(mockCacheService.set).toHaveBeenCalledWith('user:1', user);
    });
  });
});

