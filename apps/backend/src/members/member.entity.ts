import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AreaMembership } from '../area-memberships/entities/area-membership.entity';
import { AreaRole } from '../common/enums/area-role.enum';
import { ProjectMembership } from '../projects/entities/project-membership.entity';
import { Skill } from '../skills/skill.entity';
import { MemberActivityStatus } from './enums/member-activity-status.enum';
import { MemberAvailabilityStatus } from './enums/member-availability-status.enum';

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

  @Column({ name: 'cycle', type: 'int', nullable: true })
  cycle: number | null;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  passwordHash?: string | null;

  @Column({ name: 'session_version', type: 'int', default: 0 })
  sessionVersion?: number;

  @Column({
    name: 'activity_status',
    type: 'enum',
    enum: MemberActivityStatus,
    default: MemberActivityStatus.ACTIVE,
  })
  activityStatus: MemberActivityStatus;

  @Column({
    name: 'availability_status',
    type: 'enum',
    enum: MemberAvailabilityStatus,
    default: MemberAvailabilityStatus.AVAILABLE,
  })
  availabilityStatus: MemberAvailabilityStatus;

  @ManyToMany(() => Skill, (skill) => skill.members)
  @JoinTable()
  skills: Skill[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => AreaMembership, (membership) => membership.member)
  memberships: AreaMembership[];

  @OneToMany(() => ProjectMembership, (membership) => membership.member)
  projectMemberships?: ProjectMembership[];

  get role(): AreaRole {
    const primary = getPrimaryMembership(this.memberships);
    return primary ? primary.role : AreaRole.MIEMBRO;
  }

  get areaId(): number | null {
    const primary = getPrimaryMembership(this.memberships);
    return primary ? primary.areaId : null;
  }
}

const getPrimaryMembership = (
  memberships: AreaMembership[],
): AreaMembership | null => {
  if (!memberships || memberships.length === 0) {
    return null;
  }
  const priority: Record<AreaRole, number> = {
    [AreaRole.PRESIDENCIA]: 1,
    [AreaRole.DIRECTIVA_DE_AREA]: 2,
    [AreaRole.MIEMBRO]: 3,
  };
  return memberships.reduce((primary, current) => {
    if (!primary) return current;
    const priorityDiff = priority[current.role] - priority[primary.role];
    if (priorityDiff < 0) return current;
    if (priorityDiff > 0) return primary;
    return current.id < primary.id ? current : primary;
  });
};
