import { ProfileDto } from '@/api/profile/dto/profile.dto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
    userId: number,
  ): Promise<CommentResDto> {
    const article = await this.articleRepository.findOneBy({ slug: slug });

    if (!article) {
      throw new NotFoundException('Artykuł nie istnieje');
    }

    const user = await this.userRepository.findOneByOrFail({ id: userId });
    const comment = new CommentEntity({
      body: commentData.body,
      articleId: article.id,
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
      throw new NotFoundException('Artykuł nie istnieje');
    }

    const comments = await this.commentRepository.find({
      where: { articleId: article.id },
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

  async delete(commentId: number, userId: number) {
    const comment = await this.commentRepository.findOneBy({
      id: commentId,
    });

    if (!comment) {
      throw new NotFoundException('Komentarz nie istnieje');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException(
        'Nie masz uprawnień do usunięcia tego komentarza',
      );
    }

    await this.commentRepository.remove(comment);
  }
}
