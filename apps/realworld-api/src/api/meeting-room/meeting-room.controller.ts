import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
  async joinByPath(@CurrentUser('id') userId: string, @Param('token') token: string) {
    return this.meetingRoomService.join(token, userId);
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
  async join(@CurrentUser('id') userId: string, @Query('token') token: string) {
    return this.meetingRoomService.join(token, userId);
  }

  @Post('leave')
  @ApiAuth({ summary: 'Zarejestruj wyjście ze spotkania' })
  async leave(
    @CurrentUser('id') userId: string,
    @Query('token') token: string,
  ) {
    await this.meetingRoomService.leave(token, userId);
    return { ok: true };
  }

  @Get('link')
  @ApiAuth({
    summary: 'Pobierz token (link) do spotkania po appointmentUid.',
  })
  @ApiQuery({ name: 'appointmentUid', required: true, type: String })
  async getLink(
    @CurrentUser('id') userId: string,
    @Query('appointmentUid') appointmentUid?: string,
  ) {
    if (!appointmentUid) {
      return { token: null };
    }
    const result = await this.meetingRoomService.getMeetingLink(
      appointmentUid,
      userId,
    );
    return result ?? { token: null };
  }

  @Get(':uid/stats')
  @ApiAuth({ summary: 'Statystyki spotkania: kto kiedy wszedł/wyszedł' })
  async getStats(
    @CurrentUser('id') userId: string,
    @Param('uid', ParseUUIDPipe) uid: string,
  ) {
    return this.meetingRoomService.getStats(uid, userId);
  }
}
