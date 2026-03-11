import {
  ClassField,
  DateFieldOptional,
  NumberField,
  StringField,
  StringFieldOptional,
} from '@repo/api';

export class AdvertisementAuthorDto {
  @NumberField({ expose: true })
  id: number;

  @StringField({ expose: true })
  username: string;
}

export class AdvertisementDto {
  @NumberField({ expose: true })
  id: number;

  @StringField({ expose: true })
  title: string;

  @StringFieldOptional({ expose: true })
  description?: string;

  @StringFieldOptional({ expose: true })
  imageUrl?: string;

  /** Cena w groszach */
  @NumberField({ expose: true })
  priceGrosze: number;

  /** Czas trwania w minutach */
  @NumberField({ expose: true })
  durationMinutes: number;

  @DateFieldOptional({ expose: true })
  createdAt?: Date;

  @DateFieldOptional({ expose: true })
  updatedAt?: Date;

  @NumberField({ expose: true })
  userId: number;

  author?: AdvertisementAuthorDto;
}

export class AdvertisementResDto {
  @ClassField(() => AdvertisementDto, { expose: true })
  advertisement: AdvertisementDto;
}

export class AdvertisementListResDto {
  @ClassField(() => AdvertisementDto, { isArray: true, expose: true })
  advertisements: AdvertisementDto[];

  @NumberField({ expose: true })
  advertisementsCount: number;
}
