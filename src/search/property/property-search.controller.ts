import {
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';
import { PropertySearchQueueService } from './queue/property-search-queue.service';

/**
 * Operational routes for the search index — not part of the public/host
 * search surface (those live at /properties/search and
 * /search/host/properties). No ADMIN role exists in this codebase yet, so
 * this is gated by a shared secret header instead of @Roles().
 */
@Controller({ path: 'search/properties', version: '1' })
export class PropertySearchController {
  constructor(
    private readonly queueService: PropertySearchQueueService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('reindex')
  @HttpCode(HttpStatus.ACCEPTED)
  async reindex(@Headers('x-search-admin-key') providedKey?: string) {
    const expectedKey = this.configService.get<string>('SEARCH_REINDEX_KEY');
    if (!expectedKey || providedKey !== expectedKey) {
      throw new ForbiddenException('Invalid or missing reindex key');
    }

    await this.queueService.enqueueReindexAll();
    return { data: { enqueued: true } };
  }
}
