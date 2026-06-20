import { Module } from '@nestjs/common';
import { PropertyModule } from '../properties/property.module';
import { StorageModule } from '../storage/storage.module';
import { UserModule } from '../users/user.module';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

@Module({
  imports: [UserModule, PropertyModule, StorageModule],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
