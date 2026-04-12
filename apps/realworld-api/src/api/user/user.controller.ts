import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  SerializeOptions,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileFastifyInterceptor, diskStorage } from 'fastify-file-interceptor';
import { Throttle } from '@nestjs/throttler';
import { ApiBody, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { CurrentUser } from '@repo/api';
import { ApiAuth, ApiPublic } from '@repo/api/decorators/http.decorators';
import { CreateUserReqDto } from './dto/create-user.dto';
import { UpdateUserReqDto } from './dto/update-user.dto';
import { UserResDto } from './dto/user.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserService } from './user.service';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('User')
@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('user')
  @SerializeOptions({ type: UserResDto })
  @ApiAuth({
    summary: 'Aktualny użytkownik',
    type: UserResDto,
  })
  getCurrent(
    @CurrentUser() currentUser: { id: string; token: string },
  ): Promise<UserResDto> {
    return this.userService.get(currentUser);
  }

  @Post('users')
  @Throttle({ short: { ttl: 60_000, limit: 3 } })
  @ApiPublic({
    type: UserResDto,
    summary: 'Rejestracja',
  })
  @ApiBody({
    description: 'User register request',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          $ref: getSchemaPath(CreateUserReqDto),
        },
      },
      required: ['user'],
    },
  })
  @SerializeOptions({ type: UserResDto })
  async create(@Body('user') userData: CreateUserReqDto): Promise<UserResDto> {
    return this.userService.create(userData);
  }

  @Put('user')
  @SerializeOptions({ type: UserResDto })
  @ApiAuth({
    summary: 'Aktualizuj użytkownika',
    type: UserResDto,
  })
  @ApiBody({
    description: 'User details to update. At least **one** field is required.',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          $ref: getSchemaPath(UpdateUserReqDto),
        },
      },
      required: ['user'],
    },
  })
  async update(
    @CurrentUser('id') userId: string,
    @Body('user') userData: UpdateUserReqDto,
  ): Promise<UserResDto> {
    return this.userService.update(userId, userData);
  }

  @Post('user/change-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60_000, limit: 5 } })
  @ApiAuth({ summary: 'Zmień hasło' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    await this.userService.changePassword(userId, currentPassword, newPassword);
    return { message: 'Hasło zostało zmienione' };
  }

  @Put('user/photos')
  @ApiAuth({ summary: 'Wgraj zdjęcie profilowe' })
  @UseInterceptors(
    FileFastifyInterceptor('image', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const userId = (req as any).user?.id;
          const uploadPath = path.join(process.cwd(), 'uploads', 'users', String(userId));
          fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const ALLOWED_IMG_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
          const ext = path.extname(file.originalname).toLowerCase();
          if (!ALLOWED_IMG_EXT.includes(ext)) {
            return cb(new Error('Dozwolone formaty: JPG, PNG, GIF, WebP'), '');
          }
          const timestamp = Date.now();
          cb(null, `photo_${timestamp}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const ALLOWED_IMG_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (ALLOWED_IMG_MIME.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadPhotos(
    @CurrentUser() currentUser: { id: string; token: string },
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<UserResDto> {
    const imageUrl = `/uploads/users/${currentUser.id}/${file.filename}`;
    const slot: 'image' | 'image2' | 'image3' = req.query?.slot || 'image';
    return this.userService.updateUserImage(currentUser, imageUrl, slot);
  }

  @Post('user/video')
  @ApiAuth({ summary: 'Wgraj film prezentacyjny specjalisty' })
  @UseInterceptors(
    FileFastifyInterceptor('video', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const userId = (req as any).user?.id;
          const uploadPath = path.join(process.cwd(), 'uploads', 'users', String(userId));
          fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const ALLOWED_VID_EXT = ['.mp4', '.mov', '.webm', '.avi'];
          const ext = (path.extname(file.originalname) || '.mp4').toLowerCase();
          if (!ALLOWED_VID_EXT.includes(ext)) {
            return cb(new Error('Dozwolone formaty: MP4, MOV, WebM, AVI'), '');
          }
          cb(null, `intro_${Date.now()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ALLOWED_VID_MIME = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
        if (ALLOWED_VID_MIME.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      },
      limits: {
        fileSize:
          parseInt(process.env.WIZARD_VIDEO_MAX_SIZE_MB ?? '50', 10) * 1024 * 1024,
      },
    }),
  )
  async uploadVideo(
    @CurrentUser() currentUser: { id: string; token: string },
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ videoUrl: string }> {
    const videoUrl = `/uploads/users/${currentUser.id}/${file.filename}`;
    await this.userService.updateUserVideo(currentUser.id, videoUrl);
    this.notificationsService.notifyAdminVideoPending().catch(() => {});
    return { videoUrl };
  }

  @Delete('user/video')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuth({ summary: 'Usuń film prezentacyjny specjalisty' })
  async deleteVideo(@CurrentUser('id') userId: string): Promise<void> {
    await this.userService.updateUserVideo(userId, null as any);
  }

  @Get('user/referral-stats')
  @ApiAuth({ summary: 'Statystyki reflinka' })
  async getReferralStats(@CurrentUser('id') userId: string) {
    return this.userService.getReferralStats(userId);
  }

  @Get('wizards')
  @ApiPublic({ summary: 'Lista specjalistów' })
  async getWizards(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('name') name?: string,
    @Query('topicIds') topicIds?: string,   // przecinkami: "uid1,uid2,uid3"
    @Query('minRating') minRating?: string,
  ) {
    const parsedTopicIds = topicIds
      ? topicIds.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
      : [];

    return this.userService.getWizards(
      limit ? parseInt(limit, 10) : 12,
      offset ? parseInt(offset, 10) : 0,
      {
        name: name || undefined,
        topicIds: parsedTopicIds.length > 0 ? parsedTopicIds : undefined,
        minRating: minRating ? parseFloat(minRating) : undefined,
      },
    );
  }

  @Get('wizards/uid/:uid')
  @ApiPublic({ summary: 'Profil specjalisty po UID' })
  async getWizardByUid(@Param('uid', ParseUUIDPipe) uid: string) {
    return this.userService.getWizardById(uid);
  }

  @Get('topics')
  @ApiPublic({ summary: 'Wszystkie dostępne tematy/specjalizacje' })
  async getTopics() {
    return this.userService.getAllTopics();
  }
}
