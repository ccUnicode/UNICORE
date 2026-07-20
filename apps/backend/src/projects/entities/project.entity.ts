import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Area } from '../../area/entities/area.entity';
import { ProjectStatus } from '../enums/project-status.enum';
import { ProjectLabel } from './project-label.entity';
import { ProjectLink } from './project-link.entity';
import { ProjectPhase } from './project-phase.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  description: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ name: 'area_id', type: 'int' })
  areaId: number;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.PLANNED })
  status: ProjectStatus;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @ManyToOne(() => Area, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @OneToMany(() => ProjectPhase, (phase) => phase.project)
  phases: ProjectPhase[];

  @ManyToMany(() => ProjectLabel, (label) => label.projects)
  @JoinTable({
    name: 'project_label_assignments',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'label_id', referencedColumnName: 'id' },
  })
  labels: ProjectLabel[];

  @OneToMany(() => ProjectLink, (link) => link.project)
  links: ProjectLink[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
