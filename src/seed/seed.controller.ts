import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { SeedService } from './seed.service';

@Controller({ path: 'seed', version: '1' })
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Public()
  @Post('properties')
  @HttpCode(HttpStatus.CREATED)
  async seedProperties() {
    return this.seedService.seed();
  }
}
