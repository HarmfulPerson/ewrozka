import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('reminder_log')
@Index(['entityType', 'entityId', 'hoursBefore'], { unique: true })
export class ReminderLogEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_reminder_log_id' })
  id!: number;

  @Column({ name: 'entity_type', type: 'varchar', length: 20 })
  entityType!: 'appointment' | 'guest_booking';

  @Column({ name: 'entity_id', type: 'varchar', length: 36 })
  entityId!: string;

  @Column({ name: 'hours_before', type: 'int' })
  hoursBefore!: number;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt!: Date;
}
