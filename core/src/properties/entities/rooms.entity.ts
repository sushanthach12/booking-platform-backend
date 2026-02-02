import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EBedType, ERoomStatus, ERoomType } from '../enums/rooms.enum';
import { PropertyImageEntity } from './property-image.entity';
import { PropertyEntity } from './property.entity';

@Entity('rooms')
export class RoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'room_type',
  })
  roomType: ERoomType;

  @Column({ type: 'integer', default: 1 })
  beds: number;

  @Column({ type: 'varchar', length: 50, name: 'bed_type', nullable: true })
  bedType: EBedType | null;

  @Column({ type: 'integer', name: 'max_guests', default: 2 })
  maxGuests: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'base_price',
    nullable: true,
  })
  basePrice: number | null;

  @Column({ type: 'boolean', name: 'is_private', default: true })
  isPrivate: boolean;

  @Column({ type: 'boolean', name: 'has_bathroom', default: false })
  hasBathroom: boolean;

  @Column({ type: 'boolean', name: 'has_balcony', default: false })
  hasBalcony: boolean;

  @Column({ type: 'integer', name: 'floor_number', nullable: true })
  floorNumber: number | null;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    name: 'square_meters',
    nullable: true,
  })
  squareMeters: number | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: ERoomStatus.ACTIVE,
  })
  status: ERoomStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => PropertyEntity, (property) => property.rooms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @OneToMany(() => PropertyImageEntity, (image) => image.room, {
    cascade: true,
  })
  images: PropertyImageEntity[];
}
