import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@repo/api';
import { ApiAuth } from '@repo/api/decorators/http.decorators';
import { Public } from '@repo/nest-common';
import { AppointmentService } from './appointment.service';

@ApiTags('Appointment')
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get()
  @ApiAuth({ summary: 'Moje wizyty (jako klient lub specjalista)' })
  async listMine(
    @CurrentUser('id') userId: number,
    @Query('status') status?: string,
    @Query('filter') filter?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.appointmentService.listMine(userId, {
      status,
      filter,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('upcoming')
  @ApiAuth({ summary: 'Nadchodzące spotkania klienta – opłacone, w przyszłości' })
  async listMyUpcoming(
    @CurrentUser('id') userId: number,
    @Query('limit') limit?: string,
  ) {
    return this.appointmentService.listMyUpcoming(userId, {
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('completed')
  @ApiAuth({ summary: 'Odbyte spotkania klienta – paginacja i filtr nieocenionych' })
  async listMyCompleted(
    @CurrentUser('id') userId: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unratedOnly') unratedOnly?: string,
  ) {
    return this.appointmentService.listMyCompleted(userId, {
      limit: limit ? parseInt(limit, 10) : 5,
      offset: offset ? parseInt(offset, 10) : 0,
      unratedOnly: unratedOnly === 'true' || unratedOnly === '1',
    });
  }

  @Post('uid/:uid/rate')
  @HttpCode(HttpStatus.OK)
  @ApiAuth({ summary: 'Oceń zakończone spotkanie' })
  async rateByUid(
    @CurrentUser('id') userId: number,
    @Param('uid', ParseUUIDPipe) uid: string,
    @Body('rating') rating: number,
    @Body('comment') comment?: string,
  ) {
    await this.appointmentService.rateAppointmentByUid(userId, uid, Number(rating), comment);
    return { message: 'Ocena zapisana' };
  }

  @Get('reviews/uid/:uid')
  @Public()
  async getWizardReviewsByUid(
    @Param('uid', ParseUUIDPipe) wizardUid: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = parsePositiveInt(page, 1, 'page');
    const parsedLimit = parsePositiveInt(limit, 5, 'limit');
    if (parsedLimit > 50) {
      throw new BadRequestException('limit must be ≤ 50');
    }
    return this.appointmentService.getWizardReviewsByUid(
      wizardUid,
      parsedPage,
      parsedLimit,
    );
  }

  @Post('uid/:uid/pay')
  @ApiAuth({ summary: 'Opłać wizytę — tworzy Stripe Checkout session' })
  async payByUid(
    @CurrentUser('id') userId: number,
    @CurrentUser('email') email: string,
    @Param('uid', ParseUUIDPipe) uid: string,
  ) {
    return this.appointmentService.payByUid(userId, uid, email);
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number, fieldName: string): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new BadRequestException(`${fieldName} must be a positive integer`);
  }
  return n;
}
