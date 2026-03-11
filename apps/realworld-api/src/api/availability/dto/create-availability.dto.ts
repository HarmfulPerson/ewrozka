import { ApiProperty } from '@nestjs/swagger';
import { StringField } from '@repo/api';
import { Matches } from 'class-validator';

export class CreateAvailabilityReqDto {
  @ApiProperty({
    example: '2025-02-15T09:00:00.000Z',
    description: 'Początek bloku (ISO 8601)',
  })
  @StringField()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, {
    message: 'startsAt w formacie ISO',
  })
  startsAt: string;

  @ApiProperty({
    example: '2025-02-15T17:00:00.000Z',
    description: 'Koniec bloku (ISO 8601)',
  })
  @StringField()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, {
    message: 'endsAt w formacie ISO',
  })
  endsAt: string;
}
