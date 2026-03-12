import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EmailField, StringField, StringFieldOptional } from '@repo/api';
import { ApiPublic } from '@repo/api/decorators/http.decorators';
import { ContactRateLimitGuard } from './contact-rate-limit.guard';
import { ContactService } from './contact.service';

export class ContactFormDto {
  @StringFieldOptional()
  name?: string;

  @EmailField()
  email!: string;

  @StringFieldOptional()
  subject?: string;

  @StringField()
  message!: string;
}

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(ContactRateLimitGuard)
  @ApiPublic({ summary: 'Wyślij wiadomość z formularza kontaktowego' })
  async submit(@Body() dto: ContactFormDto) {
    return this.contactService.submit(dto);
  }
}
