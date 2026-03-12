import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { AllConfigType } from '@/config/config.type';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';

export interface GoogleProfile {
  id: string;
  email: string;
  displayName: string;
  picture?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService<AllConfigType>) {
    const google = configService.get('auth.google', { infer: true });
    super(
      google
        ? {
            clientID: google.clientId,
            clientSecret: google.clientSecret,
            callbackURL: google.callbackUrl,
            scope: ['email', 'profile'],
            passReqToCallback: false,
          }
        : {
            clientID: 'disabled',
            clientSecret: 'disabled',
            callbackURL: 'http://localhost/callback',
          },
    );
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<GoogleProfile> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('Google nie zwrócił adresu e-mail.'), undefined);
    }
    return done(null, {
      id: profile.id,
      email: email.toLowerCase(),
      displayName: profile.displayName ?? email.split('@')[0],
      picture: profile.photos?.[0]?.value,
    });
  }
}
