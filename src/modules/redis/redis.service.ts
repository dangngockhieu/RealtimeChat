import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CACHE_PREFIX, REDIS_PRESENCE_PREFIX } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  // Fallback in-memory maps nếu Redis không khả dụng
  private readonly inMemoryPresence = new Map<string, Set<string>>();
  private readonly inMemoryCache = new Map<string, { value: any; expireAt?: number }>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initRedisClient();
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
        this.logger.log('Đã đóng kết nối Redis');
      } catch (err: any) {
        this.logger.warn(`Lỗi khi đóng kết nối Redis: ${err?.message || err}`);
      }
    }
  }

  private async initRedisClient(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.configService.get<number>('REDIS_PORT', 6379));
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const db = Number(this.configService.get<number>('REDIS_DB', 0));

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        db,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          if (times > 3) return null; // ngừng thử lại nếu không kết nối được
          return Math.min(times * 500, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Kết nối Redis thành công tại ${host}:${port}`);
      });

      this.client.on('error', (error) => {
        if (this.isConnected) {
          this.logger.warn(`Lỗi Redis client: ${error?.message || error}`);
        }
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(
        `Không thể kết nối Redis (${err?.message || err}). Đang sử dụng In-Memory Fallback.`,
      );
    }
  }

  getClient(): Redis | null {
    return this.isConnected ? this.client : null;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  // ==================== USER PRESENCE (ONLINE / OFFLINE) ====================

  /**
   * Thêm socketId cho user. Trả về true nếu đây là kết nối đầu tiên (vừa online).
   */
  async addUserSocket(userId: string, socketId: string): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        const key = `${REDIS_PRESENCE_PREFIX}${userId}`;
        const added = await this.client.sadd(key, socketId);
        // Thiết lập TTL 24h để tự dọn dẹp nếu server crash
        await this.client.expire(key, 86400);
        const card = await this.client.scard(key);
        return card === 1 && added === 1;
      } catch (error: any) {
        this.logger.error(`Lỗi Redis addUserSocket: ${error?.message || error}`);
      }
    }

    // Fallback In-Memory
    let sockets = this.inMemoryPresence.get(userId);
    let isFirst = false;
    if (!sockets) {
      sockets = new Set<string>();
      this.inMemoryPresence.set(userId, sockets);
      isFirst = true;
    }
    sockets.add(socketId);
    return isFirst;
  }

  /**
   * Xóa socketId cho user. Trả về true nếu user đã offline hoàn toàn (hết socket).
   */
  async removeUserSocket(userId: string, socketId: string): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        const key = `${REDIS_PRESENCE_PREFIX}${userId}`;
        await this.client.srem(key, socketId);
        const remaining = await this.client.scard(key);
        if (remaining === 0) {
          await this.client.del(key);
          return true;
        }
        return false;
      } catch (error: any) {
        this.logger.error(`Lỗi Redis removeUserSocket: ${error?.message || error}`);
      }
    }

    // Fallback In-Memory
    const sockets = this.inMemoryPresence.get(userId);
    if (!sockets) return true;

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.inMemoryPresence.delete(userId);
      return true;
    }
    return false;
  }

  /**
   * Kiểm tra user có đang online không
   */
  async isUserOnline(userId: string): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        const key = `${REDIS_PRESENCE_PREFIX}${userId}`;
        const count = await this.client.scard(key);
        return count > 0;
      } catch (error: any) {
        this.logger.error(`Lỗi Redis isUserOnline: ${error?.message || error}`);
      }
    }

    const sockets = this.inMemoryPresence.get(userId);
    return !!(sockets && sockets.size > 0);
  }

  /**
   * Lọc danh sách userIds đang online trong danh sách truyền vào
   */
  async getOnlineUserIds(userIds: string[]): Promise<string[]> {
    if (!userIds || userIds.length === 0) return [];

    if (this.isConnected && this.client) {
      try {
        const pipeline = this.client.pipeline();
        userIds.forEach((id) => pipeline.scard(`${REDIS_PRESENCE_PREFIX}${id}`));
        const results = await pipeline.exec();

        const onlineIds: string[] = [];
        results?.forEach(([err, count], index) => {
          if (!err && typeof count === 'number' && count > 0) {
            onlineIds.push(userIds[index]);
          }
        });
        return onlineIds;
      } catch (error: any) {
        this.logger.error(`Lỗi Redis getOnlineUserIds: ${error?.message || error}`);
      }
    }

    // Fallback In-Memory
    return userIds.filter((id) => {
      const s = this.inMemoryPresence.get(id);
      return s && s.size > 0;
    });
  }

  // ==================== CACHING ====================

  /**
   * Lấy dữ liệu từ cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const fullKey = `${REDIS_CACHE_PREFIX}${key}`;

    if (this.isConnected && this.client) {
      try {
        const raw = await this.client.get(fullKey);
        if (!raw) return null;
        return JSON.parse(raw) as T;
      } catch (error: any) {
        this.logger.error(`Lỗi Redis get cache: ${error?.message || error}`);
      }
    }

    // Fallback In-Memory
    const item = this.inMemoryCache.get(fullKey);
    if (!item) return null;
    if (item.expireAt && item.expireAt < Date.now()) {
      this.inMemoryCache.delete(fullKey);
      return null;
    }
    return item.value as T;
  }

  /**
   * Ghi dữ liệu vào cache kèm thời gian sống (TTL tính theo giây)
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const fullKey = `${REDIS_CACHE_PREFIX}${key}`;
    const stringified = JSON.stringify(value);

    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(fullKey, stringified, 'EX', ttlSeconds);
        } else {
          await this.client.set(fullKey, stringified);
        }
        return;
      } catch (error: any) {
        this.logger.error(`Lỗi Redis set cache: ${error?.message || error}`);
      }
    }

    // Fallback In-Memory
    const expireAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined;
    this.inMemoryCache.set(fullKey, { value, expireAt });
  }

  /**
   * Xóa một key trong cache
   */
  async del(key: string): Promise<void> {
    const fullKey = `${REDIS_CACHE_PREFIX}${key}`;

    if (this.isConnected && this.client) {
      try {
        await this.client.del(fullKey);
        return;
      } catch (error: any) {
        this.logger.error(`Lỗi Redis del cache: ${error?.message || error}`);
      }
    }

    // Fallback In-Memory
    this.inMemoryCache.delete(fullKey);
  }

  /**
   * Xóa nhiều key khớp pattern trong cache
   */
  async delByPattern(pattern: string): Promise<void> {
    const fullPattern = `${REDIS_CACHE_PREFIX}${pattern}`;

    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(fullPattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
        return;
      } catch (error: any) {
        this.logger.error(`Lỗi Redis delByPattern: ${error?.message || error}`);
      }
    }

    // Fallback In-Memory
    const regex = new RegExp(`^${fullPattern.replace('*', '.*')}$`);
    for (const k of this.inMemoryCache.keys()) {
      if (regex.test(k)) {
        this.inMemoryCache.delete(k);
      }
    }
  }
}
