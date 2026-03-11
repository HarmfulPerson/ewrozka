import { EmailType } from './email-type.enum';

export interface EmailJob {
  type: EmailType;
  to: string;
  subject: string;
  context: Record<string, unknown>;
}
