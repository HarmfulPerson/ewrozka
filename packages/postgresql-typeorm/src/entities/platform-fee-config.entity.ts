import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { PlatformFeeTierEntity } from './platform-fee-tier.entity';

@Entity('platform_fee_config')
export class PlatformFeeConfigEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_platform_fee_config_id' })
  id!: number;

  @Column({ name: 'window_days', type: 'int', default: 90 })
  windowDays!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => PlatformFeeTierEntity, (t) => t.config)
  tiers!: Relation<PlatformFeeTierEntity[]>;
}
