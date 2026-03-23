import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import type { AreaMembership } from '../area-memberships/area-membership.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany('AreaMembership', 'user')
  memberships: Relation<AreaMembership[]>;
}
