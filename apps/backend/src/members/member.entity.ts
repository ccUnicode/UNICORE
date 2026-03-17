import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'members' })
@Unique(['uniCode'])
export class Member {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'uni_code', type: 'varchar', length: 20 })
  uniCode: string;

  @Column({ name: 'first_names', type: 'varchar', length: 120 })
  firstNames: string;

  @Column({ name: 'last_names', type: 'varchar', length: 120 })
  lastNames: string;

  @Column({ type: 'varchar', length: 120 })
  major: string;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate: string;

  @Column({ type: 'text', array: true })
  skills: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
