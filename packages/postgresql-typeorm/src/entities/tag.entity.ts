import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { AbstractEntity } from './abstract.entity';

@Entity('tag')
export class TagEntity extends AbstractEntity {

  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'PK_tag_uid',
  })
  uid!: string;

  @Column()
  @Index('UQ_tag_name', ['name'], { unique: true })
  name!: string;
}
