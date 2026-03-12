import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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

  @Get('wizard/:wizardId')
  @ApiPublic({ summary: 'Get advertisements by wizard ID' })
  async getByWizardId(@Param('wizardId', ParseIntPipe) wizardId: number) {
    return this.advertisementService.getAdvertisementsByWizardId(wizardId);
  }

  @Get(':id')
  @ApiPublic({ summary: 'Get advertisement by ID' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.advertisementService.getAdvertisementById(id);
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
        const ext = path.extname(part.filename);
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

  @Patch(':id')
  @ApiAuth({ summary: 'Update advertisement (wizard only)' })
  async update(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      title?: string;
      description?: string;
      priceGrosze?: number;
      durationMinutes?: number;
    },
  ) {
    return this.advertisementService.updateAdvertisement(userId, id, body);
  }

  @Delete(':id')
  @ApiAuth({ summary: 'Delete advertisement (wizard only)' })
  async delete(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.advertisementService.deleteAdvertisement(userId, id);
    return { ok: true };
  }
}
