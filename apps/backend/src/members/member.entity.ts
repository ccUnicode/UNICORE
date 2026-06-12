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
} from 'typeorm';
import { Area } from '../area/entities/area.entity';
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
}
