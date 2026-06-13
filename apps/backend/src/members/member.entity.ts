import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Area } from '../area/entities/area.entity';
import { AreaRole } from '../common/enums/area-role.enum';
import { Skill } from '../skills/skill.entity';
import { AreaMembership } from '../area-memberships/entities/area-membership.entity';
import { MemberStatus } from './enums/member-status.enum';

@Entity({ name: 'members' })
@Unique(['institution', 'studentCode'])
export class Member {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120, default: 'UNI' })
  institution: string;

  @Column({ name: 'student_code', type: 'varchar', length: 20, nullable: true })
  studentCode: string | null;

  @Column({ name: 'first_names', type: 'varchar', length: 120 })
  firstNames: string;

  @Column({ name: 'last_names', type: 'varchar', length: 120 })
  lastNames: string;

  @Column({ type: 'varchar', length: 120 })
  major: string;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate: string;

  @Column({
    type: 'enum',
    enum: AreaRole,
    default: AreaRole.MIEMBRO,
  })
  role: AreaRole;

  @Column({ name: 'area_id', type: 'int', nullable: true })
  areaId: number | null;

  @ManyToOne(() => Area, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'area_id' })
  area: Area | null;

  @ManyToMany(() => Skill, (skill) => skill.members)
  @JoinTable()
  skills: Skill[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: MemberStatus,
    default: MemberStatus.Available,
  })
  status: MemberStatus;

  @OneToMany(() => AreaMembership, (membership) => membership.member)
  memberships: AreaMembership[];
}
