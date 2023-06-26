import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import compression from 'compression';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
        origin: ["http://localhost:3000", process.env.ORIGIN as string],
        credentials: true,
    });

    {
        const config = new DocumentBuilder().setTitle('Api Endpoints').setVersion('1.0').build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup("api", app, document);
    }

    await app.listen(
        process.env.APP_PORT ? parseInt(process.env.APP_PORT) : 8080,
    );
}
bootstrap();
