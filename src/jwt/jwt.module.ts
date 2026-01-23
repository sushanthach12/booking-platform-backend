import { Module } from '@nestjs/common';
import { JwtService } from './services/jwt.service';

@Module({
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule {}
