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

  get role(): AreaRole {
    if (!this.memberships || this.memberships.length === 0) {
      return AreaRole.MIEMBRO;
    }
    const roles = this.memberships.map((m) => m.role);
    if (roles.includes(AreaRole.PRESIDENCIA)) {
      return AreaRole.PRESIDENCIA;
    }
    if (roles.includes(AreaRole.DIRECTIVA_DE_AREA)) {
      return AreaRole.DIRECTIVA_DE_AREA;
    }
    return AreaRole.MIEMBRO;
  }

  get areaId(): number | null {
    if (!this.memberships || this.memberships.length === 0) {
      return null;
    }
    const membership = this.memberships.find(
      (m) => m.areaId !== null && m.areaId !== undefined,
    );
    return membership ? membership.areaId : null;
  }
}
