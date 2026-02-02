import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.getOrThrow<string>('POSTGRES_HOST'),
  port: configService.getOrThrow<number>('POSTGRES_PORT'),
  username: configService.getOrThrow<string>('POSTGRES_USERNAME'),
  password: configService.getOrThrow<string>('POSTGRES_PASSWORD'),
  database: configService.getOrThrow<string>('POSTGRES_DATABASE'),
  entities: [__dirname + '/../../**/entities/*.entity.{js,ts}'],
  synchronize: configService.get<string>('POSTGRES_SYNCHRONIZE') === 'true',
  migrations: [__dirname + '/../../migrations/*.{js,ts}'],
  logging: configService.get<string>('POSTGRES_LOGGING') === 'true',
  ssl:
    configService.get<string>('POSTGRES_SSL') === 'true'
      ? {
          ca: configService.getOrThrow<string>('POSTGRES_CA_CERTIFICATE'),
        }
      : false,
});

export default getTypeOrmConfig;
