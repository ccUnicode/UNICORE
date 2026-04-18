import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Member } from '../../members/member.entity';
import { Area } from '../../area/entities/area.entity';

@Entity('area_memberships')
@Unique(['member', 'area'])
export class AreaMembership {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 100 })
  role: string;

  @ManyToOne(() => Member, (member) => member.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => Area, (area) => area.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
