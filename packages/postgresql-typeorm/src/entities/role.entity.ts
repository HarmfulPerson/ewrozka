import {
  Column,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('role')
export class RoleEntity {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_role_id' })
  id!: number;

  @Column({ type: 'uuid', unique: true, default: () => 'gen_random_uuid()' })
  uid!: string;

  @Column()
  @Index('UQ_role_name', ['name'], { unique: true })
  name!: string;

  @ManyToMany(() => UserEntity, (user) => user.roles)
  users!: Relation<UserEntity[]>;
}
