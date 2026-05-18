import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ensureDirectory } from './common/utils/ensure-directory.util';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const uploadDir = config.get<string>('UPLOAD_DIR', './uploads/images');
  const tempDir = config.get<string>('TEMP_DIR', './storage/temp');

  ensureDirectory(uploadDir);
  ensureDirectory(tempDir);

  const corsOriginRaw = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  const originList = corsOriginRaw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  app.enableCors({
    origin: originList.length > 0 ? originList : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);

  const port = Number(config.get<string>('PORT', '3000'));
  await app.listen(port);
}

bootstrap();
