import {
    IsNotEmpty,
    IsString,
    IsStrongPassword,
    IsUUID,
} from 'class-validator';
import { ObjectId } from 'mongodb';
import * as bcrypt from 'bcrypt';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
export class UserModelDto {
    @ApiProperty({ type: ObjectId })
    _id: ObjectId;
    password: string | undefined;
    username: string;
    lowercaseUsername: string;
    creationDate: Date;
    constructor({ user, password }: { password: string; user: string }) {
        this.creationDate = new Date(Date.now());
        this.username = user;
        this.lowercaseUsername = user.toLowerCase();
        this.password = bcrypt.hashSync(password, 8);
    }
}

export class JWTDto {
    token: string;
}

export class UserCreateDto {
    @IsNotEmpty()
    @IsString()
    username: string;


    @ApiProperty({ description: "Honeypot field - Should be empty" })
    @IsString()
    phone: string; /* HoneyPot */

    @IsNotEmpty()
    @IsString()
    @IsStrongPassword({
        minLength: 5,
        minLowercase: 0,
        minSymbols: 0,
        minNumbers: 0,
        minUppercase: 0,
    })
    password: string;

    @IsNotEmpty()
    @IsUUID()
    uuid: string;
}
export class UserLoginDto {
    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}
