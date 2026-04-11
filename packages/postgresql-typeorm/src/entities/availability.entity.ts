import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
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

  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'PK_availability_uid',
  })
  uid!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'uid',
    foreignKeyConstraintName: 'FK_availability_user',
  })
  user!: Relation<UserEntity>;
}
