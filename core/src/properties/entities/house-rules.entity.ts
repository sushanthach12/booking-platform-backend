import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PropertyEntity } from './property.entity';

export enum RuleType {
  PETS = 'pets',
  SMOKING = 'smoking',
  PARTIES = 'parties',
  QUIET_HOURS = 'quiet_hours',
  CHECK_IN_TIME = 'check_in_time',
  CHECK_OUT_TIME = 'check_out_time',
  MAX_GUESTS = 'max_guests',
  NO_SHOES = 'no_shoes',
  NO_ALCOHOL = 'no_alcohol',
  OTHER = 'other',
}

@Entity('house_rules')
@Unique(['propertyId', 'ruleType'])
export class HouseRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'rule_type',
  })
  ruleType: RuleType;

  @Column({ type: 'boolean', default: false })
  allowed: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => PropertyEntity, (property) => property.houseRules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;
}
