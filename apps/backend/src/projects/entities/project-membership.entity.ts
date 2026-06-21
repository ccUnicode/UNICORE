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
import { Project } from './project.entity';
import { ProjectRole } from '../../common/enums/project-role.enum';

@Entity('project_memberships')
@Unique(['memberId', 'projectId'])
export class ProjectMembership {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 30, default: ProjectRole.MEMBER })
  role: ProjectRole;

  @Column({ name: 'member_id', type: 'int' })
  memberId: number;

  @ManyToOne(() => Member, (member) => member.projectMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ name: 'project_id', type: 'int' })
  projectId: number;

  @ManyToOne(() => Project, (project) => project.memberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
