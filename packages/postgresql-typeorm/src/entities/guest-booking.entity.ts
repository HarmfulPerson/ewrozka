import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { AdvertisementEntity } from './advertisement.entity';
import { UserEntity } from './user.entity';

export type GuestBookingStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'paid'
  | 'completed'
  | 'cancelled';

@Entity('guest_booking')
export class GuestBookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'wizard_id' })
  wizardId!: number;

  @Column({ name: 'advertisement_id', nullable: true, default: null })
  advertisementId!: number | null;

  @Column({ name: 'guest_name', type: 'varchar', length: 100 })
  guestName!: string;

  @Column({ name: 'guest_email', type: 'varchar', length: 200 })
  guestEmail!: string;

  @Column({ name: 'guest_phone', type: 'varchar', length: 20, nullable: true, default: null })
  guestPhone!: string | null;

  @Column({ name: 'message', type: 'text', nullable: true, default: null })
  message!: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt!: Date;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes!: number;

  @Column({ name: 'price_grosze', type: 'int' })
  priceGrosze!: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: GuestBookingStatus;

  /** Unikalny token do URL pokoju spotkania – generowany przy opłaceniu */
  @Column({ name: 'guest_token', type: 'uuid', nullable: true, default: null })
  guestToken!: string | null;

  @Column({ name: 'stripe_session_id', type: 'varchar', length: 200, nullable: true, default: null })
  stripeSessionId!: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true, default: null })
  rejectionReason!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wizard_id', referencedColumnName: 'id' })
  wizard!: Relation<UserEntity>;

  @ManyToOne(() => AdvertisementEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'advertisement_id', referencedColumnName: 'id' })
  advertisement!: Relation<AdvertisementEntity>;
}
