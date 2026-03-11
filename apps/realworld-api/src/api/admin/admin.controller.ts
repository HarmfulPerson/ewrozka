import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiAuth } from '@repo/api/decorators/http.decorators';
import { Roles } from '../../decorators/roles.decorator';
import {
  AdminService,
  type AdminWizardsSortBy,
  type WizardApplicationStatus,
} from './admin.service';

@ApiTags('Admin')
@Controller('admin')
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('wizard-applications')
  @ApiAuth({ summary: 'Lista wniosków wróżek (tylko admin)' })
  getWizardApplications(
    @Query('status') status?: WizardApplicationStatus,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.adminService.getWizardApplications(status, page ?? 1, limit ?? 5);
  }

  @Get('wizard-applications/:id')
  @ApiAuth({ summary: 'Szczegóły wniosku wróżki (tylko admin)' })
  getApplication(@Param('id') id: string) {
    return this.adminService.getWizardApplication(id);
  }

  @Post('wizard-applications/:id/approve')
  @ApiAuth({ summary: 'Zatwierdź wniosek wróżki (tylko admin)' })
  @HttpCode(HttpStatus.OK)
  approveApplication(@Param('id') id: string) {
    return this.adminService.approveWizardApplication(id);
  }

  @Post('wizard-applications/:id/reject')
  @ApiAuth({ summary: 'Odrzuć wniosek wróżki (tylko admin)' })
  @HttpCode(HttpStatus.OK)
  rejectApplication(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectWizardApplication(id, reason);
  }

  @Get('wizards')
  @ApiAuth({ summary: 'Lista wróżek z filtrami i sortowaniem (tylko admin)' })
  getWizards(
    @Query('minMeetings', new ParseIntPipe({ optional: true })) minMeetings?: number,
    @Query('maxMeetings', new ParseIntPipe({ optional: true })) maxMeetings?: number,
    @Query('minEarnedGrosze', new ParseIntPipe({ optional: true })) minEarnedGrosze?: number,
    @Query('maxEarnedGrosze', new ParseIntPipe({ optional: true })) maxEarnedGrosze?: number,
    @Query('availableNow') availableNow?: string,
    @Query('sortBy') sortBy?: AdminWizardsSortBy,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const filters = {
      ...(minMeetings != null && { minMeetings }),
      ...(maxMeetings != null && { maxMeetings }),
      ...(minEarnedGrosze != null && { minEarnedGrosze }),
      ...(maxEarnedGrosze != null && { maxEarnedGrosze }),
      ...(availableNow === 'true' && { availableNow: true }),
    };
    return this.adminService.getWizards(
      filters,
      sortBy ?? 'joinDate',
      sortOrder ?? 'desc',
      page ?? 1,
      limit ?? 10,
    );
  }

  @Get('wizards/:id')
  @ApiAuth({ summary: 'Szczegóły wróżki (tylko admin)' })
  getWizard(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getWizardById(id);
  }

  @Post('wizards/:id/featured')
  @ApiAuth({ summary: 'Ustaw wyróżnienie wróżki bez płatności (tylko admin)' })
  @HttpCode(HttpStatus.OK)
  setWizardFeatured(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.setWizardFeatured(id);
  }
}
