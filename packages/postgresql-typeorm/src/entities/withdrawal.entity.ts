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

@Entity('withdrawal')
@Index('IDX_withdrawal_user', ['userId'])
export class WithdrawalEntity {

  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'PK_withdrawal_uid',
  })
  uid!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_withdrawal_user' })
  user!: Relation<UserEntity>;

  @Column({ name: 'amount_grosze', type: 'bigint', comment: 'Amount in grosze (1/100 PLN)' })
  amountGrosze!: number;

  @Column({ name: 'stripe_account_id', type: 'varchar', length: 100 })
  stripeAccountId!: string;

  @Column({ name: 'stripe_transfer_id', type: 'varchar', length: 100, nullable: true })
  stripeTransferId!: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'processing',
    comment: 'processing | completed | failed',
  })
  status!: string;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
