import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { UserEntity } from './user.entity';

@Entity('availability')
export class AvailabilityEntity extends AbstractEntity {
  constructor(data?: Partial<AvailabilityEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn({
    primaryKeyConstraintName: 'PK_availability_id',
  })
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_availability_user',
  })
  user!: Relation<UserEntity>;
}
