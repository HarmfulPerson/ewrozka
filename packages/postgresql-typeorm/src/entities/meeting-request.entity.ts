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



@Entity('meeting_request')

export class MeetingRequestEntity extends AbstractEntity {

  constructor(data?: Partial<MeetingRequestEntity>) {

    super();

    Object.assign(this, data);

  }



  @PrimaryGeneratedColumn({

    primaryKeyConstraintName: 'PK_meeting_request_id',

  })

  id!: number;



  @Column({ name: 'user_id' })

  userId!: number;



  @Column({ name: 'advertisement_id', nullable: true, default: null })

  advertisementId!: number | null;

  /** ID wróżki (z ogłoszenia) – pozwala wyświetlać odrzucone wnioski po usunięciu ogłoszenia */
  @Column({ name: 'wizard_id', nullable: true, default: null })
  wizardId!: number | null;



  /** Żądana data i godzina rozpoczęcia spotkania */

  @Column({ name: 'requested_starts_at', type: 'timestamptz', nullable: true })

  requestedStartsAt!: Date | null;



  /** Preferowana data (legacy, gdy brak requestedStartsAt) */

  @Column({ name: 'preferred_date', type: 'date', nullable: true })

  preferredDate!: string | null;



  @Column({ name: 'message', type: 'varchar', length: 1000, default: '' })

  message!: string;



  @Column({ type: 'varchar', length: 20, default: 'pending' })

  status!: string;



  /** Powód odrzucenia (wymagany przy odrzuceniu zaakceptowanego, nieopłaconego wniosku) */
  @Column({ name: 'rejection_reason', type: 'varchar', length: 500, nullable: true })
  rejectionReason!: string | null;



  @CreateDateColumn({

    name: 'created_at',

    type: 'timestamptz',

    default: () => 'CURRENT_TIMESTAMP',

    nullable: false,

  })

  createdAt!: Date;



  @ManyToOne(() => UserEntity)

  @JoinColumn({

    name: 'user_id',

    referencedColumnName: 'id',

    foreignKeyConstraintName: 'FK_meeting_request_user',

  })

  user!: Relation<UserEntity>;



  @ManyToOne(() => AdvertisementEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })

  @JoinColumn({

    name: 'advertisement_id',

    referencedColumnName: 'id',

    foreignKeyConstraintName: 'FK_meeting_request_advertisement',

  })

  advertisement!: Relation<AdvertisementEntity>;

}

