import {
  Column,
  Entity,
  Index,
  ManyToMany,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('role')
export class RoleEntity {

  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'PK_role_uid',
  })
  uid!: string;

  @Column()
  @Index('UQ_role_name', ['name'], { unique: true })
  name!: string;

  @ManyToMany(() => UserEntity, (user) => user.roles)
  users!: Relation<UserEntity[]>;
}
