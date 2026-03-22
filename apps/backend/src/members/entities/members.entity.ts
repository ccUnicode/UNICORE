import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ActivityState {
  ACTIVO = 'Activo',
  INACTIVO = 'Inactivo',
}

export enum AvailabilityState {
  DISPONIBLE = 'Disponible',
  NO_DISPONIBLE = 'No disponible',
  INHABILITADO = 'Inhabilitado',
}

@Entity('Users')
export class User {
  @PrimaryGeneratedColumn()
  UserId: number;

  @Column({ type: 'char', length: 9, unique: true })
  UniCode: string;

  @Column({ type: 'varchar', length: 100 })
  FullName: string;

  @Column({ type: 'varchar', length: 100 })
  Email: string;

  @Column({ type: 'int', nullable: true })
  PhoneNumer: number;

  @Column({ type: 'varchar', length: 100 })
  Career: string;

  @Column({ type: 'int' })
  Semester: number;

  @CreateDateColumn()
  CreatedAt: Date;

  @Column({
    type: 'enum',
    enum: ActivityState,
    default: ActivityState.ACTIVO,
  })
  Activity: ActivityState;

  @Column({
    type: 'enum',
    enum: AvailabilityState,
    default: AvailabilityState.DISPONIBLE,
  })
  Disponibility: AvailabilityState;
}
