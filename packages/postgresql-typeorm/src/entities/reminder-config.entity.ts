import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reminder_config')
export class ReminderConfigEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_reminder_config_id' })
  id!: number;

  @Column({ name: 'enabled_48h', type: 'boolean', default: true })
  enabled48h!: boolean;

  @Column({ name: 'enabled_24h', type: 'boolean', default: true })
  enabled24h!: boolean;

  @Column({ name: 'enabled_1h', type: 'boolean', default: true })
  enabled1h!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
