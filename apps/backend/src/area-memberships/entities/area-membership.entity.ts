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

export enum AreaRole {
  Presidencia = 'Presidencia',
  DirectivaArea = 'Directiva de area',
  Miembro = 'Miembro',
}

@Entity('area_memberships')
@Unique(['memberId', 'areaId'])
export class AreaMembership {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 100, default: AreaRole.Miembro })
  role: AreaRole;

  @Column({ name: 'member_id', insert: false, update: false })
  memberId: number;

  @ManyToOne(() => Member, (member) => member.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ name: 'area_id', insert: false, update: false })
  areaId: number;

  @ManyToOne(() => Area, (area) => area.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
