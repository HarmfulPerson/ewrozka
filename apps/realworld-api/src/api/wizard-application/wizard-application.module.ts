import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity, WizardApplicationEntity } from '@repo/postgresql-typeorm';
import { WizardApplicationController } from './wizard-application.controller';
import { WizardApplicationService } from './wizard-application.service';

@Module({
  imports: [TypeOrmModule.forFeature([WizardApplicationEntity, UserEntity])],
  controllers: [WizardApplicationController],
  providers: [WizardApplicationService],
})
export class WizardApplicationModule {}
