import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NumberField, StringField, StringFieldOptional } from '@repo/api';
import {
  PRICE_GROSZE_MAX,
  PRICE_GROSZE_MIN,
  DURATION_MINUTES_MAX,
  DURATION_MINUTES_MIN,
} from '../constants';

export class CreateAdvertisementReqDto {
  @ApiProperty({ example: 'Konsultacje tarot' })
  @StringField({ minLength: 1, maxLength: 200 })
  title: string;

  @ApiPropertyOptional({ example: 'Krótki opis oferty' })
  @StringFieldOptional({ minLength: 0, maxLength: 2000 })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/obraz.jpg' })
  @StringFieldOptional({ minLength: 0, maxLength: 500 })
  imageUrl?: string;

  /** Cena w groszach (np. 99 zł = 9900). Min 2000 (20 zł), max 99999999 (999999.99 zł). */
  @ApiProperty({ example: 9900, description: 'Price in grosze (99 zł = 9900)' })
  @NumberField({
    int: true,
    min: PRICE_GROSZE_MIN,
    max: PRICE_GROSZE_MAX,
    isPositive: false,
  })
  priceGrosze: number;

  /** Czas trwania w minutach. Min 1, max 10080 (7 dni). */
  @ApiProperty({ example: 60, description: 'Duration in minutes' })
  @NumberField({
    int: true,
    min: DURATION_MINUTES_MIN,
    max: DURATION_MINUTES_MAX,
    isPositive: true,
  })
  durationMinutes: number;
}
