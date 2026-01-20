import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable shutdown hooks
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
