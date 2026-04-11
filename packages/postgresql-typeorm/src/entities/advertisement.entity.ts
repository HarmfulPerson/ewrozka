import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
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

  @PrimaryGeneratedColumn({
    primaryKeyConstraintName: 'PK_advertisement_id',
  })
  id!: number;

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
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
  userId!: number;

  @ManyToOne(() => UserEntity, (user) => user.advertisements)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
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
