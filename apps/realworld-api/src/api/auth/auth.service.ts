import { randomBytes } from 'crypto';
import { AllConfigType } from '@/config/config.type';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { hashPassword, verifyPassword } from '@repo/nest-common';
import { RoleEntity, UserEntity, WizardApplicationEntity } from '@repo/postgresql-typeorm';
import { In, Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { UserResDto } from '../user/dto/user.dto';
import { LoginReqDto } from './dto/login.dto';
import { JwtPayloadType } from './types/jwt-payload.type';
import type { GoogleProfile } from './strategies/google.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(WizardApplicationEntity)
    private readonly appRepo: Repository<WizardApplicationEntity>,
  ) {}

  async login(dto: LoginReqDto): Promise<UserResDto> {
    const { email, password } = dto;

    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });

    const isPasswordValid =
      user && (await verifyPassword(password, user.password));

    if (!isPasswordValid) {
      throw new UnauthorizedException('Nieprawidłowy e-mail lub hasło.');
    }

    if (user.wizardApplicationStatus === 'pending') {
      throw new ForbiddenException(
        'Twoja aplikacja jako specjalista jest w trakcie rozpatrywania.',
      );
    }

    if (user.wizardApplicationStatus === 'rejected') {
      throw new ForbiddenException(
        'Twoja aplikacja jako specjalista została odrzucona.',
      );
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'Konto nie zostało jeszcze aktywowane. Sprawdź skrzynkę e-mail i kliknij link weryfikacyjny.',
      );
    }

    const roleNames = user.roles?.map((r) => r.name) ?? [];
    const token = await this.createToken({ id: user.id, roles: roleNames });

    return {
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        bio: user.bio,
        image: user.image,
        image2: user.image2 || '',
        image3: user.image3 || '',
        roles: roleNames,
        topicIds: [],
        topicNames: [],
        token,
      },
    };
  }

  /**
   * Tworzy JWT do weryfikacji e-mail (payload: { id, purpose: 'email-verification' }, ważny 24h).
   */
  async createEmailVerificationToken(userId: number): Promise<string> {
    return this.jwtService.signAsync(
      { id: userId, purpose: 'email-verification' },
      {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
        expiresIn: '24h',
      },
    );
  }

  /**
   * Weryfikuje token e-mail: dekoduje JWT → pobiera userId → oznacza konto jako aktywne.
   */
  async verifyEmail(token: string): Promise<void> {
    let payload: { id: number; purpose: string };

    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Link weryfikacyjny jest nieprawidłowy lub wygasł.');
    }

    if (payload.purpose !== 'email-verification') {
      throw new UnauthorizedException('Nieprawidłowy token weryfikacyjny.');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.id } });

    if (!user) {
      throw new UnauthorizedException('Użytkownik nie istnieje.');
    }

    if (user.emailVerified) {
      // Konto już aktywne – nie ma sensu rzucać błędu, po prostu zwracamy
      return;
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    await this.userRepository.save(user);

    this.emailService
      .sendWelcomeClient(user.email, user.username)
      .catch((err) => this.logger.error('Failed to send welcome email', err));
  }

  /**
   * Tworzy JWT do resetu hasła (payload: { id, purpose: 'password-reset' }, ważny 15 min).
   */
  async createPasswordResetToken(userId: number): Promise<string> {
    return this.jwtService.signAsync(
      { id: userId, purpose: 'password-reset' },
      {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
        expiresIn: '15m',
      },
    );
  }

  /**
   * Wysyła e-mail z linkiem do resetu hasła.
   * Celowo nie ujawnia, czy e-mail istnieje w bazie (ochrona przed enumeracją).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Nie ujawniaj, że konto nie istnieje – cicho wyjdź
      return;
    }

    const token = await this.createPasswordResetToken(user.id);

    this.emailService
      .sendPasswordResetEmail(user.email, user.username, token)
      .catch((err) => this.logger.error('Failed to send password reset email', err));
  }

  /**
   * Weryfikuje token resetu hasła i ustawia nowe hasło.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    let payload: { id: number; purpose: string };

    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Link do resetu hasła jest nieprawidłowy lub wygasł.');
    }

    if (payload.purpose !== 'password-reset') {
      throw new UnauthorizedException('Nieprawidłowy token resetu hasła.');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.id } });

    if (!user) {
      throw new UnauthorizedException('Użytkownik nie istnieje.');
    }

    user.password = newPassword; // Auto-hash przez @BeforeUpdate w UserEntity
    await this.userRepository.save(user);
  }

  async verifyAccessToken(token: string): Promise<JwtPayloadType> {
    let payload: JwtPayloadType;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException(
        'Sesja wygasła lub token jest nieprawidłowy.',
      );
    }

    return payload;
  }

  async createToken(data: {
    id: number;
    roles?: string[];
  }): Promise<string> {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });

    const accessToken = await this.jwtService.signAsync(
      {
        id: data.id,
        roles: data.roles ?? [],
      },
      {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
        expiresIn: tokenExpiresIn,
      },
    );

    return accessToken;
  }

  /**
   * Odświeża token — generuje nowy z istniejącego (ważnego) tokenu.
   * Pozwala na sliding session bez refresh tokenów w bazie.
   */
  async refreshToken(currentToken: string): Promise<string> {
    const payload = await this.verifyAccessToken(currentToken);
    return this.createToken({
      id: parseInt(String(payload.id), 10),
      roles: payload.roles ?? [],
    });
  }

  getGoogleFrontendUrl(): string {
    const google = this.configService.get('auth.google', { infer: true });
    return google?.frontendUrl ?? 'http://localhost:3000';
  }

  /** Znajduje użytkownika po googleId lub email (Google). Zwraca null jeśli nowy. */
  async findUserByGoogle(profile: GoogleProfile): Promise<UserEntity | null> {
    const user = await this.userRepository.findOne({
      where: [{ googleId: profile.id }, { email: profile.email }],
      relations: ['roles'],
    });
    return user ?? null;
  }

  /** Tworzy tymczasowy JWT dla nowej rejestracji Google (ważny 15 min). */
  async createGoogleTempToken(profile: GoogleProfile): Promise<string> {
    return this.jwtService.signAsync(
      {
        purpose: 'google-registration',
        googleId: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        picture: profile.picture,
      },
      {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
        expiresIn: '15m',
      },
    );
  }

  /** Weryfikuje token tymczasowy Google i zwraca dane. */
  async verifyGoogleTempToken(token: string): Promise<GoogleProfile> {
    let payload: { purpose?: string; googleId?: string; email?: string; displayName?: string; picture?: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Link rejestracji wygasł. Spróbuj ponownie zalogować się przez Google.');
    }
    if (payload.purpose !== 'google-registration' || !payload.googleId || !payload.email) {
      throw new UnauthorizedException('Nieprawidłowy token rejestracji.');
    }
    return {
      id: payload.googleId,
      email: payload.email,
      displayName: payload.displayName ?? payload.email.split('@')[0],
      picture: payload.picture,
    };
  }

  /** Dokończenie rejestracji Google: klient lub wniosek wróżki. */
  async completeGoogleRegistration(dto: {
    tempToken: string;
    role: 'client' | 'wizard';
    username?: string;
    bio?: string;
    phone?: string;
    topicIds?: number[];
    gender?: 'female' | 'male';
    referralCode?: string;
  }): Promise<UserResDto | { id: string }> {
    const profile = await this.verifyGoogleTempToken(dto.tempToken);

    const existing = await this.userRepository.findOne({
      where: [{ googleId: profile.id }, { email: profile.email }],
    });
    if (existing) {
      throw new ConflictException('Konto z tym adresem e-mail już istnieje.');
    }

    // Resolve referral code
    let referredBy: number | null = null;
    if (dto.referralCode) {
      const referrer = await this.userRepository.findOne({
        where: { referralCode: dto.referralCode },
        select: ['id'],
      });
      if (referrer) referredBy = referrer.id;
    }

    if (dto.role === 'client') {
      const username =
        (dto.username ?? profile.displayName ?? profile.email.split('@')[0])
          .trim()
          .replace(/\s+/g, '_')
          .slice(0, 60) || `user_${Date.now()}`;
      const uniqueUsername = await this.ensureUniqueUsername(username);
      const clientRole = await this.roleRepository.findOne({ where: { name: 'client' } });
      if (!clientRole) throw new BadRequestException('Rola client nie istnieje.');

      const newUser = this.userRepository.create({
        username: uniqueUsername,
        email: profile.email,
        password: await hashPassword(`google_${profile.id}_${Date.now()}`),
        googleId: profile.id,
        image: profile.picture ?? '',
        bio: '',
        emailVerified: true,
        roles: [clientRole],
        gender: dto.gender ?? null,
        referralCode: randomBytes(4).toString('hex'),
        referredBy,
      });
      const saved = await this.userRepository.save(newUser);

      this.emailService
        .sendWelcomeClient(saved.email, saved.username)
        .catch((err) => this.logger.error('Failed to send welcome email', err));

      const savedWithRoles = await this.userRepository.findOneOrFail({
        where: { id: saved.id },
        relations: ['roles'],
      });
      const roleNames = savedWithRoles.roles?.map((r) => r.name) ?? [];
      const token = await this.createToken({ id: saved.id, roles: roleNames });
      return {
        user: {
          id: saved.id,
          uid: saved.uid,
          email: saved.email,
          username: saved.username,
          bio: saved.bio,
          image: saved.image,
          image2: saved.image2 || '',
          image3: saved.image3 || '',
          roles: roleNames,
          topicIds: [],
          topicNames: [],
          token,
        },
      };
    }

    if (dto.role === 'wizard') {
      if (!dto.bio || dto.bio.length < 20) {
        throw new BadRequestException('Opis musi mieć co najmniej 20 znaków.');
      }
      if (!dto.phone || !/^\d{9}$/.test(dto.phone.replace(/\D/g, ''))) {
        throw new BadRequestException('Numer telefonu musi składać się z 9 cyfr.');
      }

      const username =
        (dto.username ?? profile.displayName ?? profile.email.split('@')[0])
          .trim()
          .replace(/\s+/g, '_')
          .slice(0, 60) || `wizard_${Date.now()}`;
      const uniqueUsername = await this.ensureUniqueUsername(username, true);

      const app = this.appRepo.create({
        email: profile.email,
        username: uniqueUsername,
        passwordHash: await hashPassword(`google_${profile.id}_${Date.now()}`),
        bio: dto.bio.trim(),
        phone: `+48${dto.phone.replace(/\D/g, '').slice(0, 9)}`,
        topicIds: dto.topicIds ?? [],
        gender: dto.gender ?? null,
        status: 'pending',
        googleId: profile.id,
        referralCodeUsed: dto.referralCode ?? null,
      });
      await this.appRepo.save(app);
      return { id: app.id };
    }

    throw new BadRequestException('Nieprawidłowa rola.');
  }

  private async ensureUniqueUsername(base: string, checkWizardApp = false): Promise<string> {
    let username = base.slice(0, 60).replace(/[^a-zA-Z0-9_-]/g, '_');
    let suffix = 0;
    const exists = async () => {
      const inUser = await this.userRepository.findOne({ where: { username } });
      if (inUser) return true;
      if (checkWizardApp) {
        const inApp = await this.appRepo.findOne({ where: { username } });
        if (inApp) return true;
      }
      return false;
    };
    while (await exists()) {
      username = `${base.slice(0, 50)}_${++suffix}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    return username;
  }
}
