import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Brak @Roles() na endpoincie → przepuść
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: { roles?: string[] } | undefined = request['user'];

    if (!user?.roles) throw new ForbiddenException('Brak uprawnień');

    const hasRole = requiredRoles.some((r) => user.roles!.includes(r));
    if (!hasRole) throw new ForbiddenException('Brak wymaganych uprawnień');

    return true;
  }
}
