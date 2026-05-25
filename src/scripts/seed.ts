import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('DatabaseSeeder');
  logger.log('--- Bắt đầu quá trình Seed dữ liệu Admin ---');

  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);

  await userService.seedAdminUser();
  logger.log('--- Hoàn tất quá trình Seed dữ liệu thành công! ---');

  await app.close();
  process.exit(0);
}

bootstrap().catch((error) => {
  console.error('Lỗi trong quá trình seed dữ liệu:', error);
  process.exit(1);
});
