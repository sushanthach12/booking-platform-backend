import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetPresignedUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;

  /** S3 key prefix, e.g. "properties/123". Defaults to "general". */
  @IsOptional()
  @IsString()
  folder?: string;
}
