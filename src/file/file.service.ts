import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createWriteStream } from 'fs';
import { Db, MongoClient, ObjectId } from 'mongodb';
import sharp from 'sharp';
import { FileModelDto, GetSignedUrlDto, UUIDDto } from './file.dto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as AWSgetSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable, Stream } from 'stream';

@Injectable()
export class FileService {
    client = new S3Client({
        region: process.env.AWS_DEFAULT_REGION as string,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
        }
    });

    constructor(
        @Inject('DATABASE_CONNECTION')
        private conn: { db: Db; client: MongoClient }
    ) { }

    async getSignedUrl(body: GetSignedUrlDto, userId: ObjectId): Promise<{ signedUrl: string, fileUUID: string }> {
        function getExtensionFromMimeType(mimeType: string): string {
            switch (mimeType) {
                case 'image/jpeg': return '.jpg';
                case 'image/jpg': return '.jpg';
                case 'image/webp': return '.webp';
                case 'image/png': return '.png';
                case 'image/gif': return '.gif';
            }

            throw new HttpException(HttpStatus.BAD_REQUEST.toString, HttpStatus.BAD_REQUEST);
        }

        if (body.contentLength > (1024 * 1024 * 5))
            throw new HttpException(HttpStatus.PAYLOAD_TOO_LARGE.toString(), HttpStatus.PAYLOAD_TOO_LARGE);

        const rawUrl = randomUUID() + getExtensionFromMimeType(body.mimeType);
        const up = new PutObjectCommand({ Bucket: process.env.AWS_TEMP_BUCKET as string, Key: rawUrl, ContentType: body.mimeType, ContentLength: body.contentLength });
        const signedUrl = await AWSgetSignedUrl(this.client, up, { expiresIn: 3600 });

        let data = new FileModelDto({ userId: userId });
        data.rawUrl = rawUrl;
        await this.conn.db.collection<FileModelDto>("file").insertOne(data).then(() => { }).catch(error => { throw error; });
        return { fileUUID: rawUrl, signedUrl: signedUrl };
    }

    async processFile(body: UUIDDto, userId: ObjectId): Promise<{ url: string }> {
        const readableToBuffer = (stream: Stream) => {
            return new Promise<Buffer>((resolve, reject) => {
                const chunks: Buffer[] = []
                stream.on('data', chunk => chunks.push(chunk))
                stream.once('end', () => resolve(Buffer.concat(chunks)))
                stream.once('error', reject)
            })
        }

        let fileData = await this.conn.db.collection<FileModelDto>("file").findOne({ rawUrl: body.uuid }).catch(error => { throw error; });
        if (fileData == null)
            throw new HttpException(HttpStatus.NOT_FOUND.toString(), HttpStatus.NOT_FOUND);

        if (fileData.userId.toHexString() !== userId.toHexString())
            throw new HttpException(HttpStatus.UNAUTHORIZED.toString(), HttpStatus.UNAUTHORIZED);

        if (fileData.processed == true)
            throw new HttpException(HttpStatus.BAD_GATEWAY.toString(), HttpStatus.BAD_REQUEST);

        try {
            const getObjectCommand = new GetObjectCommand({ Bucket: process.env.AWS_TEMP_BUCKET as string, Key: body.uuid });
            const data = await this.client.send(getObjectCommand);
            const buffer = await readableToBuffer(data.Body as Readable);
            const img = await sharp(buffer).resize({ width: 1024, withoutEnlargement: true }).toFormat('webp', { quality: 80 }).toBuffer();
            const putObjectCommand = new PutObjectCommand({ Bucket: process.env.AWS_FINAL_BUCKET as string, Key: body.uuid.split(".")[0] + ".webp", Body: img });
            await this.client.send(putObjectCommand);

            fileData.processed = true;
            fileData.finalUrL = body.uuid.split(".")[0] + ".webp";
            await this.conn.db.collection<FileModelDto>("file").updateOne({ _id: fileData._id }, { $set: fileData }).catch(error => { throw error; })
            return { url: body.uuid.split(".")[0] + ".webp" };
        } catch (error) {
            throw error;
        }
    }
}
