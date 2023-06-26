import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { ObjectId } from 'mongodb';
import { BOARD_ROLE_CREATOR } from 'src/const';
import { SafeMongoIdTransform } from 'src/custom-validators/safeMongoIdTransform';
import { UserModelDto } from 'src/user/user.dto';

export class BoardModelDto {
    @ApiProperty({ type: ObjectId })
    readonly _id: ObjectId;
    creator: UserModelDto;
    title: string;
    lowercaseTitle: string;
    users: Array<UserModelDto & Partial<{ role: string }>>;
    readonly creationDate: Date;
    constructor({ creator, title }: { creator: UserModelDto & Partial<{ role: string }>; title: string; }) {
        this.creationDate = new Date(Date.now());
        this.creator = creator;
        this.title = title;
        this.lowercaseTitle = title.toLowerCase();

        creator.role = BOARD_ROLE_CREATOR;
        this.users = [creator];
    }
}

export class BoardIdDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    boardId: ObjectId;
}


export class BoardPendingRoleDto {
    @ApiProperty({ type: ObjectId })
    _id: ObjectId;
    creator: UserModelDto;
    title: string;
    user: UserModelDto & Partial<{ role: string }>
}

export class BoardCreateRequestDto {
    @IsNotEmpty()
    @IsString()
    title: string;
}

export class RemoveUserDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    boardId: ObjectId;

    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    userId: ObjectId;
}

export class BoardAddUserRequestDto {
    @ApiProperty({ type: ObjectId })
    /* @Type(() => ObjectId)
  @Transform(({ value }) => SafeMongoIdTransform(value)) */
    @IsNotEmpty()
    @IsString()
    userName: string;

    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    boardId: ObjectId;
}

export class BoardDeleteRequestDto {
    @ApiProperty({ type: ObjectId })
    @Type(() => ObjectId)
    @Transform(({ value }) => SafeMongoIdTransform(value))
    boardId: ObjectId;
}
