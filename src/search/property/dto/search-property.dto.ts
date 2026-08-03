import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SearchPropertyDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsArray() amenities?: string[];

  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;

  // Radius search
  @IsOptional() @Type(() => Number) @IsNumber() lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lon?: number;
  @IsOptional() @Type(() => Number) @IsNumber() radiusKm?: number;

  // Map bounding-box search
  @IsOptional() @Type(() => Number) @IsNumber() neLat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() neLon?: number;
  @IsOptional() @Type(() => Number) @IsNumber() swLat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() swLon?: number;

  @IsOptional() @Type(() => Number) @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @Min(1) @Max(50) size: number = 20;
}
