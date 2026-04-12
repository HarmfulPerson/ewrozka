import { ApiPropertyOptional } from '@nestjs/swagger';
import { StringFieldOptional } from '@repo/api';
import { IsOptional, Matches, ValidateIf } from 'class-validator';

export class CreateMeetingRequestReqDto {
  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'UID ogłoszenia' })
  @StringFieldOptional()
  advertisementUid?: string;

  /** Żądana data i godzina rozpoczęcia (ISO 8601). Gdy podane, rezerwacja na konkretny slot. */
  @ApiPropertyOptional({
    example: '2025-02-15T10:00:00.000Z',
    description: 'Data i godzina rozpoczęcia (ISO)',
  })
  @StringFieldOptional()
  @ValidateIf((o) => !o.preferredDate)
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, {
    message: 'requestedStartsAt musi być w formacie ISO (np. 2025-02-15T10:00:00)',
  })
  requestedStartsAt?: string;

  /** Preferowana data (gdy brak requestedStartsAt). */
  @ApiPropertyOptional({
    example: '2025-02-15',
    description: 'Preferowana data (YYYY-MM-DD)',
  })
  @StringFieldOptional()
  @IsOptional()
  @ValidateIf((o) => !o.requestedStartsAt)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'preferredDate musi być w formacie YYYY-MM-DD',
  })
  preferredDate?: string;

  @ApiPropertyOptional({ example: 'Wolałbym popołudnie', maxLength: 1000 })
  @StringFieldOptional({ minLength: 0, maxLength: 1000 })
  message?: string;
}
