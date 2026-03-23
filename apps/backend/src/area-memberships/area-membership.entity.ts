import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AreaRole } from '../common/enums/area-role.enum';
import { Area } from '../areas/area.entity';
import { User } from '../users/user.entity';

@Entity('area_memberships')
export class AreaMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Area, (area) => area.memberships, { onDelete: 'CASCADE' })
  area: Area;

  @Column()
  areaId: string;

  @Column({
    type: 'enum',
    enum: AreaRole,
  })
  role: AreaRole;

  @CreateDateColumn()
  createdAt: Date;
}
