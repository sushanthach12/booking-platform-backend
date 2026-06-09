import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A guest's review of a completed booking. One review per booking
 * (enforced by the unique `bookingId`). `responseText`/`respondedAt`
 * hold the host's optional reply.
 */
@Entity('reviews')
@Index(['hostId'])
@Index(['propertyId'])
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  bookingId: string;

  @Column({ type: 'uuid' })
  propertyId: string;

  @Column({ type: 'uuid' })
  guestId: string;

  @Column({ type: 'uuid' })
  hostId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text' })
  comment: string;

  @Column({ type: 'text', nullable: true })
  responseText: string | null;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
