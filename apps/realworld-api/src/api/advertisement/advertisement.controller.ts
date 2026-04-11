import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@repo/api';
import { ApiAuth, ApiPublic } from '@repo/api/decorators/http.decorators';
import type { FastifyRequest } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { AdvertisementService } from './advertisement.service';

@ApiTags('Advertisement')
@Controller('advertisements')
export class AdvertisementController {
  constructor(private readonly advertisementService: AdvertisementService) {}

  @Get('mine')
  @ApiAuth({ summary: 'Get my advertisements (wizard)' })
  async getMine(@CurrentUser('id') userId: number) {
    return this.advertisementService.getMyAdvertisements(userId);
  }

  @Get('wizard/uid/:wizardUid')
  @ApiPublic({ summary: "Get advertisements by wizard UID" })
  async getByWizardUid(@Param('wizardUid', ParseUUIDPipe) wizardUid: string) {
    return this.advertisementService.getAdvertisementsByWizardUid(wizardUid);
  }

  @Get('uid/:uid')
  @ApiPublic({ summary: 'Get advertisement by UID' })
  async getByUid(@Param('uid', ParseUUIDPipe) uid: string) {
    return this.advertisementService.getAdvertisementByUid(uid);
  }

  @Post()
  @ApiAuth({ summary: 'Create advertisement (wizard only)' })
  async create(@CurrentUser('id') userId: number, @Req() req: FastifyRequest) {
    const parts = await (req as any).parts();

    let title: string | undefined;
    let description: string | undefined;
    let priceGrosze: number | undefined;
    let durationMinutes: number | undefined;
    let imageFile: { filename: string; filepath: string } | undefined;

    for await (const part of parts) {
      if (part.type === 'field') {
        const fieldValue = (part as any).value;
        if (part.fieldname === 'title') title = fieldValue;
        if (part.fieldname === 'description') description = fieldValue;
        if (part.fieldname === 'priceGrosze')
          priceGrosze = parseInt(fieldValue);
        if (part.fieldname === 'durationMinutes')
          durationMinutes = parseInt(fieldValue);
      } else if (part.type === 'file' && part.fieldname === 'image') {
        const ALLOWED_IMG_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(part.filename).toLowerCase();
        if (!ALLOWED_IMG_EXT.includes(ext)) {
          throw new BadRequestException('Dozwolone formaty zdjęć: JPG, PNG, GIF, WebP');
        }
        const timestamp = Date.now();
        const filename = `ad_${timestamp}${ext}`;
        const uploadPath = path.join(
          process.cwd(),
          'uploads',
          'advertisements',
          'temp',
        );
        fs.mkdirSync(uploadPath, { recursive: true });
        const filepath = path.join(uploadPath, filename);

        await pipeline(part.file, fs.createWriteStream(filepath));
        imageFile = { filename, filepath };
      }
    }

    if (!title || !description || !priceGrosze || !durationMinutes) {
      throw new BadRequestException(
        'Brak wymaganych pól: tytuł, opis, cena i czas trwania.',
      );
    }

    const result = await this.advertisementService.createAdvertisement(userId, {
      title,
      description,
      priceGrosze,
      durationMinutes,
    });

    // Przenieś plik do właściwego folderu
    if (imageFile) {
      const adId = result.advertisement.id;
      const finalPath = path.join(
        process.cwd(),
        'uploads',
        'advertisements',
        String(adId),
      );
      fs.mkdirSync(finalPath, { recursive: true });

      const newFilePath = path.join(finalPath, imageFile.filename);
      fs.renameSync(imageFile.filepath, newFilePath);

      const imageUrl = `/uploads/advertisements/${adId}/${imageFile.filename}`;

      // Aktualizuj imageUrl w bazie
      await this.advertisementService.updateAdvertisementImage(adId, imageUrl);
      result.advertisement.imageUrl = imageUrl;
    }

    return result;
  }

  @Patch('uid/:uid')
  @ApiAuth({ summary: 'Update advertisement (wizard only)' })
  async update(
    @CurrentUser('id') userId: number,
    @Param('uid', ParseUUIDPipe) uid: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      priceGrosze?: number;
      durationMinutes?: number;
    },
  ) {
    return this.advertisementService.updateAdvertisementByUid(userId, uid, body);
  }

  @Delete('uid/:uid')
  @ApiAuth({ summary: 'Delete advertisement (wizard only)' })
  async delete(
    @CurrentUser('id') userId: number,
    @Param('uid', ParseUUIDPipe) uid: string,
  ) {
    await this.advertisementService.deleteAdvertisementByUid(userId, uid);
    return { ok: true };
  }
}
