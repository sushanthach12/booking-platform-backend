import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { EPropertyStatus, EPropertyType } from '../enums/property.enum';

// Property CRUD DTOs
export class GetPropertyDetailsQueryDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({
    type: Boolean,
    description: 'Include related entities (location, pricing, details, etc.)',
    example: false,
    required: false,
  })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  includeRelations?: boolean = false;
}

export class UpdatePropertyDto {
  @ApiProperty({
    type: String,
    description: 'Property title',
    example: 'Beautiful Downtown Apartment',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    type: String,
    description: 'Property description',
    example:
      'A modern apartment in the heart of downtown with amazing city views',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: EPropertyType,
    description: 'Type of property',
    example: 'apartment',
    required: false,
  })
  @IsOptional()
  @IsEnum(EPropertyType)
  propertyType?: EPropertyType;

  @ApiProperty({
    enum: EPropertyStatus,
    description: 'Property status',
    example: 'active',
    required: false,
  })
  @IsOptional()
  @IsEnum(EPropertyStatus)
  status?: EPropertyStatus;
}

export class UpdatePropertyStatusDto {
  @ApiProperty({
    enum: EPropertyStatus,
    description: 'New property status',
    example: 'active',
    required: true,
  })
  @IsEnum(EPropertyStatus)
  status: EPropertyStatus;
}

