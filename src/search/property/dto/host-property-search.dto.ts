import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  EPropertyStatus,
  EPropertyType,
} from '../../../properties/enums/property.enum';

/**
 * No `hostId` field — under the global `forbidNonWhitelisted` ValidationPipe,
 * a client that tries to pass one gets a 400 rather than silently being
 * ignored. hostId is always derived from the JWT in the controller.
 */
export class HostPropertySearchDto {
  @IsOptional() @IsString() q?: string;

  @IsOptional()
  @IsEnum(EPropertyStatus)
  status?: EPropertyStatus;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(EPropertyType, { each: true })
  propertyType?: EPropertyType[];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional() @IsString() city?: string;

  @IsOptional()
  @IsEnum(['price', 'rating', 'createdAt'])
  sortBy?: 'price' | 'rating' | 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
