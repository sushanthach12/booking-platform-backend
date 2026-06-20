import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { GetPresignedUrlDto } from '../dto/presign.dto';
import { S3_CLIENT } from '../providers/s3-client.provider';

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly expiresIn: number;
  private readonly publicBaseUrl: string;

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.getOrThrow<string>('R2_BUCKET_NAME');
    this.expiresIn =
      this.config.get<number>('R2_PRESIGN_EXPIRY_SECONDS') ?? 300;
    this.publicBaseUrl = this.config.getOrThrow<string>('R2_PUBLIC_BASE_URL');
  }

  /**
   * Generate a presigned PUT URL for direct browser-to-R2 upload.
   * Returns the upload URL, the object key, and expiry in seconds.
   * The caller should construct the public URL as: `${R2_PUBLIC_BASE_URL}/${key}`
   */
  async getPresignedUploadUrl(
    dto: GetPresignedUrlDto,
    userId: string,
  ): Promise<PresignedUploadResult> {
    const sanitizedName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = dto.folder ?? 'general';
    const key = `uploads/${folder}/${userId}/${randomUUID()}-${sanitizedName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: this.expiresIn,
    });

    this.logger.log(`Presigned URL generated: key=${key}, userId=${userId}`);

    return {
      uploadUrl,
      key,
      publicUrl: this.getPublicUrl(key),
      expiresIn: this.expiresIn,
    };
  }

  /** Build the public URL for a stored object key. */
  getPublicUrl(key: string): string {
    return `${this.publicBaseUrl}/${key}`;
  }

  /** Server-side upload — use for seeding or internal transfers, not browser uploads. */
  async putObject(
    key: string,
    body: Buffer | Readable,
    contentType: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    this.logger.log(`Object uploaded: key=${key}`);
  }
}
