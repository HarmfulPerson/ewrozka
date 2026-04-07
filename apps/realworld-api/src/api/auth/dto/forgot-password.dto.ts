import { EmailField } from '@repo/api';

export class ForgotPasswordDto {
  @EmailField()
  readonly email: string;
}
