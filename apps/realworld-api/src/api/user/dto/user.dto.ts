import { ClassField, EmailField, NumberField, StringField } from '@repo/api';
import { Expose } from 'class-transformer';

export class UserDto {
  @NumberField({ expose: true })
  id: number;

  /**
   * Stable, non-sequential external identifier. Prefer this over `id` in
   * public URLs and cross-service references. `id` will be dropped in a
   * future phase of the uid migration.
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
  topicIds?: number[];

  @Expose()
  topicNames?: string[];

  @Expose()
  gender?: 'female' | 'male' | null;
}

export class UserResDto {
  @ClassField(() => UserDto, { expose: true })
  user: UserDto;
}
