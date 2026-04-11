import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('reminder_log')
@Index(['entityType', 'entityId', 'hoursBefore'], { unique: true })
export class ReminderLogEntity {

  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'PK_reminder_log_uid',
  })
  uid!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 20 })
  entityType!: 'appointment' | 'guest_booking';

  @Column({ name: 'entity_id', type: 'varchar', length: 36 })
  entityId!: string;

  @Column({ name: 'hours_before', type: 'int' })
  hoursBefore!: number;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt!: Date;
}
