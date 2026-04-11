import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { PlatformFeeConfigEntity } from './platform-fee-config.entity';

@Entity('platform_fee_tier')
export class PlatformFeeTierEntity {

  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'PK_platform_fee_tier_uid',
  })
  uid!: string;

  @Column({ name: 'config_id', type: 'int' })
  configId!: string;

  @ManyToOne(() => PlatformFeeConfigEntity, (c) => c.tiers, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'config_id',
    foreignKeyConstraintName: 'FK_platform_fee_tier_config',
  })
  config!: Relation<PlatformFeeConfigEntity>;

  @Column({ name: 'min_meetings', type: 'int', default: 0 })
  minMeetings!: number;

  @Column({ name: 'max_meetings', type: 'int', nullable: true })
  maxMeetings!: number | null;

  @Column({ name: 'fee_percent', type: 'smallint' })
  feePercent!: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
