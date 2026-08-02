import {
  CreateDateColumn,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Member } from '../../members/member.entity';
import { Task } from './task.entity';

@Entity('task_assignees')
@Unique(['taskId', 'memberId'])
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
