import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@repo/api';
import { ApiAuth, ApiPublic } from '@repo/api/decorators/http.decorators';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityReqDto } from './dto/create-availability.dto';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @ApiAuth({
    summary: 'Dodaj blok dostępności (specjalista)',
    statusCode: 201,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        availability: {
          type: 'object',
          $ref: '#/components/schemas/CreateAvailabilityReqDto',
        },
      },
      required: ['availability'],
    },
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body('availability') dto: CreateAvailabilityReqDto,
  ) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    return this.availabilityService.addBlock(userId, startsAt, endsAt);
  }

  @Get('mine')
  @ApiAuth({
    summary: 'Moje bloki dostępności',
  })
  async getMine(
    @CurrentUser('id') userId: string,
    @Query('filter') filter?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    return this.availabilityService.getMyBlocks(userId, {
      filter,
      limit: limit ? parseInt(limit, 10) : 10,
      offset: offset ? parseInt(offset, 10) : 0,
      sortOrder: order,
    });
  }

  @Get('slots/uid/:advertisementUid')
  @ApiPublic({ summary: 'Pobierz sloty dla ogłoszenia po UID' })
  async getSlotsByUid(
    @Param('advertisementUid', ParseUUIDPipe) advertisementUid: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const slots = await this.availabilityService.getSlotsForAdvertisement(
      advertisementUid,
      fromDate,
      toDate,
    );
    return { slots, count: slots.length };
  }

  @Delete(':uid')
  @ApiAuth({
    summary: 'Usuń blok dostępności',
    statusCode: 200,
  })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('uid', ParseUUIDPipe) uid: string,
  ) {
    await this.availabilityService.deleteBlock(userId, uid);
    return { ok: true };
  }
}
