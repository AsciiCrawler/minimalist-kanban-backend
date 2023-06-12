import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import compression from 'compression';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';
const fs = require('fs');

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.use(compression());
    app.use(cookieParser());
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
        }),
    );
    app.enableCors({
        origin: 'http://localhost:3000',
        credentials: true,
    });

    if (!fs.existsSync(join(__dirname, '..', './cdn')))
        fs.mkdirSync(join(__dirname, '..', './cdn'));

    await app.listen(
        process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 8080,
    );
}
bootstrap();
