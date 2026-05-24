import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly redisLogger = new Logger(RedisIoAdapter.name);

  constructor(app: any, private readonly configService: ConfigService) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    try {
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = Number(this.configService.get<number>('REDIS_PORT', 6379));
      const password = this.configService.get<string>('REDIS_PASSWORD');
      const db = Number(this.configService.get<number>('REDIS_DB', 0));

      const pubClient = new Redis({
        host,
        port,
        password: password || undefined,
        db,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 500, 2000);
        },
      });

      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) => {
        this.redisLogger.warn(`Redis pubClient error: ${err?.message || err}`);
      });
      subClient.on('error', (err) => {
        this.redisLogger.warn(`Redis subClient error: ${err?.message || err}`);
      });

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.redisLogger.log(`Đã kết nối Redis Socket.IO adapter thành công (${host}:${port})`);
    } catch (err: any) {
      this.redisLogger.warn(
        `Không thể kết nối Redis Socket.IO adapter (${err?.message || err}). Đang sử dụng Default In-Memory Adapter.`,
      );
      this.adapterConstructor = null;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
