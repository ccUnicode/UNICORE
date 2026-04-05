
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Skill } from '../skills/skill.entity';

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

  @ManyToMany(() => Skill, (skill) => skill.members)
  @JoinTable()
  skills: Skill[];
  
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
