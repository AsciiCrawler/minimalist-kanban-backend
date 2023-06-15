import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import compression from 'compression';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

    {
        const config = new DocumentBuilder()
            .setTitle('Cats example')
            .setDescription('The cats API description')
            .setVersion('1.0')
            .addTag('cats')
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup("api", app, document);
    }

    await app.listen(
        process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 8080,
    );
}
bootstrap();
