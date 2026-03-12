import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AllConfigType } from '@/config/config.type';

@Injectable()
export class GoogleEnabledGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  canActivate(_context: ExecutionContext): boolean {
    const google = this.configService.get('auth.google', { infer: true });
    if (!google) {
      throw new ServiceUnavailableException(
        'Logowanie przez Google jest wyłączone. Skontaktuj się z administratorem.',
      );
    }
    return true;
  }
}
