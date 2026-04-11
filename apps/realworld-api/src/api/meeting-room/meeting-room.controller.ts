import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@repo/api';
import { ApiAuth } from '@repo/api/decorators/http.decorators';
import { MeetingRoomService } from './meeting-room.service';

@ApiTags('MeetingRoom')
@Controller('meeting-room')
export class MeetingRoomController {
  constructor(private readonly meetingRoomService: MeetingRoomService) {}

  @Get('join/:token')
  @ApiAuth({
    summary: 'Wejdź na spotkanie (walidacja tokenu + rejestracja wejścia)',
  })
  async joinByPath(@CurrentUser('id') userId: number, @Param('token') token: string) {
    const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    return this.meetingRoomService.join(token, uid);
  }

  @Get('join')
  @ApiAuth({
    summary: 'Wejdź na spotkanie (walidacja tokenu + rejestracja wejścia)',
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Token z linku spotkania',
  })
  async join(@CurrentUser('id') userId: number, @Query('token') token: string) {
    const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    return this.meetingRoomService.join(token, uid);
  }

  @Post('leave')
  @ApiAuth({ summary: 'Zarejestruj wyjście ze spotkania' })
  async leave(
    @CurrentUser() user: { id: number },
    @Query('token') token: string,
  ) {
    const uid = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
    await this.meetingRoomService.leave(token, uid);
    return { ok: true };
  }

  @Get('link')
  @ApiAuth({
    summary: 'Pobierz token (link) do spotkania. Akceptuje appointmentUid (preferowane) lub appointmentId (deprecated).',
  })
  @ApiQuery({ name: 'appointmentUid', required: false, type: String })
  @ApiQuery({ name: 'appointmentId', required: false, type: Number })
  async getLink(
    @CurrentUser('id') userId: number,
    @Query('appointmentUid') appointmentUidRaw?: string,
    @Query('appointmentId') appointmentIdRaw?: string,
  ) {
    const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;

    // Phase 5: prefer uid when provided.
    if (appointmentUidRaw) {
      const result = await this.meetingRoomService.getMeetingLinkByUid(
        appointmentUidRaw,
        uid,
      );
      return result ?? { token: null };
    }

    const parsedId = appointmentIdRaw ? parseInt(appointmentIdRaw, 10) : NaN;
    if (!Number.isInteger(parsedId) || parsedId < 1) {
      return { token: null };
    }
    const result = await this.meetingRoomService.getMeetingLink(parsedId, uid);
    return result ?? { token: null };
  }

  @Get(':id/stats')
  @ApiAuth({ summary: 'Statystyki spotkania: kto kiedy wszedł/wyszedł' })
  async getStats(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    return this.meetingRoomService.getStats(id, uid);
  }
}
