import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ArticleEntity, TagEntity, UserEntity } from '@repo/postgresql-typeorm';
import { Repository } from 'typeorm';
import { ArticleService } from './article.service';

describe('ArticleService', () => {
  let service: ArticleService;
  let articleRepositoryValue: Partial<
    Record<keyof Repository<ArticleEntity>, jest.Mock>
  >;
  let tagRepositoryValue: Partial<
    Record<keyof Repository<TagEntity>, jest.Mock>
  >;
  let userRepositoryValue: Partial<
    Record<keyof Repository<UserEntity>, jest.Mock>
  >;

  beforeAll(async () => {
    articleRepositoryValue = {
      findOne: jest.fn(),
    };

    tagRepositoryValue = {
      find: jest.fn(),
    };

    userRepositoryValue = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: getRepositoryToken(ArticleEntity),
          useValue: articleRepositoryValue,
        },
        {
          provide: getRepositoryToken(TagEntity),
          useValue: tagRepositoryValue,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepositoryValue,
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
