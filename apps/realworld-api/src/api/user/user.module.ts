import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentEntity, RoleEntity, TopicEntity, UserEntity } from '@repo/postgresql-typeorm';
import { AuthModule } from '../auth/auth.module';
import { FeaturedModule } from '../featured/featured.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RoleEntity, TopicEntity, AppointmentEntity]),
    AuthModule,
    FeaturedModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
