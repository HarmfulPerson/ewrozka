import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
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
    @CurrentUser('id') userId: number,
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
    @CurrentUser('id') userId: number,
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

  @Get('slots/:advertisementId')
  @ApiPublic({
    summary: 'Pobierz dostępne sloty dla ogłoszenia',
  })
  async getSlots(
    @Param('advertisementId', ParseIntPipe) advertisementId: number,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const slots = await this.availabilityService.getSlotsForAdvertisement(
      advertisementId,
      fromDate,
      toDate,
    );
    return { slots, count: slots.length };
  }

  @Delete(':id')
  @ApiAuth({
    summary: 'Usuń blok dostępności',
    statusCode: 200,
  })
  async delete(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.availabilityService.deleteBlock(userId, id);
    return { ok: true };
  }
}
