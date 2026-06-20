import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { GetHomeQueryDto } from '../dto/home.dto';
import { HomeService } from '../services/home.service';

/**
 * Dedicated read model for the marketing homepage. A single public call returns
 * the featured rail, the nearby rail and destination tiles so the page renders
 * in one round-trip instead of stitching several property endpoints together.
 */
@Controller({ path: 'home', version: '1' })
export class HomeController {
  private readonly logger = new Logger(HomeController.name);

  constructor(private readonly homeService: HomeService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async getHome(@Query() query: GetHomeQueryDto) {
    this.logger.log('Get homepage data request received');

    const response = await this.homeService.getHomeData({
      params: { location: query.location, limit: query.limit },
    });

    return { data: response };
  }
}
