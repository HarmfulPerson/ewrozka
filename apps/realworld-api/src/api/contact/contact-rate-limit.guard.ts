import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { ContactRateLimitService } from './contact-rate-limit.service';

function getClientIp(req: FastifyRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first?.trim() || req.ip || '0.0.0.0';
  }
  return req.ip || '0.0.0.0';
}

@Injectable()
export class ContactRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: ContactRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const ip = getClientIp(req);

    await this.rateLimitService.checkAndIncrement(ip);
    return true;
  }
}
