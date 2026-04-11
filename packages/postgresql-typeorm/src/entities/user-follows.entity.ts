import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { UserEntity } from './user.entity';

@Entity('user_follows')
@Index(
  'UQ_user_follows_follower_id_followee_id',
  ['followerId', 'followeeId'],
  {
    unique: true,
  },
)
export class UserFollowsEntity extends AbstractEntity {
  constructor(data?: Partial<UserFollowsEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'PK_user_follows_uid',
  })
  uid!: string;

  @Column({ name: 'follower_id' })
  @Index('UQ_user_follows_follower_id', ['followerId'])
  followerId: string;

  @Column({ name: 'followee_id' })
  @Index('UQ_user_follows_followee_id', ['followeeId'])
  followeeId: string;

  @ManyToOne(() => UserEntity, (user) => user.following)
  @JoinColumn({
    name: 'follower_id',
    referencedColumnName: 'uid',
    foreignKeyConstraintName: 'FK_user_follows_follower_id',
  })
  follower: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.followers)
  @JoinColumn({
    name: 'followee_id',
    referencedColumnName: 'uid',
    foreignKeyConstraintName: 'FK_user_follows_followee_id',
  })
  followee: UserEntity;
}
