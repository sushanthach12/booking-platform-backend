import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/request-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestUser } from '../../common/types/users.types';
import { EUserRole } from '../../users/enums/user.enum';
import { PROPERTY_SEARCH_FACADE } from '../core/search.tokens';
import { HostPropertySearchDto } from './dto/host-property-search.dto';
import { IPropertySearchFacade } from './interfaces/property-search-facade.interface';

/**
 * Host-dashboard search — always scoped to the authenticated host's own
 * listings. hostId comes exclusively from the JWT via @CurrentUser(); the
 * DTO has no hostId field, so a client attempting to pass one gets a 400
 * from the global ValidationPipe rather than another host's results.
 */
@Roles(EUserRole.HOST)
@Controller({ path: 'search/host/properties', version: '1' })
export class HostPropertySearchController {
  constructor(
    @Inject(PROPERTY_SEARCH_FACADE)
    private readonly searchFacade: IPropertySearchFacade,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async search(
    @CurrentUser() user: RequestUser,
    @Query() query: HostPropertySearchDto,
  ) {
    const outcome = await this.searchFacade.searchForHost({
      ...query,
      hostId: user.id,
    });

    return {
      data: outcome.results,
      meta: {
        page: outcome.page,
        limit: outcome.size,
        total: outcome.total,
        totalPages: Math.ceil(outcome.total / outcome.size),
        length: outcome.results.length,
      },
    };
  }
}
