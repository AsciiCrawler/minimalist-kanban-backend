import {
    IsNotEmpty,
    IsString,
    IsStrongPassword,
    IsUUID,
} from 'class-validator';
import { ObjectId } from 'mongodb';
import * as bcrypt from 'bcrypt';

export class UserModelDto {
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

/*Request*/
export class UserCreateDto {
    @IsNotEmpty()
    @IsString()
    username: string;

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
    }) /* Sandbox */
    password: string;

    /*  */

    /* @IsNotEmpty()
  @IsString()
  code: string; */

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
