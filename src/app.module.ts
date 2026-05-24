import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt/jwt.guard';
import { APP_GUARD } from '@nestjs/core';
import { FriendshipModule } from './modules/friendship/friendship.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { MemberModule } from './modules/member/member.module';
import { MessageModule } from './modules/message/message.module';
import { ChatGatewayModule } from './modules/chat-gateway/chat-gateway.module';
import { MailModule } from './modules/mail/mail.module';
import { UploadModule } from './modules/upload/upload.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    UserModule,
    AuthModule,
    FriendshipModule,
    ConversationModule,
    MemberModule,
    MessageModule,
    ChatGatewayModule,
    MailModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [
      AppService,
      {
        provide: APP_GUARD,
        useClass: JwtAuthGuard,
      },
  ],
})
export class AppModule {}
