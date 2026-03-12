import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { ContactController } from './contact.controller';
import { ContactRateLimitGuard } from './contact-rate-limit.guard';
import { ContactRateLimitService } from './contact-rate-limit.service';
import { ContactService } from './contact.service';

@Module({
  imports: [EmailModule],
  controllers: [ContactController],
  providers: [ContactService, ContactRateLimitService, ContactRateLimitGuard],
})
export class ContactModule {}
