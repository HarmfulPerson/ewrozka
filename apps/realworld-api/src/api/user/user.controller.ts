import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  SerializeOptions,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileFastifyInterceptor, diskStorage } from 'fastify-file-interceptor';
import { ApiBody, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { CurrentUser } from '@repo/api';
import { ApiAuth, ApiPublic } from '@repo/api/decorators/http.decorators';
import { CreateUserReqDto } from './dto/create-user.dto';
import { UpdateUserReqDto } from './dto/update-user.dto';
import { UserResDto } from './dto/user.dto';
import { UserService } from './user.service';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('User')
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('user')
  @SerializeOptions({ type: UserResDto })
  @ApiAuth({
    summary: 'Get Current User',
    type: UserResDto,
  })
  getCurrent(
    @CurrentUser() currentUser: { id: number; token: string },
  ): Promise<UserResDto> {
    return this.userService.get(currentUser);
  }

  @Post('users')
  @ApiPublic({
    type: UserResDto,
    summary: 'Registration',
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
    summary: 'Update User',
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
    @CurrentUser('id') userId: number,
    @Body('user') userData: UpdateUserReqDto,
  ): Promise<UserResDto> {
    return this.userService.update(userId, userData);
  }

  @Post('user/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiAuth({ summary: 'Change user password' })
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    await this.userService.changePassword(userId, currentPassword, newPassword);
    return { message: 'Hasło zostało zmienione' };
  }

  @Put('user/photos')
  @ApiAuth({ summary: 'Upload user avatar photo' })
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
          const ext = path.extname(file.originalname);
          const timestamp = Date.now();
          cb(null, `photo_${timestamp}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
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
    @CurrentUser() currentUser: { id: number; token: string },
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<UserResDto> {
    const imageUrl = `/uploads/users/${currentUser.id}/${file.filename}`;
    const slot: 'image' | 'image2' | 'image3' = req.query?.slot || 'image';
    return this.userService.updateUserImage(currentUser, imageUrl, slot);
  }

  @Post('user/video')
  @ApiAuth({ summary: 'Upload wizard intro video' })
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
          const ext = path.extname(file.originalname) || '.mp4';
          cb(null, `intro_${Date.now()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
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
    @CurrentUser() currentUser: { id: number; token: string },
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ videoUrl: string }> {
    const videoUrl = `/uploads/users/${currentUser.id}/${file.filename}`;
    await this.userService.updateUserVideo(currentUser.id, videoUrl);
    return { videoUrl };
  }

  @Delete('user/video')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuth({ summary: 'Delete wizard intro video' })
  async deleteVideo(@CurrentUser('id') userId: number): Promise<void> {
    await this.userService.updateUserVideo(userId, null as any);
  }

  @Get('wizards')
  @ApiPublic({ summary: 'Get list of wizards (fortune tellers)' })
  async getWizards(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('name') name?: string,
    @Query('topicIds') topicIds?: string,   // przecinkami: "1,3,5"
    @Query('minRating') minRating?: string,
  ) {
    const parsedTopicIds = topicIds
      ? topicIds.split(',').map(Number).filter(n => !isNaN(n) && n > 0)
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

  @Get('wizards/:id')
  @ApiPublic({ summary: 'Get wizard profile by ID' })
  async getWizard(@Param('id', ParseIntPipe) id: number) {
    return this.userService.getWizardById(id);
  }

  @Get('topics')
  @ApiPublic({ summary: 'Get all available topics/specializations' })
  async getTopics() {
    return this.userService.getAllTopics();
  }
}
