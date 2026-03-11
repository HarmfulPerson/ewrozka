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
import { MeetingRoomEntity } from './meeting-room.entity';
import { UserEntity } from './user.entity';

@Entity('meeting_event')
export class MeetingEventEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({
    primaryKeyConstraintName: 'PK_meeting_event_id',
  })
  id!: number;

  @Column({ name: 'meeting_room_id' })
  meetingRoomId!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  /** 'joined' | 'left' */
  @Column({ name: 'event_type', type: 'varchar', length: 20 })
  eventType!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    nullable: false,
  })
  createdAt!: Date;

  @ManyToOne(() => MeetingRoomEntity, (room) => room.events)
  @JoinColumn({
    name: 'meeting_room_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_meeting_event_meeting_room',
  })
  meetingRoom!: Relation<MeetingRoomEntity>;

  @ManyToOne(() => UserEntity)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
    foreignKeyConstraintName: 'FK_meeting_event_user',
  })
  user!: Relation<UserEntity>;
}
