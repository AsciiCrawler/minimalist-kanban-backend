import { CacheModule } from '@nestjs/cache-manager';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { MongodbModule } from './mongodb/mongodb.module';
import { CardController } from './card/card.controller';
import { BoardController } from './board/board.controller';
import { BoardService } from './board/board.service';
import { AuthModule } from './auth/auth.module';
import { CardService } from './card/card.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CaptchaService } from './captcha/captcha.service';
import { FileService } from './file/file.service';
import { FileController } from './file/file.controller';
import { CaptchaController } from './captcha/captcha.controller';
import { WebsocketGateway } from './websocket/websocket.gateway';
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongodbModule,
        CacheModule.register(),
        ThrottlerModule.forRoot({
            ttl: 60,
            limit: 10000,
        }),
        AuthModule
    ],
    controllers: [
        UserController,
        CardController,
        BoardController,
        FileController,
        CaptchaController
    ],
    providers: [
        UserService,
        BoardService,
        CardService,
        CaptchaService,
        FileService,
        WebsocketGateway,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        }
    ],
})
export class AppModule {}
