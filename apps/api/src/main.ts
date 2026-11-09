import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3001);
  const app = await NestFactory.create(AppModule);
  if (process.env.TRUST_PROXY) {
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.getInstance().set('trust proxy', process.env.TRUST_PROXY);
  }
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.enableShutdownHooks();
  try {
    await app.listen(port);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the other API process, then restart.`);
      process.exit(1);
    }
    throw error;
  }
}
await bootstrap();
