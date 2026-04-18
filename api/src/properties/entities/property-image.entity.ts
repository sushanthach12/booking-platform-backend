import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PropertyEntity } from './property.entity';
import { RoomEntity } from './rooms.entity';

@Entity('property_images')
export class PropertyImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @Column({ type: 'uuid', name: 'room_id', nullable: true })
  roomId: string | null;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'text', name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  @Column({ type: 'varchar', length: 255, name: 'alt_text', nullable: true })
  altText: string | null;

  @Column({ type: 'integer', name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ type: 'integer', nullable: true })
  width: number | null;

  @Column({ type: 'integer', nullable: true })
  height: number | null;

  @Column({ type: 'integer', name: 'file_size', nullable: true })
  fileSize: number | null;

  @Column({ type: 'varchar', length: 50, name: 'mime_type', nullable: true })
  mimeType: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => PropertyEntity, (property) => property.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property: PropertyEntity;

  @ManyToOne(() => RoomEntity, (room) => room.images, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'room_id' })
  room: RoomEntity | null;
}
