import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageController } from './controllers/storage.controller';
import { S3ClientProvider } from './providers/s3-client.provider';
import { StorageService } from './services/storage.service';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [S3ClientProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
