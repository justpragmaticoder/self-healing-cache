import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // Enable CORS
  app.enableCors();

  // Global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log('');
  logger.log('='.repeat(60));
  logger.log(`🚀 Self-Healing Cache NestJS Application`);
  logger.log('='.repeat(60));
  logger.log('');
  logger.log('Available endpoints:');
  logger.log(`  GET    http://localhost:${port}/api/cache/health`);
  logger.log(`  GET    http://localhost:${port}/api/cache/stats`);
  logger.log(`  POST   http://localhost:${port}/api/cache/heal`);
  logger.log(`  DELETE http://localhost:${port}/api/cache`);
  logger.log(`  GET    http://localhost:${port}/api/users`);
  logger.log(`  GET    http://localhost:${port}/api/users/:id`);
  logger.log(`  GET    http://localhost:${port}/api/experiments`);
  logger.log(`  GET    http://localhost:${port}/api/experiments/compare/:baseline/:comparison`);
  logger.log(`  GET    http://localhost:${port}/api/ml/training-data`);
  logger.log('');
  logger.log('Press Ctrl+C to stop');
  logger.log('='.repeat(60));
}

bootstrap();
