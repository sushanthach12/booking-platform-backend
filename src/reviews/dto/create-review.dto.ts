import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Booking being reviewed (one review per booking)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  bookingId: string;

  @ApiProperty({
    description: 'Star rating 1–5',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Review text',
    example: 'Wonderful stay, great host.',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @Length(1, 2000)
  comment: string;
}
