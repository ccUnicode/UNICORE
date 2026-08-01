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
import { AreaRole } from '../../common/enums/area-role.enum';

@Entity('area_memberships')
@Unique(['memberId', 'areaId'])
export class AreaMembership {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 30, default: AreaRole.MIEMBRO })
  role: AreaRole;

  @Column({ name: 'member_id', insert: false, update: false })
  memberId: number;

  @ManyToOne(() => Member, (member) => member.memberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ name: 'area_id', insert: false, update: false, nullable: true })
  areaId: number | null;

  @ManyToOne(() => Area, (area) => area.memberships, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'area_id' })
  area: Area | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
