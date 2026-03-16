import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { ApiAuth, ApiPublic } from '@repo/api/decorators/http.decorators';
import { CurrentUser } from '@repo/api';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { UserResDto } from '../user/dto/user.dto';
import { AuthService } from './auth.service';
import { CompleteGoogleRegistrationDto } from './dto/complete-google-registration.dto';
import { LoginReqDto } from './dto/login.dto';
import { GoogleEnabledGuard } from './guards/google-enabled.guard';
import type { GoogleProfile } from './strategies/google.strategy';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('users/login')
  @ApiPublic({
    type: UserResDto,
    summary: 'Sign in',
  })
  @ApiBody({
    description: 'User login request',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          $ref: getSchemaPath(LoginReqDto),
        },
      },
      required: ['user'],
    },
  })
  @SerializeOptions({ type: UserResDto })
  async login(@Body('user') userData: LoginReqDto): Promise<UserResDto> {
    return this.authService.login(userData);
  }

  @Post('auth/refresh')
  @ApiAuth({ summary: 'Odśwież token sesji' })
  async refreshToken(@Req() request: FastifyRequest): Promise<{ token: string }> {
    const authHeader = request.headers.authorization ?? '';
    const currentToken = authHeader.replace(/^Token\s+/i, '');
    const token = await this.authService.refreshToken(currentToken);
    return { token };
  }

  @Get('auth/verify-email')
  @ApiPublic({ summary: 'Weryfikacja adresu e-mail po kliknięciu w link z maila' })
  @ApiQuery({ name: 'token', required: true, description: 'Token weryfikacyjny z e-maila' })
  async verifyEmail(@Query('token') token: string): Promise<{ message: string }> {
    await this.authService.verifyEmail(token);
    return { message: 'Adres e-mail został pomyślnie zweryfikowany. Możesz się teraz zalogować.' };
  }

  @Get('auth/google')
  @ApiPublic({ summary: 'Logowanie/rejestracja przez Google – przekierowanie do Google' })
  @UseGuards(GoogleEnabledGuard, AuthGuard('google'))
  async googleAuth() {
    // Passport przekierowuje do Google
  }

  @Get('auth/google/callback')
  @ApiPublic({ summary: 'Callback Google OAuth' })
  @UseGuards(GoogleEnabledGuard, AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: FastifyRequest & { user?: GoogleProfile },
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const profile = req.user;
    if (!profile) {
      return reply.redirect(this.getFrontendUrl() + '/login?error=google_auth_failed', 302);
    }

    const user = await this.authService.findUserByGoogle(profile);
    const frontendUrl = this.getFrontendUrl();

    if (user) {
      if (user.wizardApplicationStatus === 'pending') {
        return reply.redirect(frontendUrl + '/login?error=WIZARD_PENDING', 302);
      }
      if (user.wizardApplicationStatus === 'rejected') {
        return reply.redirect(frontendUrl + '/login?error=WIZARD_REJECTED', 302);
      }
      const roleNames = user.roles?.map((r) => r.name) ?? [];
      const token = await this.authService.createToken({
        id: user.id,
        roles: roleNames,
      });
      return reply.redirect(
        frontendUrl + `/login/success?token=${encodeURIComponent(token)}`,
        302,
      );
    }

    const tempToken = await this.authService.createGoogleTempToken(profile);
    return reply.redirect(
      frontendUrl + `/rejestracja/google/dokoncz?temp=${encodeURIComponent(tempToken)}`,
      302,
    );
  }

  @Get('auth/google-temp')
  @ApiPublic({ summary: 'Weryfikacja tokena tymczasowego Google (dane do wyświetlenia)' })
  @ApiQuery({ name: 'temp', required: true })
  async getGoogleTempProfile(@Query('temp') temp: string) {
    const profile = await this.authService.verifyGoogleTempToken(temp);
    return { email: profile.email, displayName: profile.displayName, picture: profile.picture };
  }

  @Post('auth/register-google')
  @ApiPublic({
    summary: 'Dokończenie rejestracji po Google (wybór: klient lub specjalista)',
  })
  async completeGoogleRegistration(@Body() dto: CompleteGoogleRegistrationDto) {
    return this.authService.completeGoogleRegistration({
      tempToken: dto.tempToken,
      role: dto.role as 'client' | 'wizard',
      username: dto.username,
      bio: dto.bio,
      phone: dto.phone?.replace(/\D/g, '').slice(0, 9),
      topicIds: dto.topicIds,
    });
  }

  private getFrontendUrl(): string {
    return this.authService.getGoogleFrontendUrl();
  }
}
