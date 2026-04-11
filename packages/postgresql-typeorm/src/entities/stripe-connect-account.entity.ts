import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('stripe_connect_account')
@Index('IDX_stripe_connect_user', ['userId'], { unique: true })
export class StripeConnectAccountEntity {

  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'PK_stripe_connect_uid',
  })
  uid!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_stripe_connect_user' })
  user!: Relation<UserEntity>;

  @Column({ name: 'stripe_account_id', type: 'varchar', length: 100 })
  stripeAccountId!: string;

  @Column({ name: 'onboarding_completed', type: 'boolean', default: false })
  onboardingCompleted!: boolean;

  @Column({ name: 'charges_enabled', type: 'boolean', default: false })
  chargesEnabled!: boolean;

  @Column({ name: 'payouts_enabled', type: 'boolean', default: false })
  payoutsEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
