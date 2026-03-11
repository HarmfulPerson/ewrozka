import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
  @ApiAuth({ summary: 'Prośby o spotkanie do moich ogłoszeń (wróżka)' })
  async listForMyAds(
    @CurrentUser('id') userId: number,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.meetingRequestService.listForMyAds(userId, {
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('my-requests')
  @ApiAuth({ summary: 'Moje wnioski o spotkanie (klient)' })
  async listMyRequests(
    @CurrentUser('id') userId: number,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.meetingRequestService.listMyRequests(userId, {
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Patch(':id/accept')
  @ApiAuth({ summary: 'Zaakceptuj prośbę (wróżka) – tworzy wizytę' })
  async accept(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.meetingRequestService.accept(userId, id);
  }

  @Patch(':id/reject')
  @ApiAuth({ summary: 'Odrzuć prośbę (wróżka)' })
  async reject(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.meetingRequestService.reject(userId, id);
  }
}
