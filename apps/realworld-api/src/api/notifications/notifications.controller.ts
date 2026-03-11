import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '@repo/api/decorators/http.decorators';
import { CurrentUser } from '@repo/api';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller()
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('notifications/pending-count')
  @ApiAuth({ summary: 'Get pending requests count for wizard' })
  async getPendingCount(
    @CurrentUser('id') wizardId: number,
  ) {
    return this.service.getPendingCount(wizardId);
  }
}
