import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@repo/api';
import { ApiAuth } from '@repo/api/decorators/http.decorators';
import { MeetingRequestService } from './meeting-request.service';
import { CreateMeetingRequestReqDto } from './dto/create-meeting-request.dto';

@ApiTags('MeetingRequest')
@Controller('meeting-requests')
export class MeetingRequestController {
  constructor(
    private readonly meetingRequestService: MeetingRequestService,
  ) {}

  @Post()
  @ApiAuth({
    summary: 'Umów się na spotkanie (wymagane logowanie)',
    statusCode: 201,
  })
  @ApiBody({
    description: 'Prośba o spotkanie',
    schema: {
      type: 'object',
      properties: {
        meetingRequest: {
          type: 'object',
          $ref: '#/components/schemas/CreateMeetingRequestReqDto',
        },
      },
      required: ['meetingRequest'],
    },
  })
  async create(
    @CurrentUser() user: { id: number; roles?: string[] },
    @Body('meetingRequest') dto: CreateMeetingRequestReqDto,
  ) {
    const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
    return this.meetingRequestService.create(userId, dto, {
      roles: user.roles ?? [],
    });
  }

  @Get('for-my-ads')
  @ApiAuth({ summary: 'Prośby o spotkanie do moich ogłoszeń (specjalista)' })
  async listForMyAds(
    @CurrentUser('id') userId: number,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    return this.meetingRequestService.listForMyAds(userId, {
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      sortBy,
      order,
    });
  }

  @Get('my-requests')
  @ApiAuth({ summary: 'Moje wnioski o spotkanie (klient)' })
  async listMyRequests(
    @CurrentUser('id') userId: number,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    return this.meetingRequestService.listMyRequests(userId, {
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      sortBy,
      order,
    });
  }

  @Patch('uid/:uid/accept')
  @ApiAuth({ summary: 'Zaakceptuj prośbę po UID (preferowane) – tworzy wizytę' })
  async acceptByUid(
    @CurrentUser('id') userId: number,
    @Param('uid', ParseUUIDPipe) uid: string,
  ) {
    return this.meetingRequestService.acceptByUid(userId, uid);
  }

  @Patch('uid/:uid/reject')
  @ApiAuth({ summary: 'Odrzuć prośbę po UID (preferowane). Dla zaakceptowanego, nieopłaconego – wymagany powód.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { reason: { type: 'string', description: 'Wymagany przy odrzuceniu zaakceptowanego wniosku' } },
    },
  })
  async rejectByUid(
    @CurrentUser('id') userId: number,
    @Param('uid', ParseUUIDPipe) uid: string,
    @Body('reason') reason?: string,
  ) {
    return this.meetingRequestService.rejectByUid(userId, uid, reason);
  }

  @Patch(':id/accept')
  @ApiAuth({ summary: 'Zaakceptuj prośbę (deprecated — użyj /uid/:uid/accept)' })
  async accept(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.meetingRequestService.accept(userId, id);
  }

  @Patch(':id/reject')
  @ApiAuth({ summary: 'Odrzuć prośbę (deprecated — użyj /uid/:uid/reject)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { reason: { type: 'string', description: 'Wymagany przy odrzuceniu zaakceptowanego wniosku' } },
    },
  })
  async reject(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.meetingRequestService.reject(userId, id, reason);
  }
}
