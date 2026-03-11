import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { UserEntity } from './user.entity';
import { AppointmentEntity } from './appointment.entity';

@Entity('transaction')
@Index('IDX_transaction_user', ['userId'])
@Index('IDX_transaction_appointment', ['appointmentId'])
@Index('IDX_transaction_created_at', ['createdAt'])
export class TransactionEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_transaction_id' })
  id!: number;

  @Column({ name: 'user_id', comment: 'Wizard (recipient) ID' })
  userId!: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_transaction_user' })
  user!: Relation<UserEntity>;

  @Column({ name: 'appointment_id', nullable: true })
  appointmentId!: number | null;

  @ManyToOne(() => AppointmentEntity, { nullable: true })
  @JoinColumn({ name: 'appointment_id', foreignKeyConstraintName: 'FK_transaction_appointment' })
  appointment!: Relation<AppointmentEntity> | null;

  @Column({ name: 'total_amount', type: 'bigint', comment: 'Total amount paid by client in grosze' })
  totalAmount!: number;

  @Column({ name: 'platform_fee', type: 'bigint', comment: 'Platform fee in grosze' })
  platformFee!: number;

  @Column({ name: 'wizard_amount', type: 'bigint', comment: 'Amount credited to wizard in grosze' })
  wizardAmount!: number;

  @Column({ type: 'varchar', length: 50, default: 'payment' })
  type!: string; // 'payment', 'refund', etc.

  @Column({ type: 'varchar', length: 50, default: 'completed' })
  status!: string; // 'completed', 'pending', 'failed'

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
