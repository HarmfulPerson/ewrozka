import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '@repo/api/decorators/http.decorators';
import { CurrentUser } from '@repo/api';
import { WizardRequestsService } from './wizard-requests.service';

@ApiTags('WizardRequests')
@Controller('wizard')
export class WizardRequestsController {
  constructor(private readonly service: WizardRequestsService) {}

  @Get('requests')
  @ApiAuth({ summary: 'Unified list of all requests for wizard' })
  async list(
    @CurrentUser('id') wizardId: number,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    return this.service.getUnifiedRequests(wizardId, {
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      sortBy,
      order,
    });
  }
}
