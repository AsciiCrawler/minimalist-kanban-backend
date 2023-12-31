import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsString,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { ObjectId } from 'mongodb';
import { IsValidCardState } from 'src/custom-validators/IsValidCardState';
import { SafeMongoIdTransform } from 'src/custom-validators/safeMongoIdTransform';
import { UserModelDto } from 'src/user/user.dto';

export enum CardStateEnum {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    TESTING = 'TESTING',
    DONE = 'DONE',
}

export class CardModelCommentDto {
    @ApiProperty({ type: ObjectId })
    readonly _id: ObjectId;

    @IsString()
    comment: string;
    @IsArray()
    readonly creator: UserModelDto;

    readonly creationDate: Date;
    constructor({ creator, comment }: { creator: UserModelDto; comment: string }) {
        this._id = new ObjectId();
        this.creationDate = new Date(Date.now());
        this.comment = comment;
        this.creator = creator;
    }
}



export class CardModelAttachment {
    @IsString()
    url: string;

    /* @Type(() => ObjectId)
  @Transform(({ value }) => SafeMongoIdTransform(value)) */
    user: UserModelDto;

    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    _id: ObjectId;

    creationDate: Date;
    constructor() {
        this._id = new ObjectId();
        this.creationDate = new Date(Date.now());
    }
}

export class CardModelDto {
    @ApiProperty({ type: ObjectId })
    _id: ObjectId;
    creator: UserModelDto;
    description: string;
    @ApiProperty({ type: ObjectId })
    boardId: ObjectId;
    title: string;
    index: number;
    state: CardStateEnum | string;
    assignedTo: Array<UserModelDto>;
    comments: Array<CardModelCommentDto>;
    attachments: Array<CardModelAttachment>;
    creationDate: Date;
    constructor({ user, boardId, title, description, state }: {
        user: UserModelDto;
        boardId: ObjectId;
        title: string;
        description: string;
        state: CardStateEnum;
    }) {
        this.creationDate = new Date(Date.now());
        this.creator = user;
        this.assignedTo = [user];
        this.boardId = boardId;
        this.title = title;
        this.description = description;
        this.state = state;
        this.index = 0;
    }
}

export class CardCreateRequestDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    boardId: ObjectId;

    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsValidCardState()
    state: CardStateEnum;
}

export class CardGetByBoardIdParamDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    boardId: ObjectId;
}

export class CardGetByIdParamDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    cardId: ObjectId;
}

export class CardUpdateCardParamDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    cardId: ObjectId;
}

export class CardDeleteCommentDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    cardId: ObjectId;

    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    commentId: ObjectId;
}

export class UpdateDescriptionDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    cardId: ObjectId;

    @IsString()
    description: string;
}

export class UpdateTitleDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    cardId: ObjectId;

    @IsString()
    title: string;
}

class BatchUpdateIndexAndState_CardsDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    cardId: ObjectId;

    @IsNumber()
    index: number;

    @IsValidCardState()
    state: CardStateEnum;

    @IsString()
    previousSource: string;

    @IsString()
    destinationSource: string;
}
export class BatchUpdateIndexAndStateDto {
    @IsArray()
    @ValidateNested()
    @Type(() => BatchUpdateIndexAndState_CardsDto)
    cards: Array<BatchUpdateIndexAndState_CardsDto>;
}

export class AttachFileDto {
    @IsString()
    @MinLength(35)
    url: string;

    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    cardId: ObjectId;
}

export class DeleteFileDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    cardId: ObjectId;

    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    attachmentId: ObjectId;
}


export class PostCommentDto {
    @IsNotEmpty()
    @IsString()
    comment: string;
}

export class AssignUserDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    cardId: ObjectId;

    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    userId: ObjectId;
}