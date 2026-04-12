import { ProfileDto } from '@/api/profile/dto/profile.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ValidationException } from '@repo/api';
import {
  ArticleEntity,
  CommentEntity,
  UserEntity,
} from '@repo/postgresql-typeorm';
import { Repository } from 'typeorm';
import { CommentListResDto } from './dto/comment-list.dto';
import { CommentResDto } from './dto/comment.dto';
import { CreateCommentReqDto } from './dto/create-comment.dto';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(ArticleEntity)
    private readonly articleRepository: Repository<ArticleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
  ) {}

  async create(
    slug: string,
    commentData: CreateCommentReqDto,
    userId: string,
  ): Promise<CommentResDto> {
    const article = await this.articleRepository.findOneBy({ slug: slug });

    if (!article) {
      throw new ValidationException(ErrorCode.E201);
    }

    const user = await this.userRepository.findOneByOrFail({ uid: userId });
    const comment = new CommentEntity({
      body: commentData.body,
      articleId: article.uid,
      authorId: userId,
    });

    const savedComment = await this.commentRepository.save(comment);

    return {
      comment: {
        ...savedComment,
        author: user.toDto(ProfileDto),
      },
    };
  }

  async list(slug: string): Promise<CommentListResDto> {
    const article = await this.articleRepository.findOneBy({ slug: slug });

    if (!article) {
      throw new ValidationException(ErrorCode.E201);
    }

    const comments = await this.commentRepository.find({
      where: { articleId: article.uid },
      relations: ['author'],
    });

    return {
      comments: comments.map((comment) => {
        return {
          ...comment,
          author: comment.author.toDto(ProfileDto),
        };
      }),
    };
  }

  async delete(commentUid: string, userId: string) {
    const comment = await this.commentRepository.findOneBy({
      uid: commentUid,
    });

    if (!comment) {
      throw new ValidationException(ErrorCode.E301);
    }

    if (comment.authorId !== userId) {
      throw new ValidationException(ErrorCode.E302);
    }

    await this.commentRepository.remove(comment);
  }
}
