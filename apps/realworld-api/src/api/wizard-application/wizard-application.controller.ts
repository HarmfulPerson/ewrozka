import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiPublic } from '@repo/api/decorators/http.decorators';
import { IsArray, IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { FileFastifyInterceptor, diskStorage } from 'fastify-file-interceptor';
import * as fs from 'fs';
import * as path from 'path';
import { WizardApplicationService } from './wizard-application.service';

class SubmitWizardApplicationDto {
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  username!: string;

  @IsString()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  bio!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{9}$/, { message: 'Numer telefonu musi składać się z dokładnie 9 cyfr.' })
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  topicIds?: number[];

  @IsOptional()
  @IsString()
  gender?: 'female' | 'male';
}

@ApiTags('WizardApplication')
@Controller('wizard-applications')
export class WizardApplicationController {
  constructor(private readonly service: WizardApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiPublic({ summary: 'Złóż wniosek o konto wróżki' })
  async submit(@Body() dto: SubmitWizardApplicationDto): Promise<{ id: string }> {
    return this.service.create(dto);
  }

  @Post(':id/photo')
  @HttpCode(HttpStatus.OK)
  @ApiPublic({ summary: 'Prześlij zdjęcie do wniosku wróżki' })
  @UseInterceptors(
    FileFastifyInterceptor('photo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = path.join(process.cwd(), 'uploads', 'wizard-applications');
          fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `wa_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(null, false);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    const imageUrl = `/uploads/wizard-applications/${file.filename}`;
    await this.service.uploadPhoto(id, imageUrl);
    return { imageUrl };
  }
}
