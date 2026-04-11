import { Column, Entity, Index, ManyToMany, PrimaryColumn } from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { UserEntity } from './user.entity';

@Entity('topic')
export class TopicEntity extends AbstractEntity {

  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'PK_topic_uid',
  })
  uid!: string;

  @Column()
  @Index('UQ_topic_name', ['name'], { unique: true })
  name!: string;

  @ManyToMany(() => UserEntity, (user) => user.topics)
  users!: UserEntity[];
}
