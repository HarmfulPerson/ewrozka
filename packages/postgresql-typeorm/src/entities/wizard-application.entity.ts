import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('wizard_application')
export class WizardApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255, unique: true })
  email!: string;

  @Column({ length: 255 })
  username!: string;

  @Column({ name: 'password_hash', length: 500 })
  passwordHash!: string;

  @Column({ type: 'text', default: '' })
  bio!: string;

  @Column({ length: 20, nullable: true, default: null })
  phone!: string | null;

  @Column({ length: 500, default: '' })
  image!: string;

  @Column({ name: 'topic_ids', type: 'jsonb', default: '[]' })
  topicIds!: number[];

  @Column({ length: 20, default: 'pending' })
  status!: 'pending' | 'approved' | 'rejected';

  @Column({ name: 'rejection_reason', type: 'text', nullable: true, default: null })
  rejectionReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
