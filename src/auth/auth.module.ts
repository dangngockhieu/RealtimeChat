import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local/local.strategy';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/schemas/user.schema';
import { JwtStrategy } from './jwt/jwt.strategy';

@Module({
  imports: [
      UserModule,
      PassportModule,
      JwtModule.register({}),
      MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
  ],
  controllers: [AuthController],
  providers: [
      AuthService,
      LocalStrategy,
      JwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
