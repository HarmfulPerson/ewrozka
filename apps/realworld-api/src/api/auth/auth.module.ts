import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  RoleEntity,
  UserEntity,
  WizardApplicationEntity,
} from '@repo/postgresql-typeorm';
import { AuthController } from './auth.controller';
import { GoogleEnabledGuard } from './guards/google-enabled.guard';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    JwtModule.register({}),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([UserEntity, RoleEntity, WizardApplicationEntity]),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, GoogleEnabledGuard],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
