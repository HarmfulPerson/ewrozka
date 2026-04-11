import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { UserEntity } from './user.entity';

@Entity('advertisement')
export class AdvertisementEntity extends AbstractEntity {
  constructor(data?: Partial<AdvertisementEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'PK_advertisement_uid',
  })
  uid!: string;

  @Column()
  title!: string;

  @Column({ default: '' })
  description!: string;

  @Column({ name: 'image_url', default: '' })
  imageUrl!: string;

  /** Cena w groszach (np. 99 zł = 9900) */
  @Column({ name: 'price_grosze', type: 'int', default: 0 })
  priceGrosze!: number;

  /** Czas trwania w minutach */
  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes!: number;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.advertisements)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'uid',
    foreignKeyConstraintName: 'FK_advertisement_user',
  })
  user!: Relation<UserEntity>;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  updatedAt!: Date;
}
