import { Module } from '@nestjs/common';
import { PropertyModule } from '../properties/property.module';
import { HomeController } from './controllers/home.controller';
import { HomeService } from './services/home.service';

/**
 * Homepage aggregation module. Depends on {@link PropertyModule} (which exports
 * `PropertyService`) to compose the featured / nearby / destination rails.
 */
@Module({
  imports: [PropertyModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
