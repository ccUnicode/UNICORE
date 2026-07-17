import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Area } from '../../area/entities/area.entity';
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

  @ManyToOne(() => Area, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @OneToMany(() => ProjectPhase, (phase) => phase.project)
  phases: ProjectPhase[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
