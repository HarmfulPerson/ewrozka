import { Module } from '@nestjs/common';
import { WizardRequestsController } from './wizard-requests.controller';
import { ClientRequestsController } from './client-requests.controller';
import { WizardRequestsService } from './wizard-requests.service';

@Module({
  controllers: [WizardRequestsController, ClientRequestsController],
  providers: [WizardRequestsService],
})
export class WizardRequestsModule {}
