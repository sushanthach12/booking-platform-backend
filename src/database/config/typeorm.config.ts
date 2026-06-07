import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { TlsOptions } from 'tls';

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  let sslConfig: boolean | TlsOptions = false;

  if (configService.get<string>('POSTGRES_SSL') === 'true') {
    sslConfig = {
      ca: configService
        .getOrThrow<string>('POSTGRES_CA_CERTIFICATE')
        .replace(/\\n/g, '\n'),
      rejectUnauthorized: true,
    };
  }

  return {
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
    ssl: sslConfig,
  };
};

export default getTypeOrmConfig;
