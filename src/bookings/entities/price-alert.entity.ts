import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('price_alerts')
@Index(['propertyId', 'status'], { where: "status = 'active'" })
@Index(['userId', 'status'], { where: "status = 'active'" })
@Unique(['propertyId', 'userId'])
export class PriceAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'property_id', type: 'uuid' })
  propertyId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'target_price', type: 'decimal', precision: 10, scale: 2 })
  targetPrice: number;

  @Column({
    name: 'current_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  currentPrice?: number;

  @Column({ name: 'auto_book', type: 'boolean', default: false })
  autoBook: boolean;

  @Column({ name: 'notified_at', type: 'timestamp', nullable: true })
  notifiedAt?: Date;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: 'active' | 'triggered' | 'cancelled';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
