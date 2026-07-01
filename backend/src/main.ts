import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') || 3000;

  app.enableCors({ origin: true });

  app.useStaticAssets(join(process.cwd(), 'public'));

  app.setGlobalPrefix('api');

  const express = app.getHttpAdapter().getInstance();
  express.get('*', (_req: any, res: any, next: any) => {
    if (_req.path.startsWith('/api/')) return next();
    res.sendFile(join(process.cwd(), 'public', 'index.html'));
  });

  await app.listen(port, '0.0.0.0');
}

bootstrap();
