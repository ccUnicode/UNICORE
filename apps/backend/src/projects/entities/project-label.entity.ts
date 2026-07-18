import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('project_labels')
export class ProjectLabel {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({
    name: 'normalized_name',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  normalizedName: string;

  @ManyToMany(() => Project, (project) => project.labels)
  projects: Project[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
