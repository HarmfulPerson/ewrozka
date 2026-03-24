import { Controller, Get } from '@nestjs/common';
import { ApiPublic } from '@repo/api/decorators/http.decorators';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiPublic()
  getHello(): string {
    return this.appService.getHello();
  }

  // TODO: Remove after verifying Sentry works
  @Get('debug-sentry')
  @ApiPublic()
  debugSentry(): string {
    throw new Error('Test Sentry error — safe to ignore');
  }
}
