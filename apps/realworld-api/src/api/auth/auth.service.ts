import { AllConfigType } from '@/config/config.type';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { verifyPassword } from '@repo/nest-common';
import { UserEntity } from '@repo/postgresql-typeorm';
import { Repository } from 'typeorm';
import { UserResDto } from '../user/dto/user.dto';
import { LoginReqDto } from './dto/login.dto';
import { JwtPayloadType } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
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
      throw new UnauthorizedException();
    }

    if (user.wizardApplicationStatus === 'pending') {
      throw new ForbiddenException('WIZARD_PENDING');
    }

    if (user.wizardApplicationStatus === 'rejected') {
      throw new ForbiddenException('WIZARD_REJECTED');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('Konto nie zostało jeszcze aktywowane. Sprawdź skrzynkę e-mail i kliknij link weryfikacyjny.');
    }

    const roleNames = user.roles?.map((r) => r.name) ?? [];
    const token = await this.createToken({ id: user.id, roles: roleNames });

    return {
      user: {
        id: user.id,
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
  }

  async verifyAccessToken(token: string): Promise<JwtPayloadType> {
    let payload: JwtPayloadType;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException();
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
}
