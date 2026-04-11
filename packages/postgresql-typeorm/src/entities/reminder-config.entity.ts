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

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  uid!: string;

  @Column({ name: 'enabled_48h', type: 'boolean', default: true })
  enabled48h!: boolean;

  @Column({ name: 'enabled_24h', type: 'boolean', default: true })
  enabled24h!: boolean;

  @Column({ name: 'enabled_1h', type: 'boolean', default: true })
  enabled1h!: boolean;

  @Column({ name: 'hours_slot1', type: 'int', default: 48 })
  hoursSlot1!: number;

  @Column({ name: 'hours_slot2', type: 'int', default: 24 })
  hoursSlot2!: number;

  @Column({ name: 'hours_slot3', type: 'int', default: 1 })
  hoursSlot3!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
