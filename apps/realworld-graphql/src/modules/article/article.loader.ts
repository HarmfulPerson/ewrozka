import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArticleEntity, UserEntity } from '@repo/postgresql-typeorm';
import DataLoader from 'dataloader';
import { In, Repository } from 'typeorm';

@Injectable({ scope: Scope.REQUEST })
export class ArticleDataLoader {
  private authorLoader: DataLoader<string, UserEntity>;
  private favoritesLoader: DataLoader<
    string,
    { favorited: boolean; count: number }
  >;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ArticleEntity)
    private readonly articleRepository: Repository<ArticleEntity>,
  ) {}

  getAuthorLoader() {
    if (!this.authorLoader) {
      this.authorLoader = new DataLoader<string, UserEntity>(
        async (authorIds: readonly string[]) => {
          const authors = await this.userRepository.find({
            where: { uid: In([...authorIds]) },
            relations: ['followers'],
          });
          return authorIds.map((uid) =>
            authors.find((author) => author.uid === uid),
          );
        },
      );
    }
    return this.authorLoader;
  }

  getFavoritesLoader(userId: string) {
    if (!this.favoritesLoader) {
      this.favoritesLoader = new DataLoader<
        string,
        { favorited: boolean; count: number }
      >(async (articleIds: readonly string[]) => {
        const articles = await this.articleRepository
          .createQueryBuilder('article')
          .select('article.uid', 'uid')
          .leftJoinAndSelect('article.favoritedBy', 'favoritedBy')
          .where('article.uid IN (:...articleIds)', {
            articleIds: [...articleIds],
          })
          .getMany();

        return articleIds.map((uid) => {
          const article = articles.find((a) => a.uid === uid);
          return {
            favorited:
              article?.favoritedBy?.some((u) => u.uid === userId) || false,
            count: article?.favoritedBy?.length || 0,
          };
        });
      });
    }
    return this.favoritesLoader;
  }
}
