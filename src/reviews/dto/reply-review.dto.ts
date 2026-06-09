import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ReplyReviewDto {
  @ApiProperty({
    description: "The host's reply to a guest review",
    example: 'Thank you for staying with us!',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @Length(1, 2000)
  text: string;
}
