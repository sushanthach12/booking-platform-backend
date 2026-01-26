import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PropertyEntity } from './property.entity';

@Entity('property_ratings')
@Index(['propertyId'], { unique: true })
export class PropertyRatingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'property_id', unique: true })
  propertyId: string;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    name: 'average_rating',
    default: 0,
  })
  averageRating: number;

  @Column({ type: 'integer', name: 'total_reviews', default: 0 })
  totalReviews: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => PropertyEntity, (property) => property.ratings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;
}
