import { IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CompleteGoogleRegistrationDto {
  @IsString()
  tempToken!: string;

  @IsString()
  role!: 'client' | 'wizard';

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  topicIds?: string[];

  @IsOptional()
  @IsString()
  gender?: 'female' | 'male';

  @IsOptional()
  @IsString()
  referralCode?: string;
}
