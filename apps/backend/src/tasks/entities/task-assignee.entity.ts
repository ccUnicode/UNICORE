import {
  CreateDateColumn,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Member } from '../../members/member.entity';
import { ProjectMembership } from '../../projects/entities/project-membership.entity';
import { Task } from './task.entity';

@Entity('task_assignees')
@Unique(['taskId', 'memberId'])
@Index('IDX_task_assignees_member_task', ['memberId', 'taskId'])
export class TaskAssignee {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'task_id', type: 'int' })
  taskId: number;

  @ManyToOne(() => Task, (task) => task.assignees, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'member_id', type: 'int' })
  memberId: number;

  @ManyToOne(() => Member, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ name: 'project_membership_id', type: 'int' })
  projectMembershipId: number;

  @ManyToOne(() => ProjectMembership, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'project_membership_id' })
  projectMembership: ProjectMembership;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
