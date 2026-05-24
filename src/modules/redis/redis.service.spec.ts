import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              if (key === 'REDIS_HOST') return '127.0.0.1';
              if (key === 'REDIS_PORT') return 6379;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  describe('User Presence (In-Memory Fallback)', () => {
    it('addUserSocket nên trả về true cho socket đầu tiên và false cho socket thứ hai', async () => {
      const isFirst1 = await service.addUserSocket('user-1', 'socket-a');
      expect(isFirst1).toBe(true);

      const isFirst2 = await service.addUserSocket('user-1', 'socket-b');
      expect(isFirst2).toBe(false);
    });

    it('isUserOnline nên trả về true nếu user có socket đang kết nối', async () => {
      await service.addUserSocket('user-2', 'socket-1');
      const isOnline = await service.isUserOnline('user-2');
      expect(isOnline).toBe(true);

      const isUnknownOnline = await service.isUserOnline('unknown-user');
      expect(isUnknownOnline).toBe(false);
    });

    it('removeUserSocket nên trả về false khi còn socket và true khi hết socket', async () => {
      await service.addUserSocket('user-3', 'sock-1');
      await service.addUserSocket('user-3', 'sock-2');

      const isCompletelyOffline1 = await service.removeUserSocket('user-3', 'sock-1');
      expect(isCompletelyOffline1).toBe(false);

      const isCompletelyOffline2 = await service.removeUserSocket('user-3', 'sock-2');
      expect(isCompletelyOffline2).toBe(true);

      const isOnlineAfter = await service.isUserOnline('user-3');
      expect(isOnlineAfter).toBe(false);
    });

    it('getOnlineUserIds nên lọc chính xác danh sách user đang online', async () => {
      await service.addUserSocket('user-online-1', 's1');
      await service.addUserSocket('user-online-2', 's2');

      const onlineIds = await service.getOnlineUserIds([
        'user-online-1',
        'user-online-2',
        'user-offline-3',
      ]);

      expect(onlineIds).toEqual(['user-online-1', 'user-online-2']);
    });
  });

  describe('Caching (In-Memory Fallback)', () => {
    it('set và get nên lưu và lấy đúng giá trị', async () => {
      await service.set('test-key', { foo: 'bar' });
      const cached = await service.get('test-key');
      expect(cached).toEqual({ foo: 'bar' });
    });

    it('del nên xóa đúng key khỏi cache', async () => {
      await service.set('del-key', 'value-to-delete');
      await service.del('del-key');
      const cached = await service.get('del-key');
      expect(cached).toBeNull();
    });

    it('delByPattern nên xóa các key khớp mẫu', async () => {
      await service.set('user:profile:1', 'p1');
      await service.set('user:profile:2', 'p2');
      await service.set('other:key', 'other');

      await service.delByPattern('user:profile:*');

      expect(await service.get('user:profile:1')).toBeNull();
      expect(await service.get('user:profile:2')).toBeNull();
      expect(await service.get('other:key')).toBe('other');
    });
  });
});
