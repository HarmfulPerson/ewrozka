import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeaturedWizardEntity, UserEntity } from '@repo/postgresql-typeorm';
import { FeaturedController } from './featured.controller';
import { FeaturedService } from './featured.service';

@Module({
  imports: [TypeOrmModule.forFeature([FeaturedWizardEntity, UserEntity])],
  controllers: [FeaturedController],
  providers: [FeaturedService],
  exports: [FeaturedService],
})
export class FeaturedModule {}
