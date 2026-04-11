import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { AppointmentEntity } from './appointment.entity';
import { MeetingEventEntity } from './meeting-event.entity';

@Entity('meeting_room')
export class MeetingRoomEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({
    primaryKeyConstraintName: 'PK_meeting_room_id',
  })
  id!: number;

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  uid!: string;

  @Column({ name: 'appointment_id', unique: true })
  appointmentId!: number;

  /** Token w linku (np. /spotkanie/TOKEN) */
  @Column({ type: 'varchar', length: 64, unique: true })
  token!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  createdAt!: Date;

  @ManyToOne(() => AppointmentEntity)
  @JoinColumn({
    name: 'appointment_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_meeting_room_appointment',
  })
  appointment!: Relation<AppointmentEntity>;

  @OneToMany(() => MeetingEventEntity, (e) => e.meetingRoom)
  events!: Relation<MeetingEventEntity[]>;
}
