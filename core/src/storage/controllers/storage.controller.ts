import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { RequestUser } from '../../common/types/users.types';
import { GetPresignedUrlDto } from '../dto/presign.dto';
import { PresignedUploadResult, StorageService } from '../services/storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * POST /api/core/v1/storage/presign
   * Returns a presigned PUT URL for direct R2 upload.
   * Requires a valid JWT (enforced by Gateway via x-user-id / user header).
   */
  @Post('presign')
  async getPresignedUrl(
    @Body() dto: GetPresignedUrlDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PresignedUploadResult> {
    return this.storageService.getPresignedUploadUrl(dto, user.id);
  }
}
