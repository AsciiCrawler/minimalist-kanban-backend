import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import Captcha from '@haileybot/captcha-generator';
import { IsBoolean, IsDate, IsString, IsUUID } from 'class-validator';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

export class CaptchaModelDto {
    @IsUUID()
    uuid: string;

    @IsString()
    code: string;

    @IsString()
    url: string;

    @IsDate()
    creationDate: Date;

    @IsBoolean()
    solved: boolean;

    @IsBoolean()
    used: boolean;

    constructor(data?: CaptchaModelDto) {
        if (data == null) return;
        this.uuid = data.uuid;
        this.creationDate = data.creationDate;
        this.solved = data.solved;
        this.used = data.used;
    }

    initValues() {
        this.uuid = randomUUID();
        this.creationDate = new Date(Date.now());
        this.solved = false;
        this.used = false;
    }

    async generateData(client: S3Client) {
        const captcha = new Captcha(250);
        const fileName = randomUUID() + '.webp';
        const buff = Buffer.from(captcha.dataURL.split(',')[1], 'base64url');
        const img = await sharp(buff).resize({ width: 1024, withoutEnlargement: true }).toFormat('webp', { quality: 50 }).toBuffer();
        this.code = captcha.value;
        this.url = fileName;
        const command = new PutObjectCommand({ Bucket: process.env.AWS_FINAL_BUCKET as string, Key: fileName, Body: img });
        await client.send(command);
    }
}

export class captchaUUIDDto {
    @IsUUID()
    uuid: string;
}

export class CaptchaCodeDto {
    @IsString()
    code: string;
}
