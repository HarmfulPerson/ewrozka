import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity, UserFollowsEntity } from '@repo/postgresql-typeorm';
import { Repository } from 'typeorm';
import { ProfileDto, ProfileResDto } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserFollowsEntity)
    private readonly userFollowRepository: Repository<UserFollowsEntity>,
  ) {}

  async getProfile(userId: string, username: string): Promise<ProfileResDto> {
    // Get the profile of the target user
    const targetProfile = await this.userRepository.findOneBy({ username });

    if (!targetProfile) {
      throw new NotFoundException('Profil nie istnieje');
    }

    const profile: ProfileDto = {
      username: targetProfile.username,
      bio: targetProfile.bio,
      image: targetProfile.image,
      following: false,
    };

    // Check if the user is following the target user
    if (userId && userId !== targetProfile.uid) {
      const follows = await this.userRepository.find({
        select: {
          uid: true,
          following: {
            uid: true,
            followeeId: true,
          },
        },
        where: {
          uid: userId,
          following: { followeeId: targetProfile.uid },
        },
        relations: ['following'],
      });

      profile.following = !!follows[0];
    }

    return {
      profile,
    };
  }

  async follow(userId: string, username: string): Promise<ProfileResDto> {
    // Find the user who wants to follow
    // And check if the user is already following the target user
    const [user] = await this.userRepository.find({
      select: {
        uid: true,
        username: true,
        following: {
          uid: true,
          followee: {
            username: true,
          },
        },
      },
      where: { uid: userId, following: { followee: { username: username } } },
      relations: {
        following: {
          followee: true,
        },
      },
    });

    if (user && user.following.length > 0) {
      throw new BadRequestException('Obserwujesz już tego użytkownika');
    }

    // Find the user to follow
    const followingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (!followingUser) {
      throw new NotFoundException('Profil nie istnieje');
    }

    // Add the user to follow to the following list
    const userFollows = new UserFollowsEntity({
      followerId: userId,
      followeeId: followingUser.uid,
    });

    await this.userFollowRepository.save(userFollows);

    const profile: ProfileDto = {
      username: followingUser.username,
      bio: followingUser.bio,
      image: followingUser.image,
      following: true,
    };

    return {
      profile,
    };
  }

  async unfollow(userId: string, username: string): Promise<ProfileResDto> {
    // Find the user who wants to unfollow
    const user = await this.userRepository.findOne({
      where: { uid: userId },
    });

    if (!user) {
      throw new NotFoundException('Użytkownik nie istnieje');
    }

    // Find the user to unfollow
    const followUser = await this.userRepository.findOne({
      where: { username },
    });

    if (!followUser) {
      throw new NotFoundException('Profil nie istnieje');
    }

    // Find relationship between the user and the user to unfollow
    const userFollow = await this.userFollowRepository.findOne({
      where: { followerId: userId, followeeId: followUser.uid },
    });

    if (!userFollow) {
      throw new BadRequestException('Nie obserwujesz tego użytkownika');
    }

    await this.userFollowRepository.delete(userFollow.uid);

    const profile: ProfileDto = {
      username: followUser.username,
      bio: followUser.bio,
      image: followUser.image,
      following: false,
    };

    return {
      profile,
    };
  }
}
