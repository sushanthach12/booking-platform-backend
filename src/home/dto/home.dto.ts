import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetHomeQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Free-text location used to bias the "nearby" rail.',
    example: 'Goa',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Items per rail (featured / nearby).',
    example: 8,
    default: 8,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10) || undefined)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number;
}
