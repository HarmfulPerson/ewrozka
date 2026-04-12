import { ClassField, EmailField, StringField } from '@repo/api';
import { Expose } from 'class-transformer';

export class UserDto {
  /**
   * Stable, non-sequential identifier (uuid). Primary key and public id.
   */
  @StringField({ expose: true })
  uid: string;

  @EmailField({ expose: true })
  email: string;

  @StringField({ expose: true, nullable: true })
  token: string | null;

  @Expose()
  emailVerified?: boolean;

  @StringField({ expose: true })
  username: string;

  @StringField({ expose: true })
  bio: string;

  @StringField({ expose: true })
  image: string;

  @StringField({ expose: true, nullable: true })
  image2?: string;

  @StringField({ expose: true, nullable: true })
  image3?: string;

  /** Nazwy ról użytkownika (np. ['wizard'], ['client']) */
  @Expose()
  roles: string[];

  @Expose()
  topicIds?: string[];

  @Expose()
  topicNames?: string[];

  @Expose()
  gender?: 'female' | 'male' | null;
}

export class UserResDto {
  @ClassField(() => UserDto, { expose: true })
  user: UserDto;
}
