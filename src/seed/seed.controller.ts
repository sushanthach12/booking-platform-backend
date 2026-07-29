import {
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { SeedService } from './seed.service';

// Deliberately NOT @Public() and NOT reachable outside development — this
// endpoint mutates the database and burns storage quota, and must not exist
// in any deployed environment. Fails closed: NODE_ENV must be exactly
// 'development', not merely "not production".
@Controller({ path: 'seed', version: '1' })
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('properties')
  @HttpCode(HttpStatus.CREATED)
  async seedProperties() {
    if (process.env.NODE_ENV !== 'development') {
      throw new NotFoundException();
    }
    return this.seedService.seed();
  }
}
