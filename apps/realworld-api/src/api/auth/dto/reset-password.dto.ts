import { PasswordField, StringField } from '@repo/api';

export class ResetPasswordDto {
  @StringField()
  readonly token: string;

  @PasswordField()
  readonly password: string;
}
