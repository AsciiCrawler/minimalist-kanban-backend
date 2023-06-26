import { ApiProperty } from "@nestjs/swagger";
import { IsMimeType, IsNotEmpty, IsNumber, IsString } from "class-validator";
import { ObjectId } from "mongodb";

export class FileModelDto {
    @ApiProperty({ type: ObjectId })
    readonly _id: ObjectId;
    readonly creationDate: Date;
    userId: ObjectId;

    processed: boolean;
    rawUrl: string;
    finalUrL: string;

    constructor({ userId }: { userId: ObjectId; }) {
        this._id = new ObjectId();
        this.creationDate = new Date(Date.now());
        this.userId = userId;
        this.processed = false;
        this.rawUrl = "";
        this.finalUrL = "";
    }
}

export class GetSignedUrlDto {
    @IsMimeType()
    mimeType: string;

    @IsNumber()
    contentLength: number;
}

export class UUIDDto {
    @IsNotEmpty()
    @IsString()
    uuid: string;
}