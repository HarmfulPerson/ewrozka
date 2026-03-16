import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '@repo/api/decorators/http.decorators';
import { CurrentUser } from '@repo/api';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  /** Liczba oczekujących wniosków (backward compat) */
  @Get('pending-count')
  @ApiAuth({ summary: 'Liczba oczekujących wniosków (wróżka)' })
  async getPendingCount(@CurrentUser('id') wizardId: number) {
    return this.service.getPendingCount(wizardId);
  }

  /** Lista powiadomień użytkownika */
  @Get()
  @ApiAuth({ summary: 'Lista powiadomień' })
  async getNotifications(
    @CurrentUser('id') userId: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.service.getForUser(userId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      unreadOnly: unreadOnly === 'true',
    });
  }

  /** Liczba nieprzeczytanych */
  @Get('unread-count')
  @ApiAuth({ summary: 'Liczba nieprzeczytanych powiadomień' })
  async getUnreadCount(@CurrentUser('id') userId: number) {
    return { count: await this.service.getUnreadCount(userId) };
  }

  /** Oznacz jedno jako przeczytane */
  @Patch(':id/read')
  @ApiAuth({ summary: 'Oznacz powiadomienie jako przeczytane' })
  async markAsRead(
    @CurrentUser('id') userId: number,
    @Param('id') id: string,
  ) {
    await this.service.markAsRead(userId, Number(id));
    return { success: true };
  }

  /** Oznacz wszystkie jako przeczytane */
  @Patch('read-all')
  @ApiAuth({ summary: 'Oznacz wszystkie jako przeczytane' })
  async markAllAsRead(@CurrentUser('id') userId: number) {
    await this.service.markAllAsRead(userId);
    return { success: true };
  }
}
