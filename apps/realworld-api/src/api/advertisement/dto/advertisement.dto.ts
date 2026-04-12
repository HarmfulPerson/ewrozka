import {
  ClassField,
  DateFieldOptional,
  NumberField,
  StringField,
  StringFieldOptional,
} from '@repo/api';

export class AdvertisementAuthorDto {
  @StringField({ expose: true })
  uid: string;

  @StringField({ expose: true })
  username: string;
}

export class AdvertisementDto {
  @StringField({ expose: true })
  uid: string;

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

  @StringField({ expose: true })
  userId: string;

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
