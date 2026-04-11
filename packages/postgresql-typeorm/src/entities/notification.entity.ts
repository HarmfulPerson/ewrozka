import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('notification')
export class NotificationEntity {

  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'PK_notification_uid',
  })
  uid!: string;

  /** Odbiorca powiadomienia */
  @Column({ name: 'user_id' })
  userId!: string;

  /** Typ powiadomienia — klucz do obsługi na froncie */
  @Column({ type: 'varchar', length: 50 })
  type!: string;

  /** Tytuł powiadomienia */
  @Column({ type: 'varchar', length: 200 })
  title!: string;

  /** Treść powiadomienia */
  @Column({ type: 'text', nullable: true })
  body!: string | null;

  /** Opcjonalny link do przekierowania */
  @Column({ type: 'varchar', length: 500, nullable: true })
  link!: string | null;

  /** Metadane JSON — dowolne dane per typ */
  @Column({ type: 'jsonb', nullable: true, default: null })
  meta!: Record<string, unknown> | null;

  /** Czy przeczytane */
  @Column({ name: 'read', type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'uid',
    foreignKeyConstraintName: 'FK_notification_user',
  })
  user!: Relation<UserEntity>;
}
