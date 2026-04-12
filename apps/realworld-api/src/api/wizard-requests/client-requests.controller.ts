import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '@repo/api/decorators/http.decorators';
import { CurrentUser } from '@repo/api';
import { WizardRequestsService } from './wizard-requests.service';

@ApiTags('ClientRequests')
@Controller('client')
export class ClientRequestsController {
  constructor(private readonly service: WizardRequestsService) {}

  @Get('requests')
  @ApiAuth({ summary: 'Unified list of all requests/appointments for client' })
  async list(
    @CurrentUser('id') clientId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    return this.service.getClientRequests(clientId, {
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      sortBy,
      order,
    });
  }
}
