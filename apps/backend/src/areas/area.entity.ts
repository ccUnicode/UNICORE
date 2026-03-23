import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import type { AreaMembership } from '../area-memberships/area-membership.entity';

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany('AreaMembership', 'area')
  memberships: Relation<AreaMembership[]>;
}
