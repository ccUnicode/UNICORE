import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_events')
export class AuditEvent {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'actor_id', type: 'integer' })
  actorId: number;

  @Column({ name: 'actor_name', type: 'varchar', length: 255 })
  actorName: string;

  @Column({ name: 'actor_role', type: 'varchar', length: 50 })
  actorRole: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 50 })
  entityId: string;

  @Column({ name: 'area_id', type: 'integer', nullable: true })
  areaId: number | null;

  @CreateDateColumn({ name: 'timestamp', type: 'timestamp with time zone' })
  timestamp: Date;

  @Column({ type: 'text', nullable: true })
  metadata: string | null;
}
