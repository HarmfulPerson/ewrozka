import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { AdvertisementEntity } from './advertisement.entity';
import { UserEntity } from './user.entity';

@Entity('appointment')
export class AppointmentEntity extends AbstractEntity {
  constructor(data?: Partial<AppointmentEntity>) {
    super();
    Object.assign(this, data);
  }

  @PrimaryGeneratedColumn({
    primaryKeyConstraintName: 'PK_appointment_id',
  })
  id!: number;

  @Column({ name: 'client_id' })
  clientId!: number;

  @Column({ name: 'wrozka_id' })
  wrozkaId!: number;

  @Column({ name: 'advertisement_id', nullable: true, default: null })
  advertisementId!: number | null;

  @Column({ name: 'meeting_request_id', type: 'int', nullable: true })
  meetingRequestId!: number | null;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes!: number;

  @Column({ name: 'price_grosze', type: 'int' })
  priceGrosze!: number;

  @Column({ type: 'varchar', length: 20, default: 'accepted' })
  status!: string;

  @Column({ type: 'smallint', nullable: true, default: null })
  rating!: number | null;

  @Column({ type: 'text', nullable: true, default: null })
  comment!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  createdAt!: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({
    name: 'client_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_appointment_client',
  })
  client!: Relation<UserEntity>;

  @ManyToOne(() => UserEntity)
  @JoinColumn({
    name: 'wrozka_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_appointment_wrozka',
  })
  wrozka!: Relation<UserEntity>;

  @ManyToOne(() => AdvertisementEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'advertisement_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_appointment_advertisement',
  })
  advertisement!: Relation<AdvertisementEntity>;
}
