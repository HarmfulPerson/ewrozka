import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
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

  @Post(':id/rate')
  @HttpCode(HttpStatus.OK)
  @ApiAuth({ summary: 'Oceń zakończone spotkanie (klient, 0–5)' })
  async rate(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('rating') rating: number,
    @Body('comment') comment?: string,
  ) {
    await this.appointmentService.rateAppointment(userId, id, Number(rating), comment);
    return { message: 'Ocena zapisana' };
  }

  @Get('reviews/:wizardId')
  @Public()
  async getWizardReviews(
    @Param('wizardId', ParseIntPipe) wizardId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.appointmentService.getWizardReviews(
      wizardId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 5,
    );
  }

  @Post(':id/pay')
  @ApiAuth({ summary: 'Opłać wizytę (klient) - tworzy Stripe Checkout session' })
  async pay(
    @CurrentUser('id') userId: number,
    @CurrentUser('email') email: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointmentService.pay(userId, id, email);
  }
}
