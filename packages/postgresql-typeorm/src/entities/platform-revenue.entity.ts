import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AbstractEntity } from './abstract.entity';

@Entity('platform_revenue')
@Index('IDX_platform_revenue_date', ['date'])
export class PlatformRevenueEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_platform_revenue_id' })
  id!: number;

  @Column({ type: 'date', unique: true })
  date!: string; // Format: YYYY-MM-DD

  @Column({ name: 'total_fees', type: 'bigint', default: 0, comment: 'Total platform fees collected in grosze' })
  totalFees!: number;

  @Column({ name: 'total_wizard_payouts', type: 'bigint', default: 0, comment: 'Total amount paid to wizards in grosze' })
  totalWizardPayouts!: number;

  @Column({ name: 'total_volume', type: 'bigint', default: 0, comment: 'Total transaction volume in grosze' })
  totalVolume!: number;

  @Column({ name: 'transaction_count', type: 'int', default: 0 })
  transactionCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
