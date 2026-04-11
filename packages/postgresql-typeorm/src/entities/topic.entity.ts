import { Column, Entity, Index, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { UserEntity } from './user.entity';

@Entity('topic')
export class TopicEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_topic_id' })
  id!: number;

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  uid!: string;

  @Column()
  @Index('UQ_topic_name', ['name'], { unique: true })
  name!: string;

  @ManyToMany(() => UserEntity, (user) => user.topics)
  users!: UserEntity[];
}
