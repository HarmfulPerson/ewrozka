import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { MeetingRoomEntity } from './meeting-room.entity';
import { UserEntity } from './user.entity';

@Entity('meeting_event')
export class MeetingEventEntity extends AbstractEntity {

  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'PK_meeting_event_uid',
  })
  uid!: string;

  @Column({ name: 'meeting_room_id' })
  meetingRoomId!: string;

  @Column({ name: 'user_id' })
  userId!: string;

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
    referencedColumnName: 'uid',
    foreignKeyConstraintName: 'FK_meeting_event_meeting_room',
  })
  meetingRoom!: Relation<MeetingRoomEntity>;

  @ManyToOne(() => UserEntity)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'uid',
    foreignKeyConstraintName: 'FK_meeting_event_user',
  })
  user!: Relation<UserEntity>;
}
