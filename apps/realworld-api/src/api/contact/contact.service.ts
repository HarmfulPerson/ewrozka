import { BadRequestException, Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';

export interface ContactFormDto {
  name?: string;
  email: string;
  subject?: string;
  message: string;
}

@Injectable()
export class ContactService {
  constructor(private readonly emailService: EmailService) {}

  async submit(dto: ContactFormDto): Promise<{ success: boolean }> {
    const name = (dto.name ?? '').trim() || 'Anonim';
    const email = (dto.email ?? '').trim();
    const subject = (dto.subject ?? '').trim();
    const message = (dto.message ?? '').trim();

    if (!email || !message) {
      throw new BadRequestException('E-mail i wiadomość są wymagane.');
    }

    await this.emailService.sendContactForm(name, email, subject, message);

    return { success: true };
  }
}
