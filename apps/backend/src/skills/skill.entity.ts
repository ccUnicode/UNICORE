import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from '../members/member.entity';

@Entity({ name: 'skills' })
@Index('IDX_skills_normalized_name', ['normalizedName'], { unique: true })
export class Skill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'normalized_name', type: 'varchar', length: 120 })
  normalizedName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => Member, (member) => member.skills)
  members: Member[];
}
