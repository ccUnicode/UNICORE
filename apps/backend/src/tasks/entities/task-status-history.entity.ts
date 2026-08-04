import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from '../../members/member.entity';
import { TaskStatus } from '../enums/task-status.enum';
import { Task } from './task.entity';

@Entity('task_status_history')
@Index('IDX_task_status_history_task_created', ['taskId', 'createdAt'])
export class TaskStatusHistory {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'task_id', type: 'int' })
  taskId: number;

  @ManyToOne(() => Task, (task) => task.statusHistory, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({
    name: 'previous_status',
    type: 'enum',
    enum: TaskStatus,
    enumName: 'tasks_status_enum',
  })
  previousStatus: TaskStatus;

  @Column({
    name: 'new_status',
    type: 'enum',
    enum: TaskStatus,
    enumName: 'tasks_status_enum',
  })
  newStatus: TaskStatus;

  @Column({ name: 'actor_id', type: 'int' })
  actorId: number;

  @ManyToOne(() => Member, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'actor_id' })
  actor: Member;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
