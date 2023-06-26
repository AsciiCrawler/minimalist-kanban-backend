import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Db, MongoClient } from 'mongodb';
import { CaptchaModelDto } from './captcha.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import moment from 'moment';
import { S3Client } from '@aws-sdk/client-s3';
import { CloudwatchService } from 'src/cloudwatch/cloudwatch.service';

@Injectable()
export class CaptchaService {
    client = new S3Client({
        region: process.env.AWS_DEFAULT_REGION as string,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
        }
    });

    constructor(
        @Inject('DATABASE_CONNECTION')
        private conn: { db: Db; client: MongoClient },
        private cloudwatchService: CloudwatchService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async generateCaptcha(): Promise<{ url: string; uuid: string }> {
        const captchaModel = new CaptchaModelDto();
        captchaModel.initValues();
        await captchaModel.generateData(this.client);
        await this.cacheManager.set(captchaModel.uuid, JSON.stringify(captchaModel), 0);
        return { url: captchaModel.url, uuid: captchaModel.uuid };
    }

    async renewCaptcha(uuid: string): Promise<{ url: string }> {
        const cacheString = await this.cacheManager.get<string>(uuid);
        if (cacheString == null)
            throw new HttpException('Captcha not found', HttpStatus.NOT_FOUND);
        const captchaModel: CaptchaModelDto = new CaptchaModelDto(JSON.parse(cacheString));
        await captchaModel.generateData(this.client);
        await this.cacheManager.set(captchaModel.uuid, JSON.stringify(captchaModel), 0);
        return { url: captchaModel.url };
    }

    async validate(uuid: string, code: string): Promise<{ code: number }> {
        const cacheString = await this.cacheManager.get<string>(uuid);
        if (cacheString == null)
            throw new HttpException('Captcha not found', HttpStatus.NOT_FOUND);

        const captchaModel: CaptchaModelDto = JSON.parse(cacheString);

        {
            /* Time - Honeypot */
            const date1 = moment(captchaModel.creationDate);
            const date2 = moment(new Date());
            if (date2.diff(date1, 'milliseconds') <= 4000) {
                this.cloudwatchService.cloudwatchHoneypot({ user: uuid, message: "TimeHoneypot" });
                throw new HttpException(
                    HttpStatus.TOO_MANY_REQUESTS.toString(),
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }
        }

        if (captchaModel.solved == true)
            throw new HttpException(HttpStatus.TOO_MANY_REQUESTS.toString(), HttpStatus.TOO_MANY_REQUESTS);

        if (captchaModel.code !== code)
            throw new HttpException('Captcha not valid', HttpStatus.UNPROCESSABLE_ENTITY);

        captchaModel.solved = true;
        await this.cacheManager.set(captchaModel.uuid, JSON.stringify(captchaModel), 0);
        return { code: 200 };
    }

    async isCaptchaSolved(uuid: string): Promise<void> {
        const cacheString = await this.cacheManager.get<string>(uuid);
        if (cacheString == null)
            throw new HttpException('Captcha not found', HttpStatus.NOT_FOUND);

        const captchaModel: CaptchaModelDto = JSON.parse(cacheString);

        if (captchaModel.solved == true && captchaModel.used == true)
            throw new HttpException(HttpStatus.TOO_MANY_REQUESTS.toString(), HttpStatus.TOO_MANY_REQUESTS);

        if (captchaModel.solved == true) {
            captchaModel.used = true;
            await this.cacheManager.set(captchaModel.uuid, JSON.stringify(captchaModel), 0);
            return;
        }

        throw new HttpException(HttpStatus.UNAUTHORIZED.toString(), HttpStatus.UNAUTHORIZED);
    }
}
