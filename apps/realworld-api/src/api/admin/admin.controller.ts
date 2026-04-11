import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
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
  @ApiAuth({ summary: 'Lista wniosków specjalistów (tylko admin)' })
  getWizardApplications(
    @Query('status') status?: WizardApplicationStatus,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.adminService.getWizardApplications(
      status,
      page ?? 1,
      limit ?? 5,
    );
  }

  @Get('wizard-applications/:id')
  @ApiAuth({ summary: 'Szczegóły wniosku specjalisty (tylko admin)' })
  getApplication(@Param('id') id: string) {
    return this.adminService.getWizardApplication(id);
  }

  @Post('wizard-applications/:id/approve')
  @ApiAuth({ summary: 'Zatwierdź wniosek specjalisty (tylko admin)' })
  @HttpCode(HttpStatus.OK)
  approveApplication(@Param('id') id: string) {
    return this.adminService.approveWizardApplication(id);
  }

  @Post('wizard-applications/:id/reject')
  @ApiAuth({ summary: 'Odrzuć wniosek specjalisty (tylko admin)' })
  @HttpCode(HttpStatus.OK)
  rejectApplication(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.rejectWizardApplication(id, reason);
  }

  @Get('pending-video-count')
  @ApiAuth({ summary: 'Liczba specjalistów z filmikiem do akceptacji (tylko admin)' })
  getPendingVideoCount() {
    return this.adminService.getPendingVideoCount();
  }

  @Get('wizards')
  @ApiAuth({ summary: 'Lista specjalistów z filtrami i sortowaniem (tylko admin)' })
  getWizards(
    @Query('minMeetings', new ParseIntPipe({ optional: true }))
    minMeetings?: number,
    @Query('maxMeetings', new ParseIntPipe({ optional: true }))
    maxMeetings?: number,
    @Query('minEarnedGrosze', new ParseIntPipe({ optional: true }))
    minEarnedGrosze?: number,
    @Query('maxEarnedGrosze', new ParseIntPipe({ optional: true }))
    maxEarnedGrosze?: number,
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
      sortBy ?? 'pendingVideo',
      sortOrder ?? 'desc',
      page ?? 1,
      limit ?? 10,
    );
  }

  // ── Phase 4 uid-based routes (preferred). Declared before the legacy
  // :id variants so Fastify matches them first. Legacy routes stay below
  // and are deprecated in their ApiAuth summary. ──

  @Get('wizards/uid/:uid')
  @ApiAuth({ summary: 'Szczegóły specjalisty po UID (preferowane)' })
  getWizardByUid(@Param('uid', ParseUUIDPipe) uid: string) {
    return this.adminService.getWizardByUid(uid);
  }

  @Patch('wizards/uid/:uid/platform-fee')
  @ApiAuth({ summary: 'Zmień prowizję platformy po UID (preferowane)' })
  @HttpCode(HttpStatus.OK)
  updateWizardPlatformFeeByUid(
    @Param('uid', ParseUUIDPipe) uid: string,
    @Body() body: { platformFeePercent: number },
  ) {
    return this.adminService.updateWizardPlatformFeeByUid(
      uid,
      Number(body.platformFeePercent),
    );
  }

  @Post('wizards/uid/:uid/platform-fee/reset-to-tier')
  @ApiAuth({ summary: 'Reset prowizji po UID (preferowane)' })
  @HttpCode(HttpStatus.OK)
  resetWizardPlatformFeeToTierByUid(@Param('uid', ParseUUIDPipe) uid: string) {
    return this.adminService.resetWizardPlatformFeeToTierByUid(uid);
  }

  @Post('wizards/uid/:uid/featured')
  @ApiAuth({ summary: 'Ustaw wyróżnienie po UID (preferowane)' })
  @HttpCode(HttpStatus.OK)
  setWizardFeaturedByUid(@Param('uid', ParseUUIDPipe) uid: string) {
    return this.adminService.setWizardFeaturedByUid(uid);
  }

  @Post('wizards/uid/:uid/video/approve')
  @ApiAuth({ summary: 'Zatwierdź filmik po UID (preferowane)' })
  @HttpCode(HttpStatus.OK)
  approveWizardVideoByUid(@Param('uid', ParseUUIDPipe) uid: string) {
    return this.adminService.approveWizardVideoByUid(uid);
  }

  @Post('wizards/uid/:uid/video/reject')
  @ApiAuth({ summary: 'Odrzuć filmik po UID (preferowane)' })
  @HttpCode(HttpStatus.OK)
  rejectWizardVideoByUid(@Param('uid', ParseUUIDPipe) uid: string) {
    return this.adminService.rejectWizardVideoByUid(uid);
  }

  // ── Legacy :id routes (deprecated — use /wizards/uid/:uid/*) ──

  @Get('wizards/:id')
  @ApiAuth({ summary: 'Szczegóły specjalisty (deprecated — użyj /wizards/uid/:uid)' })
  getWizard(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getWizardById(id);
  }

  @Patch('wizards/:id/platform-fee')
  @ApiAuth({ summary: 'Zmień prowizję (deprecated — użyj /wizards/uid/:uid/platform-fee)' })
  @HttpCode(HttpStatus.OK)
  updateWizardPlatformFee(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { platformFeePercent: number },
  ) {
    return this.adminService.updateWizardPlatformFee(
      id,
      Number(body.platformFeePercent),
    );
  }

  @Post('wizards/:id/platform-fee/reset-to-tier')
  @ApiAuth({ summary: 'Reset prowizji (deprecated — użyj /wizards/uid/:uid/...)' })
  @HttpCode(HttpStatus.OK)
  resetWizardPlatformFeeToTier(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.resetWizardPlatformFeeToTier(id);
  }

  @Post('wizards/:id/featured')
  @ApiAuth({ summary: 'Wyróżnienie (deprecated — użyj /wizards/uid/:uid/featured)' })
  @HttpCode(HttpStatus.OK)
  setWizardFeatured(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.setWizardFeatured(id);
  }

  @Post('wizards/:id/video/approve')
  @ApiAuth({ summary: 'Zatwierdź filmik (deprecated — użyj /wizards/uid/:uid/video/approve)' })
  @HttpCode(HttpStatus.OK)
  approveWizardVideo(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approveWizardVideo(id);
  }

  @Post('wizards/:id/video/reject')
  @ApiAuth({ summary: 'Odrzuć filmik (deprecated — użyj /wizards/uid/:uid/video/reject)' })
  @HttpCode(HttpStatus.OK)
  rejectWizardVideo(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.rejectWizardVideo(id);
  }

  @Get('commission-tier-config')
  @ApiAuth({ summary: 'Pobierz konfigurację progów prowizji (tylko admin)' })
  getCommissionTierConfig() {
    return this.adminService.getCommissionTierConfig();
  }

  @Patch('commission-tier-config')
  @ApiAuth({
    summary: 'Zaktualizuj konfigurację progów prowizji (tylko admin)',
  })
  @HttpCode(HttpStatus.OK)
  updateCommissionTierConfig(
    @Body()
    body: {
      windowDays?: number;
      tiers?: {
        minMeetings: number;
        maxMeetings: number | null;
        feePercent: number;
      }[];
    },
  ) {
    return this.adminService.updateCommissionTierConfig(body);
  }

  @Get('reminder-config')
  @ApiAuth({ summary: 'Pobierz konfigurację przypomnień o spotkaniach (tylko admin)' })
  getReminderConfig() {
    return this.adminService.getReminderConfig();
  }

  @Patch('reminder-config')
  @ApiAuth({ summary: 'Zaktualizuj konfigurację przypomnień (tylko admin)' })
  @HttpCode(HttpStatus.OK)
  updateReminderConfig(
    @Body()
    body: {
      enabled48h?: boolean;
      enabled24h?: boolean;
      enabled1h?: boolean;
      hoursSlot1?: number;
      hoursSlot2?: number;
      hoursSlot3?: number;
    },
  ) {
    return this.adminService.updateReminderConfig(body);
  }

  // ── Analytics ──

  @Get('analytics/revenue')
  @ApiAuth({ summary: 'Analityka: przychody platformy' })
  getRevenueAnalytics(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.adminService.getRevenueAnalytics(from, to, groupBy);
  }

  @Get('analytics/registrations')
  @ApiAuth({ summary: 'Analityka: rejestracje użytkowników' })
  getRegistrationAnalytics(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.adminService.getRegistrationAnalytics(from, to, groupBy);
  }

  @Get('analytics/wizard-revenue')
  @ApiAuth({ summary: 'Analityka: zarobki wróżek (top N)' })
  getWizardRevenueAnalytics(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getWizardRevenueAnalytics(
      from,
      to,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('analytics/wizard/uid/:uid')
  @ApiAuth({ summary: 'Analityka: szczegóły wróżki po UID (preferowane)' })
  getWizardAnalyticsByUid(
    @Param('uid', ParseUUIDPipe) uid: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.adminService.getWizardAnalyticsByUid(uid, from, to, groupBy);
  }

  @Get('analytics/wizard/:id')
  @ApiAuth({ summary: 'Analityka: szczegóły wróżki (deprecated — użyj /analytics/wizard/uid/:uid)' })
  getWizardAnalytics(
    @Param('id', ParseIntPipe) wizardId: number,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    return this.adminService.getWizardAnalytics(wizardId, from, to, groupBy);
  }
}
