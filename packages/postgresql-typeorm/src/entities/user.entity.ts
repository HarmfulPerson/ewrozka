import { hashPassword as hashPass } from '@repo/nest-common';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { AdvertisementEntity } from './advertisement.entity';
import { ArticleEntity } from './article.entity';
import { CommentEntity } from './comment.entity';
import { RoleEntity } from './role.entity';
import { TopicEntity } from './topic.entity';
import { UserFollowsEntity } from './user-follows.entity';

@Entity('user')
export class UserEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_user_id' })
  id!: number;

  @Column()
  @Index('UQ_user_username', ['username'], { unique: true })
  username!: string;

  @Column()
  @Index('UQ_user_email', ['email'], { unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ default: '' })
  image!: string;

  @Column({ default: '' })
  image2!: string;

  @Column({ default: '' })
  image3!: string;

  @Column({ default: '' })
  bio!: string;

  @Column({ default: false })
  emailVerified!: boolean;

  /**
   * Płeć użytkownika: 'female' | 'male'. Używane do filtrowania (np. wróżki).
   */
  @Column({
    name: 'gender',
    type: 'varchar',
    length: 10,
    nullable: true,
    default: null,
  })
  gender!: 'female' | 'male' | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /**
   * Numer telefonu (tylko wróżki, format +48XXXXXXXXX). Nie jest eksponowany publicznie.
   */
  @Column({
    name: 'phone',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: null,
  })
  phone!: string | null;

  /**
   * Status wniosku wróżki: null = klient/admin, 'pending' = oczekuje, 'approved' = zatwierdzony, 'rejected' = odrzucony.
   */
  /**
   * URL do zatwierdzonego filmiku-wizytówki wróżki (max 30s). Widoczny publicznie.
   */
  @Column({
    name: 'video',
    type: 'varchar',
    length: 500,
    nullable: true,
    default: null,
  })
  video!: string | null;

  /**
   * URL do filmiku oczekującego na zatwierdzenie przez admina. Nie jest widoczny publicznie.
   */
  @Column({
    name: 'video_pending',
    type: 'varchar',
    length: 500,
    nullable: true,
    default: null,
  })
  videoPending!: string | null;

  @Column({
    name: 'wizard_application_status',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: null,
  })
  wizardApplicationStatus!: 'pending' | 'approved' | 'rejected' | null;

  @Column({ type: 'varchar', length: 64, nullable: true, default: null })
  emailVerificationToken!: string | null;

  /** Google OAuth ID – użytkownicy zarejestrowani przez Google */
  @Column({
    name: 'google_id',
    type: 'varchar',
    length: 64,
    nullable: true,
    default: null,
  })
  @Index('UQ_user_google_id', { unique: true, where: '"google_id" IS NOT NULL' })
  googleId!: string | null;

  /** Unikalny kod polecający – generowany automatycznie przy tworzeniu konta. */
  @Column({
    name: 'referral_code',
    type: 'varchar',
    length: 12,
    nullable: true,
    default: null,
  })
  @Index('UQ_user_referral_code', { unique: true, where: '"referral_code" IS NOT NULL' })
  referralCode!: string | null;

  /** ID użytkownika, który polecił tego użytkownika. */
  @Column({
    name: 'referred_by',
    type: 'int',
    nullable: true,
    default: null,
  })
  referredBy!: number | null;

  /**
   * Prowizja platformy w % (tylko wróżki, 0–100). Null = domyślnie 20%.
   * Ustawiane przez admina.
   */
  @Column({
    name: 'platform_fee_percent',
    type: 'smallint',
    nullable: true,
    default: null,
  })
  platformFeePercent!: number | null;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Hashuj tylko jeśli hasło nie jest jeszcze hashem argon2
    // (argon2 zawsze zaczyna się od "$argon2")
    if (this.password && !this.password.startsWith('$argon2')) {
      this.password = await hashPass(this.password);
    }
  }

  @OneToMany(() => ArticleEntity, (article) => article.author)
  articles: Relation<ArticleEntity[]>;

  @OneToMany(() => CommentEntity, (comment) => comment.author)
  comments: Relation<CommentEntity[]>;

  @ManyToMany(() => RoleEntity, (role) => role.users)
  @JoinTable({
    name: 'user_role',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_user_role_user',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_user_role_role',
    },
  })
  roles!: Relation<RoleEntity[]>;

  @ManyToMany(() => ArticleEntity, (article) => article.favoritedBy)
  @JoinTable({
    name: 'user_favorites',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_user_favorites_user',
    },
    inverseJoinColumn: {
      name: 'article_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_user_favorites_article',
    },
  })
  favorites: Relation<ArticleEntity[]>;

  @OneToMany(() => AdvertisementEntity, (ad) => ad.user)
  advertisements: Relation<AdvertisementEntity[]>;

  @OneToMany(() => UserFollowsEntity, (userFollow) => userFollow.follower)
  following: Relation<UserFollowsEntity[]>;

  @OneToMany(() => UserFollowsEntity, (userFollow) => userFollow.followee)
  followers: Relation<UserFollowsEntity[]>;

  @ManyToMany(() => TopicEntity, (topic) => topic.users)
  @JoinTable({
    name: 'user_topic',
    joinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_user_topic_user',
    },
    inverseJoinColumn: {
      name: 'topic_id',
      referencedColumnName: 'id',
      foreignKeyConstraintName: 'FK_user_topic_topic',
    },
  })
  topics!: Relation<TopicEntity[]>;
}
