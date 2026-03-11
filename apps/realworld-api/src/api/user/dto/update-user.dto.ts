import { EmailFieldOptional, StringFieldOptional } from '@repo/api';
import { lowerCaseTransformer } from '@repo/nest-common';
import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsOptional } from 'class-validator';

export class UpdateUserReqDto {
  @StringFieldOptional()
  @Transform(lowerCaseTransformer)
  readonly username: string;

  @EmailFieldOptional()
  readonly email: string;

  @StringFieldOptional({ minLength: 0 })
  readonly bio: string;

  @StringFieldOptional({ minLength: 0 })
  readonly image: string;

  @StringFieldOptional({ minLength: 0 })
  readonly image2: string;

  @StringFieldOptional({ minLength: 0 })
  readonly image3: string;

  /** ID specjalizacji (topics) dla wróżek */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  readonly topicIds?: number[];
}
