import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { AreaMembership } from '../../area-memberships/entities/area-membership.entity';

@Entity('areas')
@Unique(['name'])
export class Area {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @OneToMany(() => AreaMembership, (membership) => membership.area)
  memberships: AreaMembership[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
