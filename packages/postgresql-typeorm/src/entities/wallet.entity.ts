import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { AbstractEntity } from './abstract.entity';
import { UserEntity } from './user.entity';

@Entity('wallet')
@Index('IDX_wallet_user', ['userId'])
export class WalletEntity extends AbstractEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_wallet_id' })
  id!: number;

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  uid!: string;

  @Column({ name: 'user_id' })
  userId!: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_wallet_user' })
  user!: Relation<UserEntity>;

  @Column({ type: 'bigint', default: 0, comment: 'Balance in grosze (1/100 PLN)' })
  balance!: number;

  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
