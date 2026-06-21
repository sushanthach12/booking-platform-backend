import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EAuthProvider, EUserRole, EUserStatus } from '../enums/user.enum';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ type: 'varchar' })
  name: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: EAuthProvider.EMAIL,
  })
  auth_provider: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  google_id: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: EUserRole.GUEST,
  })
  role: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: EUserStatus.ACTIVE,
  })
  status: string;

  @Column({
    type: 'varchar',
    length: 15,
    nullable: true,
  })
  phone: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  email_verified: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  phone_verified: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  last_login_at: Date;
}
