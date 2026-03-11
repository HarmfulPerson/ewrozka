import { EmailField, PasswordField, StringField } from '@repo/api';
import { lowerCaseTransformer } from '@repo/nest-common';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateUserReqDto {
  @StringField()
  @Transform(lowerCaseTransformer)
  readonly username: string;

  @EmailField()
  readonly email: string;

  @PasswordField()
  readonly password: string;

  /** Nazwy ról (np. ['wizard'], ['client']). Dla eWróżka: wizard | client. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly roleNames?: string[];

  /** ID specjalizacji (topics) dla wróżek */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  readonly topicIds?: number[];

  /** Opis/bio wróżki – wymagany przy rejestracji jako wróżka */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  readonly bio?: string;

  /**
   * Numer telefonu wróżki – 9 cyfr (bez prefixu, backend doda +48).
   * Nie jest eksponowany publicznie.
   */
  @IsOptional()
  @IsString()
  @Matches(/^\d{9}$/, { message: 'Numer telefonu musi składać się z dokładnie 9 cyfr.' })
  readonly phone?: string;
}