export class DeletePropertyParamsDto {
  @ApiProperty({
    type: String,
    description: 'Property ID to delete',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  propertyId: string;
}

// Property Images DTOs
export class CreatePropertyImageDto {
  @ApiProperty({
    type: String,
    description: 'Image URL',
    example: 'https://example.com/images/property1.jpg',
    required: true,
  })
  @IsString()
  url: string;

  @ApiProperty({
    type: String,
    description: 'Thumbnail image URL',
    example: 'https://example.com/images/property1-thumb.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({
    type: String,
    description: 'Image caption or description',
    example: 'Living room with natural light',
    required: false,
  })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({
    type: String,
    description: 'Alt text for accessibility',
    example: 'Modern living room with sofa and coffee table',
    required: false,
  })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiProperty({
    type: Number,
    description: 'Display order for image gallery',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number = 0;

  @ApiProperty({
    type: Boolean,
    description: 'Whether this is the primary/cover image',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean = false;

  @ApiProperty({
    type: Number,
    description: 'Image width in pixels',
    example: 1920,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  width?: number;

  @ApiProperty({
    type: Number,
    description: 'Image height in pixels',
    example: 1080,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  height?: number;

  @ApiProperty({
    type: Number,
    description: 'File size in bytes',
    example: 2048576,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  fileSize?: number;

  @ApiProperty({
    type: String,
    description: 'MIME type of the image',
    example: 'image/jpeg',
    required: false,
  })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class UpdatePropertyImageDto {
  @ApiProperty({
    type: String,
    description: 'Image caption or description',
    example: 'Updated living room photo',
    required: false,
  })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({
    type: String,
    description: 'Alt text for accessibility',
    example: 'Updated modern living room with sofa',
    required: false,
  })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiProperty({
    type: Number,
    description: 'Display order for image gallery',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @ApiProperty({
    type: Boolean,
    description: 'Whether this is the primary/cover image',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdatePropertyImageParamsDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    type: String,
    description: 'Image ID',
    example: '456e7890-e89b-12d3-a456-426614174001',
    required: true,
  })
  @IsUUID()
  imageId: string;
}

export class DeletePropertyImageParamsDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    type: String,
    description: 'Image ID to delete',
    example: '456e7890-e89b-12d3-a456-426614174001',
    required: true,
  })
  @IsUUID()
  imageId: string;
}

export class ImageOrderDto {
  @ApiProperty({
    type: String,
    description: 'Image ID',
    example: '456e7890-e89b-12d3-a456-426614174001',
    required: true,
  })
  @IsUUID()
  imageId: string;

  @ApiProperty({
    type: Number,
    description: 'New display order',
    example: 1,
    required: true,
  })
  @IsNumber()
  @Min(0)
  displayOrder: number;
}

export class ReorderPropertyImagesDto {
  @ApiProperty({
    type: [ImageOrderDto],
    description: 'Array of image IDs with their new display orders',
    example: [
      { imageId: '456e7890-e89b-12d3-a456-426614174001', displayOrder: 1 },
      { imageId: '789e0123-e89b-12d3-a456-426614174002', displayOrder: 2 },
    ],
    required: true,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  imageOrders: ImageOrderDto[];
}

// Property Amenities DTOs
export class AddPropertyAmenitiesDto {
  @ApiProperty({
    type: [String],
    description: 'Array of amenity IDs to add to property',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '456e7890-e89b-12d3-a456-426614174001',
    ],
    required: true,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  amenityIds: string[];
}

export class RemovePropertyAmenityParamsDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    type: String,
    description: 'Amenity ID to remove',
    example: '456e7890-e89b-12d3-a456-426614174001',
    required: true,
  })
  @IsUUID()
  amenityId: string;
}

// Room Management DTOs
export class CreateRoomDto {
  @ApiProperty({
    type: String,
    description: 'Room name',
    example: 'Master Bedroom',
    required: true,
  })
  @IsString()
  name: string;

  @ApiProperty({
    type: String,
    description: 'Room description',
    example: 'Spacious master bedroom with king-size bed and city view',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: String,
    description: 'Type of room',
    example: 'bedroom',
    required: true,
  })
  @IsString()
  roomType: string;

  @ApiProperty({
    type: Number,
    description: 'Number of beds in the room',
    example: 1,
    required: false,
  })
  @IsNumber()
  @Min(1)
  beds: number = 1;

  @ApiProperty({
    type: String,
    description: 'Type of bed',
    example: 'king',
    required: false,
  })
  @IsOptional()
  @IsString()
  bedType?: string;

  @ApiProperty({
    type: Number,
    description: 'Maximum number of guests',
    example: 2,
    required: false,
  })
  @IsNumber()
  @Min(1)
  maxGuests: number = 2;

  @ApiProperty({
    type: Number,
    description: 'Base price per night',
    example: 150,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the room is private',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean = true;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the room has a private bathroom',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  hasBathroom?: boolean = false;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the room has a balcony',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  hasBalcony?: boolean = false;

  @ApiProperty({
    type: Number,
    description: 'Floor number',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  floorNumber?: number;

  @ApiProperty({
    type: Number,
    description: 'Room size in square meters',
    example: 25,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  squareMeters?: number;
}

export class UpdateRoomDto {
  @ApiProperty({
    type: String,
    description: 'Room name',
    example: 'Updated Master Bedroom',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    type: String,
    description: 'Room description',
    example: 'Updated spacious master bedroom with king-size bed',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: String,
    description: 'Type of room',
    example: 'bedroom',
    required: false,
  })
  @IsOptional()
  @IsString()
  roomType?: string;

  @ApiProperty({
    type: Number,
    description: 'Number of beds in the room',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  beds?: number;

  @ApiProperty({
    type: String,
    description: 'Type of bed',
    example: 'queen',
    required: false,
  })
  @IsOptional()
  @IsString()
  bedType?: string;

  @ApiProperty({
    type: Number,
    description: 'Maximum number of guests',
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxGuests?: number;

  @ApiProperty({
    type: Number,
    description: 'Base price per night',
    example: 175,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the room is private',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the room has a private bathroom',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  hasBathroom?: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the room has a balcony',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  hasBalcony?: boolean;

  @ApiProperty({
    type: Number,
    description: 'Floor number',
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  floorNumber?: number;

  @ApiProperty({
    type: Number,
    description: 'Room size in square meters',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  squareMeters?: number;

  @ApiProperty({
    type: String,
    description: 'Room status',
    example: 'active',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class RoomParamsDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    type: String,
    description: 'Room ID',
    example: '456e7890-e89b-12d3-a456-426614174001',
    required: true,
  })
  @IsUUID()
  roomId: string;
}

// Availability Management DTOs
export class GetPropertyAvailabilityParamsDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    type: String,
    description: 'Room ID (optional, for specific room availability)',
    example: '456e7890-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiProperty({
    type: String,
    description: 'Start date (YYYY-MM-DD format)',
    example: '2024-01-01',
    required: true,
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    type: String,
    description: 'End date (YYYY-MM-DD format)',
    example: '2024-01-07',
    required: true,
  })
  @IsDateString()
  endDate: string;
}

export class UpdatePropertyAvailabilityDto {
  @ApiProperty({
    type: String,
    description: 'Room ID (optional, for specific room availability)',
    example: '456e7890-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiProperty({
    type: String,
    description: 'Start date (YYYY-MM-DD format)',
    example: '2024-01-01',
    required: true,
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    type: String,
    description: 'End date (YYYY-MM-DD format)',
    example: '2024-01-07',
    required: true,
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the dates are available',
    example: true,
    required: true,
  })
  @IsBoolean()
  available: boolean;

  @ApiProperty({
    type: Number,
    description: 'Price per night',
    example: 150,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({
    type: Number,
    description: 'Minimum nights required',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minNights?: number;

  @ApiProperty({
    type: Number,
    description: 'Maximum nights allowed',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxNights?: number;

  @ApiProperty({
    type: String,
    description: 'Note about availability',
    example: 'Special weekend pricing applies',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    type: String,
    description: 'Reason for blocking dates',
    example: 'Maintenance work',
    required: false,
  })
  @IsOptional()
  @IsString()
  blockReason?: string;
}

export class AvailabilityUpdateDto {
  @ApiProperty({
    type: String,
    description: 'Room ID (optional, for specific room availability)',
    example: '456e7890-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiProperty({
    type: String,
    description: 'Date (YYYY-MM-DD format)',
    example: '2024-01-01',
    required: true,
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    type: Boolean,
    description: 'Whether the date is available',
    example: true,
    required: true,
  })
  @IsBoolean()
  available: boolean;

  @ApiProperty({
    type: Number,
    description: 'Price per night',
    example: 150,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({
    type: Number,
    description: 'Minimum nights required',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minNights?: number;

  @ApiProperty({
    type: Number,
    description: 'Maximum nights allowed',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxNights?: number;

  @ApiProperty({
    type: String,
    description: 'Note about availability',
    example: 'Special weekend pricing applies',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    type: String,
    description: 'Reason for blocking date',
    example: 'Maintenance work',
    required: false,
  })
  @IsOptional()
  @IsString()
  blockReason?: string;
}

export class BulkUpdateAvailabilityDto {
  @ApiProperty({
    type: [AvailabilityUpdateDto],
    description: 'Array of availability updates',
    example: [
      { date: '2024-01-01', available: true, price: 150 },
      { date: '2024-01-02', available: false, blockReason: 'Maintenance' },
    ],
    required: true,
  })
  @IsArray()
  updates: AvailabilityUpdateDto[];
}

export class CheckAvailabilityDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    type: String,
    description: 'Room ID (optional, for specific room availability)',
    example: '456e7890-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiProperty({
    type: String,
    description: 'Start date (YYYY-MM-DD format)',
    example: '2024-01-01',
    required: true,
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    type: String,
    description: 'End date (YYYY-MM-DD format)',
    example: '2024-01-07',
    required: true,
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    type: Number,
    description: 'Number of guests',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  guests?: number;
}

// Pricing Management DTOs
export class UpdatePropertyPricingDto {
  @ApiProperty({
    type: Number,
    description: 'Base price per night',
    example: 150,
    required: true,
  })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({
    type: String,
    description: 'Currency code',
    example: 'USD',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiProperty({
    type: Number,
    description: 'Cleaning fee',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cleaningFee?: number = 0;

  @ApiProperty({
    type: Number,
    description: 'Service fee percentage',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  serviceFeePercentage?: number = 10.0;
}

export class CalculatePriceDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    type: String,
    description: 'Room ID (optional, for specific room pricing)',
    example: '456e7890-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiProperty({
    type: String,
    description: 'Start date (YYYY-MM-DD format)',
    example: '2024-01-01',
    required: true,
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    type: String,
    description: 'End date (YYYY-MM-DD format)',
    example: '2024-01-07',
    required: true,
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    type: Number,
    description: 'Number of guests',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  guests?: number;
}

// Search and Discovery DTOs
export class SearchPropertiesDto {
  @ApiProperty({
    type: String,
    description: 'Search query string',
    example: 'downtown apartment',
    required: false,
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({
    type: String,
    description: 'Location to search',
    example: 'New York',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    type: Number,
    description: 'Latitude for geospatial search',
    example: 40.7128,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    type: Number,
    description: 'Longitude for geospatial search',
    example: -74.006,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    type: Number,
    description: 'Search radius in kilometers',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1000)
  radius?: number;

  @ApiProperty({
    type: String,
    description: 'Check-in date (YYYY-MM-DD format)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @ApiProperty({
    type: String,
    description: 'Check-out date (YYYY-MM-DD format)',
    example: '2024-01-07',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @ApiProperty({
    type: Number,
    description: 'Number of guests',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  guests?: number;

  @ApiProperty({
    enum: EPropertyType,
    isArray: true,
    description: 'Property types to filter by',
    example: ['apartment', 'house'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(EPropertyType, { each: true })
  propertyType?: EPropertyType[];

  @ApiProperty({
    type: Number,
    description: 'Minimum price per night',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiProperty({
    type: Number,
    description: 'Maximum price per night',
    example: 500,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiProperty({
    type: [String],
    description: 'Required amenities',
    example: ['wifi', 'parking'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiProperty({
    type: Number,
    description: 'Page number',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    type: Number,
    description: 'Number of results per page',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    enum: ['price', 'rating', 'distance', 'created_at'],
    description: 'Sort results by',
    example: 'created_at',
    required: false,
  })
  @IsOptional()
  @IsEnum(['price', 'rating', 'distance', 'created_at'])
  sortBy?: 'price' | 'rating' | 'distance' | 'created_at' = 'created_at';

  @ApiProperty({
    enum: ['asc', 'desc'],
    description: 'Sort order',
    example: 'desc',
    required: false,
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class NearbyPropertiesDto {
  @ApiProperty({
    type: Number,
    description: 'Latitude for location-based search',
    example: 40.7128,
    required: true,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    type: Number,
    description: 'Longitude for location-based search',
    example: -74.006,
    required: true,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    type: Number,
    description: 'Search radius in kilometers',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1000)
  radius?: number = 10;

  @ApiProperty({
    type: Number,
    description: 'Maximum number of results',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

// Host-specific DTOs
export class GetHostPropertiesDto {
  @ApiProperty({
    type: Number,
    description: 'Page number',
    example: 1,
    required: false,
  })
  @Transform(({ value }) => parseInt(value) || 1)
  @IsOptional()
  @IsNumber()
  page: number;

  @ApiProperty({
    type: Number,
    description: 'Number of results per page',
    example: 10,
    required: false,
  })
  @Transform(({ value }) => parseInt(value) || 10)
  @IsOptional()
  @IsNumber()
  limit: number;

  @ApiProperty({
    enum: EPropertyStatus,
    description: 'Filter by property status',
    example: 'active',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(EPropertyStatus)
  status: EPropertyStatus;

  @ApiProperty({
    enum: EPropertyType,
    description: 'Filter by property type',
    example: 'apartment',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(EPropertyType)
  propertyType: EPropertyType;
}

export class GetPropertyAnalyticsParamsDto {
  @ApiProperty({
    type: String,
    description: 'Property ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsUUID()
  propertyId: string;

  @ApiProperty({
    type: String,
    description: 'Start date for analytics period (YYYY-MM-DD format)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    type: String,
    description: 'End date for analytics period (YYYY-MM-DD format)',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
